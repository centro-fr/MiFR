import { apiClient } from "@/api/client";
import { estadisticasInscripcionesApiSchema } from "@/features/reportes/schemas/estadisticas-inscripciones";
import { informeAsistenciaApiSchema, type InformeAsistenciaApi } from "@/features/reportes/schemas/informe-asistencia";
import {
  estadisticasPlanesApiSchema,
  informeCobranzaApiSchema,
  informeCuotasVencidasApiSchema,
  informeOcupacionApiSchema,
} from "@/features/reportes/schemas/informes-centro";
import type {
  EstadisticasInscripciones,
  EstadisticasPlanes,
  FiltrosCobranza,
  FiltrosCuotasVencidas,
  FiltrosInformeAsistencia,
  FiltrosInscripciones,
  FiltrosOcupacion,
  FiltrosPlanesReporte,
  InformeAsistencia,
  InformeCobranza,
  InformeCuotasVencidas,
  InformeOcupacion,
} from "@/types/reportes";

// Reportes de la propietaria (US-33 y US-35). El back los reserva a la PROPIETARIA con REPORTES_COBRANZA_VER.

/** US-35: altas definitivas de cada mes del año. Los meses que todavía no llegaron vienen en 0. */
export async function obtenerEstadisticasInscripciones(filtros: FiltrosInscripciones): Promise<EstadisticasInscripciones> {
  const params: Record<string, number> = { anio: filtros.anio };
  if (filtros.idPlan !== null) params.id_plan = filtros.idPlan;
  if (filtros.idProfesora !== null) params.id_profesora = filtros.idProfesora;
  const { data } = await apiClient.get("/reportes/inscripciones", { params });
  const api = estadisticasInscripcionesApiSchema.parse(data);
  const { mes_pico: pico } = api.resumen;
  return {
    anio: api.periodo.anio ?? filtros.anio,
    totalAltas: api.resumen.total_altas,
    mesPico: pico && { mes: pico.mes, anio: pico.anio, nombre: pico.nombre_mes, cantidad: pico.cantidad },
    meses: api.meses.map((mes) => ({
      mes: mes.mes,
      anio: mes.anio,
      nombre: mes.nombre_mes,
      cantidad: mes.cantidad,
      diferencia: mes.diferencia_mes_anterior,
      variacion: mes.porcentaje_variacion,
    })),
  };
}

// ---------- Informe de asistencia (US-33) ----------

/** Alumnos por página en pantalla. */
export const ALUMNOS_POR_PAGINA = 50;
// El máximo que acepta el back por consulta (LIMITE_MAXIMO de esquemas-paginacion.ts).
const ALUMNOS_POR_CONSULTA = 100;

function parametros(filtros: FiltrosInformeAsistencia, limit: number, offset: number) {
  const params: Record<string, string | number> = { desde: filtros.desde, hasta: filtros.hasta, limit, offset };
  if (filtros.idAlumno !== null) params.id_alumno = filtros.idAlumno;
  if (filtros.idProfesora !== null) params.id_profesora = filtros.idProfesora;
  if (filtros.idActividad !== null) params.id_actividad = filtros.idActividad;
  if (filtros.incluirBajas) params.incluir_bajas = "true";
  return params;
}

function aInforme(api: InformeAsistenciaApi): InformeAsistencia {
  return {
    desde: api.periodo.desde,
    hasta: api.periodo.hasta,
    resumen: {
      clasesDictadas: api.resumen.clases_dictadas,
      asistencias: api.resumen.asistencias,
      inasistencias: api.resumen.inasistencias,
      porcentaje: api.resumen.porcentaje_asistencia,
    },
    porProfesora: api.por_profesora.map((fila) => ({
      id: fila.id_profesora,
      nombre: fila.nombre,
      apellido: fila.apellido,
      clasesDictadas: fila.clases_dictadas,
      cantidadAlumnos: fila.cantidad_alumnos,
      asistencias: fila.asistencias,
      porcentajePromedio: fila.porcentaje_promedio,
    })),
    alumnos: api.datos.map((fila) => ({
      id: fila.id_alumno,
      nombre: fila.nombre,
      apellido: fila.apellido,
      dadoDeBaja: fila.estado === "BAJA",
      clasesPrevistas: fila.clases_previstas,
      asistencias: fila.asistencias,
      inasistencias: fila.inasistencias,
      porcentaje: fila.porcentaje_asistencia,
    })),
    totalAlumnos: api.total,
    offset: api.offset,
  };
}

