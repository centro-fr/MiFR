import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  informeHonorariosApiSchema,
  liquidacionDetalleApiSchema,
  liquidacionResumenApiSchema,
  resultadoCalculoApiSchema,
  tarifaHonorarioApiSchema,
  type InformeHonorariosApi,
  type LiquidacionDetalleApi,
  type LiquidacionResumenApi,
  type RegistrarTarifaBody,
  type TarifaHonorarioApi,
} from "@/features/honorarios/schemas/honorarios";
import type {
  InformeHonorarios,
  LiquidacionDetalle,
  LiquidacionResumen,
  LineaAlumno,
  LineaSuplencia,
  ResultadoCalculo,
  TarifaHonorario,
} from "@/types/honorarios";

// Endpoints de US-23 según back/SPRINT-4.md. Solo la propietaria: HONORARIOS_VER_TODOS para ver,
// HONORARIOS_LIQUIDAR para calcular, cerrar, marcar abonada y cargar tarifas.

function profesoraDe(api: { id_profesora: number; nombre: string; apellido: string }) {
  return { id: api.id_profesora, nombre: api.nombre, apellido: api.apellido };
}

function aResumen(api: LiquidacionResumenApi): LiquidacionResumen {
  return {
    id: api.id_liquidacion,
    estado: api.estado,
    calculadaEl: api.fecha_liquidacion,
    montoTotal: api.monto_total,
    profesora: profesoraDe(api.profesora),
    cantidadAlumnos: api.cantidad_alumnos,
    subtotalAlumnos: api.subtotal_alumnos,
    subtotalSuplencias: api.subtotal_suplencias,
  };
}

// Primero quien más cobra: es lo que la propietaria revisa antes.
function porMonto(a: LiquidacionResumen, b: LiquidacionResumen): number {
  return b.montoTotal - a.montoTotal || a.profesora.apellido.localeCompare(b.profesora.apellido, "es");
}

function aInforme(api: InformeHonorariosApi): InformeHonorarios {
  return {
    periodo: api.periodo,
    desde: api.periodo_desde,
    hasta: api.periodo_hasta,
    totalGeneral: api.total_general,
    liquidaciones: api.liquidaciones.map(aResumen).sort(porMonto),
  };
}

function tarifaAplicada(api: { tipo_valor: TarifaHonorarioApi["tipo_valor"]; valor: number }) {
  return { tipoValor: api.tipo_valor, valor: api.valor };
}

function aDetalle(api: LiquidacionDetalleApi): LiquidacionDetalle {
  const alumnos: LineaAlumno[] = [];
  const suplencias: LineaSuplencia[] = [];
  for (const detalle of api.detalles) {
    if (detalle.concepto === "ALUMNO_A_CARGO") {
      const { inscripcion } = detalle;
      alumnos.push({
        id: detalle.id_liq_detalle,
        monto: detalle.monto,
        tarifa: tarifaAplicada(detalle.tarifa),
        alumno: { nombre: inscripcion.alumno.nombre, apellido: inscripcion.alumno.apellido },
        plan: inscripcion.plan.nombre,
        estadoInscripcion: inscripcion.estado,
        fechaBaja: inscripcion.fecha_baja,
      });
      continue;
    }
    const { clase } = detalle;
    suplencias.push({
      id: detalle.id_liq_detalle,
      concepto: detalle.concepto,
      monto: detalle.monto,
      tarifa: tarifaAplicada(detalle.tarifa),
      clase: {
        fecha: clase.fecha_clase,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        actividad: clase.actividad.nombre,
        ausente: profesoraDe(clase.profesora_ausente),
        suplente: profesoraDe(clase.profesora_suplente),
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
    idProfesora: api.id_profesora,
    concepto: api.concepto,
    plan: api.plan && { id: api.plan.id_plan, nombre: api.plan.nombre },
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

/** Detalle por alumno y por clase suplida de una profesora. */
export async function obtenerLiquidacion(id: number): Promise<LiquidacionDetalle> {
  const { data } = await apiClient.get(`/liquidaciones/${encodeURIComponent(id)}`);
  return aDetalle(liquidacionDetalleApiSchema.parse(data));
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
  return aResumen(liquidacionResumenApiSchema.parse(data));
}

/** CERRADA → PAGADA: solo registra que se le abonó por fuera. 409 si no estaba cerrada. */
export async function marcarLiquidacionAbonada(id: number): Promise<LiquidacionResumen> {
  const { data } = await apiClient.post(`/liquidaciones/${encodeURIComponent(id)}/pagar`);
  return aResumen(liquidacionResumenApiSchema.parse(data));
}

/** Todas las tarifas (vigentes, programadas y cerradas): son pocas y así alcanza con un pedido. */
export async function listarTarifas(): Promise<TarifaHonorario[]> {
  const { data } = await apiClient.get("/tarifas-honorario");
  return z.array(tarifaHonorarioApiSchema).parse(data).map(aTarifa);
}

/** Cierra la vigente del mismo concepto, profesora y plan. 409 si se superpone con otra. */
export async function registrarTarifa(cuerpo: RegistrarTarifaBody): Promise<TarifaHonorario> {
  const { data } = await apiClient.post("/tarifas-honorario", cuerpo);
  return aTarifa(tarifaHonorarioApiSchema.parse(data));
}
