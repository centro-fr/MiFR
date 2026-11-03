import { apiClient } from "@/api/client";
import { estadisticasInscripcionesApiSchema } from "@/features/reportes/schemas/estadisticas-inscripciones";
import { informeAsistenciaApiSchema, type InformeAsistenciaApi } from "@/features/reportes/schemas/informe-asistencia";
import type {
  EstadisticasInscripciones,
  FiltrosInformeAsistencia,
  FiltrosInscripciones,
  InformeAsistencia,
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