async function pedirInforme(filtros: FiltrosInformeAsistencia, limit: number, offset: number): Promise<InformeAsistencia> {
  const { data } = await apiClient.get("/reportes/asistencia", { params: parametros(filtros, limit, offset) });
  return aInforme(informeAsistenciaApiSchema.parse(data));
}

/** Resumen, profesoras y una página de alumnos. */
export function obtenerInformeAsistencia(filtros: FiltrosInformeAsistencia, offset: number): Promise<InformeAsistencia> {
  return pedirInforme(filtros, ALUMNOS_POR_PAGINA, offset);
}

/** El informe con todos los alumnos, para exportarlo: se piden las páginas de a 100. */
export async function obtenerInformeCompleto(filtros: FiltrosInformeAsistencia): Promise<InformeAsistencia> {
  const primera = await pedirInforme(filtros, ALUMNOS_POR_CONSULTA, 0);
  const offsets: number[] = [];
  for (let offset = ALUMNOS_POR_CONSULTA; offset < primera.totalAlumnos; offset += ALUMNOS_POR_CONSULTA) offsets.push(offset);
  const resto = await Promise.all(offsets.map((offset) => pedirInforme(filtros, ALUMNOS_POR_CONSULTA, offset)));
  return { ...primera, alumnos: [...primera.alumnos, ...resto.flatMap((pagina) => pagina.alumnos)] };
}

// ---------- Planes, ocupación, cobranza y cuotas vencidas ----------

/** Filas por página en los informes con detalle (cobranza y cuotas vencidas). */
export const FILAS_POR_PAGINA = 50;
const FILAS_POR_CONSULTA = 100;

const nombreDe = ({ nombre, apellido }: { nombre: string; apellido: string }) => `${nombre} ${apellido}`.trim();

function sinVacios(params: Record<string, string | number | null>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== null)) as Record<string, string | number>;
}

/** "18:00" a partir de "18:00:00", "1970-01-01T18:00:00.000Z" o "18:00". */
function horaCorta(valor: string): string {
  const coincidencia = /(\d{2}):(\d{2})/.exec(valor.includes("T") ? valor.split("T")[1] : valor);
  return coincidencia ? `${coincidencia[1]}:${coincidencia[2]}` : valor;
}

export async function obtenerEstadisticasPlanes(filtros: FiltrosPlanesReporte): Promise<EstadisticasPlanes> {
  const { data } = await apiClient.get("/reportes/planes", {
    params: sinVacios({ id_actividad: filtros.idActividad, id_profesora: filtros.idProfesora }),
  });
  const api = estadisticasPlanesApiSchema.parse(data);
  return {
    alumnosActivos: api.resumen.total_alumnos_activos,
    ingresoEstimado: api.resumen.ingreso_estimado_total,
    totalPlanes: api.resumen.total_planes,
    planes: api.planes.map((plan) => ({
      id: plan.id_plan,
      nombre: plan.nombre,
      tipo: plan.tipo,
      actividad: plan.actividad_exclusiva?.nombre ?? null,
      alumnos: plan.cantidad_alumnos,
      porcentaje: plan.porcentaje,
      precioVigente: plan.precio_vigente,
      ingresoEstimado: plan.ingreso_estimado,
    })),
  };
}

export async function obtenerInformeOcupacion(filtros: FiltrosOcupacion): Promise<InformeOcupacion> {
  const { data } = await apiClient.get("/reportes/ocupacion", {
    params: sinVacios({ id_actividad: filtros.idActividad, id_profesora: filtros.idProfesora, modalidad: filtros.modalidad }),
  });
  const api = informeOcupacionApiSchema.parse(data);
  const porNivel = { LIBRE: 0, MODERADO: 0, CASI_LLENO: 0, COMPLETO: 0, SIN_CUPO: 0, ...api.resumen.por_nivel };
  return {
    totalHorarios: api.resumen.total_horarios,
    ocupacionTotal: api.resumen.ocupacion_total,
    porNivel,
    horarios: api.datos.map((fila) => ({
      id: fila.id_horario,
      diaSemana: fila.dia_semana,
      horaInicio: horaCorta(fila.hora_inicio),
      horaFin: horaCorta(fila.hora_fin),
      actividad: fila.actividad.nombre,
      modalidad: fila.actividad.modalidad,
      profesora: nombreDe(fila.profesora),
      cupo: fila.cupo_maximo,
      inscriptos: fila.inscriptos,
      porcentaje: fila.porcentaje_ocupacion,
      nivel: fila.nivel,
    })),
  };
}

