import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  informeHonorariosApiSchema,
  liquidacionApiSchema,
  liquidacionDetalleApiSchema,
  resultadoCalculoApiSchema,
  tarifaHonorarioApiSchema,
  type InformeHonorariosApi,
  type LiquidacionApi,
  type LiquidacionDetalleApi,
  type ProfesoraApi,
  type RegistrarTarifaBody,
  type TarifaHonorarioApi,
} from "@/features/honorarios/schemas/honorarios";
import { primerDiaDe, ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import type {
  DesgloseLiquidacion,
  InformeHonorarios,
  LiquidacionDetalle,
  LiquidacionResumen,
  LineaAlumno,
  LineaSuplencia,
  ProfesoraDeLiquidacion,
  ResultadoCalculo,
  TarifaAplicada,
  TarifaHonorario,
} from "@/types/honorarios";

// Endpoints de US-23 (back: gestion-honorarios). Solo la propietaria: HONORARIOS_VER_TODOS para ver,
// HONORARIOS_LIQUIDAR para calcular, cerrar, marcar abonada y cargar tarifas.

function profesoraDe(api: ProfesoraApi): ProfesoraDeLiquidacion {
  return { id: api.id_profesora, nombre: api.usuario.nombre, apellido: api.usuario.apellido };
}

function desgloseDe(api: LiquidacionApi): DesgloseLiquidacion | null {
  const { cantidad_alumnos, subtotal_alumnos, subtotal_suplencias } = api;
  if (cantidad_alumnos === undefined || subtotal_alumnos === undefined || subtotal_suplencias === undefined) return null;
  return { cantidadAlumnos: cantidad_alumnos, subtotalAlumnos: subtotal_alumnos, subtotalSuplencias: subtotal_suplencias };
}

function aResumen(api: LiquidacionApi): LiquidacionResumen {
  return {
    id: api.id_liquidacion,
    estado: api.estado,
    calculadaEl: api.fecha_liquidacion,
    montoTotal: api.monto_total,
    profesora: profesoraDe(api.profesora),
    desglose: desgloseDe(api),
  };
}

// Primero quien más cobra: es lo que la propietaria revisa antes.
function porMonto(a: LiquidacionResumen, b: LiquidacionResumen): number {
  return b.montoTotal - a.montoTotal || a.profesora.apellido.localeCompare(b.profesora.apellido, "es");
}

function aInforme(api: InformeHonorariosApi): InformeHonorarios {
  return {
    periodo: api.periodo,
    desde: primerDiaDe(api.periodo),
    hasta: ultimoDiaDe(api.periodo),
    totalGeneral: api.total_general,
    liquidaciones: api.liquidaciones.map(aResumen).sort(porMonto),
  };
}

function tarifaAplicada(idTarifa: number, tarifas: TarifaHonorario[]): TarifaAplicada | null {
  const tarifa = tarifas.find(({ id }) => id === idTarifa);
  return tarifa ? { tipoValor: tarifa.tipoValor, valor: tarifa.valor } : null;
}

function aDetalle(api: LiquidacionDetalleApi, tarifas: TarifaHonorario[]): LiquidacionDetalle {
  const alumnos: LineaAlumno[] = [];
  const suplencias: LineaSuplencia[] = [];
  for (const detalle of api.detalles) {
    const tarifa = tarifaAplicada(detalle.id_tarifa, tarifas);
    if (detalle.concepto === "ALUMNO_A_CARGO") {
      const { alumno, inscripcion } = detalle;
      alumnos.push({
        id: detalle.id_liq_detalle,
        monto: detalle.monto,
        tarifa,
        alumno: { nombre: alumno.nombre, apellido: alumno.apellido },
        inscripcion: inscripcion
          ? { plan: inscripcion.plan.nombre, estado: inscripcion.estado, fechaBaja: inscripcion.fecha_baja }
          : null,
      });
      continue;
    }
    const { clase } = detalle;
    suplencias.push({
      id: detalle.id_liq_detalle,
      concepto: detalle.concepto,
      monto: detalle.monto,
      tarifa,
      clase: {
        fecha: clase.fecha_clase,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        actividad: clase.actividad,
        ausente: clase.profesora_titular ? profesoraDe(clase.profesora_titular) : null,
        suplente: clase.profesora_suplente ? profesoraDe(clase.profesora_suplente) : null,
      },
    });
  }
  alumnos.sort((a, b) => a.alumno.apellido.localeCompare(b.alumno.apellido, "es") || a.alumno.nombre.localeCompare(b.alumno.nombre, "es"));
  suplencias.sort((a, b) => a.clase.fecha.localeCompare(b.clase.fecha) || a.clase.horaInicio.localeCompare(b.clase.horaInicio));
  return { id: api.id_liquidacion, estado: api.estado, montoTotal: api.monto_total, profesora: profesoraDe(api.profesora), alumnos, suplencias };
}

function aTarifa(api: TarifaHonorarioApi): TarifaHonorario {
  return {
    id: api.id_tarifa,
    concepto: api.concepto,
    tipoValor: api.tipo_valor,
    valor: api.valor,
    desde: api.fecha_vigencia_desde,
    hasta: api.fecha_vigencia_hasta,
  };
}

/** Informe del mes: total general y una fila por profesora. Sin calcular todavía, llega vacío. */
export async function obtenerInforme(periodo: string): Promise<InformeHonorarios> {
  const { data } = await apiClient.get("/liquidaciones", { params: { periodo } });
  return aInforme(informeHonorariosApiSchema.parse(data));
}

/**
 * Detalle por alumno y por clase suplida de una profesora. Las tarifas completan cada línea con la
 * tarifa aplicada, que el back identifica solo por id.
 */
export async function obtenerLiquidacion(id: number, tarifas: TarifaHonorario[]): Promise<LiquidacionDetalle> {
  const { data } = await apiClient.get(`/liquidaciones/${encodeURIComponent(id)}`);
  return aDetalle(liquidacionDetalleApiSchema.parse(data), tarifas);
}

/** Genera o recalcula los borradores del mes; las cerradas no se tocan. 400 si el mes no empezó. */
export async function calcularLiquidaciones(periodo: string): Promise<ResultadoCalculo> {
  const { data } = await apiClient.post("/liquidaciones", { periodo });
  const { advertencias, ...informe } = resultadoCalculoApiSchema.parse(data);
  return {
    informe: aInforme(informe),
    advertencias: advertencias.map((advertencia) => ({
      idProfesora: advertencia.id_profesora,
      concepto: advertencia.concepto,
      motivo: advertencia.motivo,
      idInscripcion: advertencia.id_inscripcion,
      idClase: advertencia.id_clase,
    })),
  };
}

/** BORRADOR → CERRADA: queda como foto y ya no se recalcula. 409 si no estaba en borrador. */
export async function cerrarLiquidacion(id: number): Promise<LiquidacionResumen> {
  const { data } = await apiClient.post(`/liquidaciones/${encodeURIComponent(id)}/cerrar`);
  return aResumen(liquidacionApiSchema.parse(data));
}

/** CERRADA → PAGADA: solo registra que se le abonó por fuera. 409 si no estaba cerrada. */
export async function marcarLiquidacionAbonada(id: number): Promise<LiquidacionResumen> {
  const { data } = await apiClient.post(`/liquidaciones/${encodeURIComponent(id)}/pagar`);
  return aResumen(liquidacionApiSchema.parse(data));
}

/** Todas las tarifas (vigentes, programadas y cerradas): son pocas y así alcanza con un pedido. */
export async function listarTarifas(): Promise<TarifaHonorario[]> {
  const { data } = await apiClient.get("/tarifas-honorario");
  return z.array(tarifaHonorarioApiSchema).parse(data).map(aTarifa);
}

/**
 * Crea la tarifa por alumno y la de hora de suplencia, que cierran las vigentes el día anterior.
 * 400 si empieza en el pasado; 409 si ya hay una tarifa que empieza ese día o después.
 */
export async function registrarTarifa(cuerpo: RegistrarTarifaBody): Promise<TarifaHonorario[]> {
  const { data } = await apiClient.post("/tarifas-honorario", cuerpo);
  return z.array(tarifaHonorarioApiSchema).parse(data).map(aTarifa);
}
