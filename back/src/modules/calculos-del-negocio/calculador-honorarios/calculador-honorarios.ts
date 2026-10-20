import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { ClaseSuplida } from "../../gestion-inscripciones-y-clases/clase/clase.types.js";
import type { InscripcionACargo } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type {
  AdvertenciaHonorario,
  ConceptoTarifa,
  DatosHonorarios,
  DetalleHonorario,
  ResultadoHonorarios,
  TarifaDeHonorario,
} from "./calculador-honorarios.types.js";
import type { ICalculoHonorarios } from "./interface/i-calculo-honorarios.js";

const MS_POR_HORA = 60 * 60 * 1000;

// Los montos van en pesos con dos decimales; se redondea al centavo y se suma en centavos para que
// 0,10 + 0,20 dé 0,30 y no 0,30000000000000004.
function redondearAlCentavo(monto: number): number {
  return Math.round(monto * 100) / 100;
}

function estaVigente(tarifa: TarifaDeHonorario, dia: Date): boolean {
  return (
    tarifa.fecha_vigencia_desde.getTime() <= dia.getTime() &&
    (tarifa.fecha_vigencia_hasta === null || tarifa.fecha_vigencia_hasta.getTime() >= dia.getTime())
  );
}

// La tarifa del plan gana a la de todos los planes. Las vigencias de una misma profesora y concepto no
// se superponen (lo garantiza Tarifa al registrar), así que a lo sumo hay una por cada alcance.
function buscarTarifa(
  tarifas: TarifaDeHonorario[],
  idProfesora: number,
  concepto: ConceptoTarifa,
  idPlan: number | null,
  dia: Date,
): TarifaDeHonorario | undefined {
  const vigentes = tarifas.filter(
    (tarifa) =>
      tarifa.id_profesora === idProfesora && tarifa.concepto === concepto && estaVigente(tarifa, dia),
  );
  return (
    vigentes.find((tarifa) => tarifa.id_plan === idPlan) ?? vigentes.find((tarifa) => tarifa.id_plan === null)
  );
}

function generaHonorarios(inscripcion: InscripcionACargo): boolean {
  return !inscripcion.sin_cargo && inscripcion.estado !== "PREINSCRIPTA";
}

// La inscripción se liquida al día en que terminó su período: el fin del mes, o el día de la baja si fue
// antes. fecha_baja es un instante; la tarifa se busca con el día de Argentina.
function diaDeLaLinea(inscripcion: InscripcionACargo, finDelPeriodo: Date): Date {
  if (inscripcion.fecha_baja === null) return finDelPeriodo;
  const diaDeBaja = fechaActualArgentina(inscripcion.fecha_baja);
  return diaDeBaja.getTime() < finDelPeriodo.getTime() ? diaDeBaja : finDelPeriodo;
}

function horasDeLaClase(clase: ClaseSuplida): number {
  return (clase.hora_fin.getTime() - clase.hora_inicio.getTime()) / MS_POR_HORA;
}

function totalizar(detalles: DetalleHonorario[]): Map<number, number> {
  const centavos = new Map<number, number>();
  for (const { id_profesora, monto } of detalles) {
    centavos.set(id_profesora, (centavos.get(id_profesora) ?? 0) + Math.round(monto * 100));
  }
  return new Map([...centavos].map(([idProfesora, total]) => [idProfesora, total / 100]));
}

// Cálculo puro: recibe todo lo que necesita y no lee la base. Cada concepto tiene su fórmula
// (ALUMNO_A_CARGO, CLASE_SUPLIDA y DESCUENTO_AUSENCIA) y comparten la búsqueda de la tarifa vigente.
export class CalculadorHonorarios implements ICalculoHonorarios {
  calcular(datos: DatosHonorarios): ResultadoHonorarios {
    const detalles: DetalleHonorario[] = [];
    const advertencias: AdvertenciaHonorario[] = [];

    for (const inscripcion of datos.inscripciones.filter(generaHonorarios)) {
      const dia = diaDeLaLinea(inscripcion, datos.finDelPeriodo);
      const { id_profesora, id_plan, id_inscripcion } = inscripcion;
      const tarifa = buscarTarifa(datos.tarifas, id_profesora, "ALUMNO_A_CARGO", id_plan, dia);
      if (!tarifa) {
        advertencias.push({
          id_profesora,
          concepto: "ALUMNO_A_CARGO",
          motivo: "SIN_TARIFA",
          id_inscripcion,
          id_clase: null,
          fecha: dia,
        });
        continue;
      }
      const monto =
        tarifa.tipo_valor === "MONTO_FIJO"
          ? tarifa.valor
          : redondearAlCentavo(((datos.cobradoEnElPeriodo.get(id_inscripcion) ?? 0) * tarifa.valor) / 100);
      detalles.push({
        id_profesora,
        concepto: "ALUMNO_A_CARGO",
        id_tarifa: tarifa.id_tarifa,
        id_inscripcion,
        id_clase: null,
        monto,
      });
    }

    for (const clase of datos.suplencias) {
      const { id_clase, id_prof_suplente, id_prof_ausente, fecha_clase } = clase;
      const tarifa = buscarTarifa(datos.tarifas, id_prof_suplente, "HORA_SUPLENCIA", null, fecha_clase);
      if (!tarifa || tarifa.tipo_valor === "PORCENTAJE") {
        advertencias.push({
          id_profesora: id_prof_suplente,
          concepto: "HORA_SUPLENCIA",
          motivo: tarifa ? "TARIFA_NO_APLICABLE" : "SIN_TARIFA",
          id_inscripcion: null,
          id_clase,
          fecha: fecha_clase,
        });
        continue;
      }
      const monto = redondearAlCentavo(tarifa.valor * horasDeLaClase(clase));
      detalles.push(
        {
          id_profesora: id_prof_suplente,
          concepto: "CLASE_SUPLIDA",
          id_tarifa: tarifa.id_tarifa,
          id_inscripcion: null,
          id_clase,
          monto,
        },
        {
          id_profesora: id_prof_ausente,
          concepto: "DESCUENTO_AUSENCIA",
          id_tarifa: tarifa.id_tarifa,
          id_inscripcion: null,
          id_clase,
          monto: -monto,
        },
      );
    }

    return { detalles, advertencias, totalesPorProfesora: totalizar(detalles) };
  }
}