async function pedirCobranza(filtros: FiltrosCobranza, limit: number, offset: number): Promise<InformeCobranza> {
  const { data } = await apiClient.get("/reportes/cobranza", {
    params: sinVacios({ desde: filtros.desde, hasta: filtros.hasta, forma_pago: filtros.formaPago, id_profesora: filtros.idProfesora, limit, offset }),
  });
  const api = informeCobranzaApiSchema.parse(data);
  return {
    desde: api.periodo.desde,
    hasta: api.periodo.hasta,
    totalCobrado: api.resumen.total_cobrado,
    totalEfectivo: api.resumen.total_efectivo,
    totalTransferencia: api.resumen.total_transferencia,
    cantidadPagos: api.resumen.cantidad_pagos,
    pagos: api.datos.map((fila) => ({
      id: fila.id_pago,
      fecha: fila.fecha_pago,
      monto: fila.monto,
      formaPago: fila.forma_pago,
      alumno: nombreDe(fila.alumno),
      plan: fila.plan.nombre,
      cobro: fila.profesora_cobra ? nombreDe(fila.profesora_cobra) : null,
    })),
    total: api.total,
    offset: api.offset,
  };
}

export function obtenerInformeCobranza(filtros: FiltrosCobranza, offset: number): Promise<InformeCobranza> {
  return pedirCobranza(filtros, FILAS_POR_PAGINA, offset);
}

/** Todas las páginas, para exportar. */
export async function obtenerCobranzaCompleta(filtros: FiltrosCobranza): Promise<InformeCobranza> {
  const primera = await pedirCobranza(filtros, FILAS_POR_CONSULTA, 0);
  const offsets: number[] = [];
  for (let offset = FILAS_POR_CONSULTA; offset < primera.total; offset += FILAS_POR_CONSULTA) offsets.push(offset);
  const resto = await Promise.all(offsets.map((offset) => pedirCobranza(filtros, FILAS_POR_CONSULTA, offset)));
  return { ...primera, pagos: [...primera.pagos, ...resto.flatMap((pagina) => pagina.pagos)] };
}

async function pedirCuotasVencidas(filtros: FiltrosCuotasVencidas, limit: number, offset: number): Promise<InformeCuotasVencidas> {
  const { data } = await apiClient.get("/reportes/cuotas-vencidas", {
    params: sinVacios({ id_profesora: filtros.idProfesora, id_plan: filtros.idPlan, limit, offset }),
  });
  const api = informeCuotasVencidasApiSchema.parse(data);
  return {
    alumnosConDeuda: api.resumen.total_alumnos_vencidos,
    totalAdeudado: api.resumen.monto_total_adeudado,
    promedioPorAlumno: api.resumen.promedio_deuda_alumno,
    porProfesora: api.por_profesora.map((fila) => ({
      id: fila.id_profesora,
      nombre: nombreDe(fila),
      alumnos: fila.cantidad_alumnos,
      monto: fila.monto_total,
    })),
    cuotas: api.datos.map((fila) => ({
      idInscripcion: fila.id_inscripcion,
      alumno: nombreDe(fila.alumno),
      telefono: fila.alumno.telefono,
      email: fila.alumno.email,
      plan: fila.plan.nombre,
      profesora: nombreDe(fila.profesora),
      vencio: fila.fecha_vencimiento,
      diasVencida: fila.dias_vencida,
      monto: fila.monto_adeudado,
    })),
    total: api.total,
    offset: api.offset,
  };
}

export function obtenerCuotasVencidas(filtros: FiltrosCuotasVencidas, offset: number): Promise<InformeCuotasVencidas> {
  return pedirCuotasVencidas(filtros, FILAS_POR_PAGINA, offset);
}

export async function obtenerCuotasVencidasCompleto(filtros: FiltrosCuotasVencidas): Promise<InformeCuotasVencidas> {
  const primera = await pedirCuotasVencidas(filtros, FILAS_POR_CONSULTA, 0);
  const offsets: number[] = [];
  for (let offset = FILAS_POR_CONSULTA; offset < primera.total; offset += FILAS_POR_CONSULTA) offsets.push(offset);
  const resto = await Promise.all(offsets.map((offset) => pedirCuotasVencidas(filtros, FILAS_POR_CONSULTA, offset)));
  return { ...primera, cuotas: [...primera.cuotas, ...resto.flatMap((pagina) => pagina.cuotas)] };
}
