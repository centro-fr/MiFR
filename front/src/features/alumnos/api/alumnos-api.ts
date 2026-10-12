import { apiClient } from "@/api/client";
import {
  fichaAlumnoApiSchema,
  paginaAlumnosApiSchema,
  type ActualizarAlumnoBody,
  type AlumnoApi,
  type AlumnoDetalle,
  type AlumnoResumen,
  type BajaAlumnoBody,
  type EstadoAlumno,
  type FichaAlumnoApi,
  type InscripcionDeAlumno,
  type InscripcionVigenteApi,
  type PaginaAlumnosApi,
  type RespuestaAlumnos,
} from "@/features/alumnos/schemas/alumno";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { CrearAlumnoPayload, MotivoBaja } from "@/types/alumno";

/** "Activos y pendientes" no manda estado: el back excluye a los de baja salvo con incluirBajas. */
export type FiltroEstadoAlumnos = "TODOS" | EstadoAlumno;

export interface FiltrosAlumnos {
  busqueda: string;
  estado: FiltroEstadoAlumnos;
  id_plan: string;
  id_profesora: string;
  id_actividad: string;
  incluir_bajas: boolean;
  limit: number;
  offset: number;
}

const ESTADO_EN_EL_BACK: Record<EstadoAlumno, AlumnoApi["estado"]> = {
  ACTIVO: "ACTIVO",
  PENDIENTE: "INACTIVO",
  BAJA: "BAJA",
};

const ESTADO_EN_PANTALLA: Record<AlumnoApi["estado"], EstadoAlumno> = {
  ACTIVO: "ACTIVO",
  INACTIVO: "PENDIENTE",
  BAJA: "BAJA",
};

// Un DNI se busca exacto por `dni`; cualquier otro texto, por nombre del alumno o de su tutor.
const ES_DNI = /^\d{7,8}$/;

function parametrosDeListado({ busqueda, estado, incluir_bajas, ...resto }: FiltrosAlumnos) {
  const texto = busqueda.trim().replace(/\./g, "");
  const parametros: Record<string, string | number> = { limit: resto.limit, offset: resto.offset };
  if (ES_DNI.test(texto)) parametros.dni = texto;
  else if (busqueda.trim()) parametros.busqueda = busqueda.trim();
  if (estado !== "TODOS") parametros.estado = ESTADO_EN_EL_BACK[estado];
  if (incluir_bajas) parametros.incluirBajas = "true";
  for (const clave of ["id_plan", "id_profesora", "id_actividad"] as const) {
    if (resto[clave]) parametros[clave] = resto[clave];
  }
  return parametros;
}

function aAlumnoResumen({ id_alumno, usuario, estado, inscripcion }: PaginaAlumnosApi["datos"][number]): AlumnoResumen {
  return {
    id_alumno,
    nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
    dni: usuario.dni,
    telefono: usuario.telefono,
    estado: ESTADO_EN_PANTALLA[estado],
    plan: inscripcion?.nombre_plan ?? null,
    profesora: inscripcion?.nombre_profesora ?? null,
  };
}

export async function listarAlumnos(filtros: FiltrosAlumnos): Promise<RespuestaAlumnos> {
  const { data } = await apiClient.get("/alumnos", { params: parametrosDeListado(filtros) });
  const pagina = paginaAlumnosApiSchema.parse(data);
  return { items: pagina.datos.map(aAlumnoResumen), total: pagina.total, limit: pagina.limit, offset: pagina.offset };
}

// Las columnas DATE viajan como medianoche UTC ("1996-04-24T00:00:00.000Z"): se queda solo la
// fecha para que el huso horario del navegador no la corra un día.
function aFechaCalendario(valor: string): string {
  return valor.slice(0, 10);
}

function nombreCompleto({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre} ${apellido}`;
}

function aInscripcion(inscripcion: InscripcionVigenteApi): InscripcionDeAlumno {
  return {
    id_inscripcion: inscripcion.id_inscripcion,
    estado: inscripcion.estado,
    plan: { ...inscripcion.plan, precio: inscripcion.plan_precio.precio },
    id_profesora: inscripcion.id_profesora,
    profesora: nombreCompleto(inscripcion.profesora.usuario),
    horarios: inscripcion.horarios.map(({ id_horario, horario }) => ({
      id_horario,
      id_actividad: horario.id_actividad,
      actividad: horario.actividad.nombre,
      dia_semana: horario.dia_semana,
      hora_inicio: horaDesdeApi(horario.hora_inicio),
      hora_fin: horaDesdeApi(horario.hora_fin),
      profesora: nombreCompleto(horario.profesora.usuario),
    })),
    fecha_inicio: aFechaCalendario(inscripcion.fecha_inicio),
    reserva: inscripcion.reserva && { vence: aFechaCalendario(inscripcion.reserva.vence), vencida: inscripcion.reserva.vencida },
  };
}

function aPersona({ nombre, apellido, dni, telefono, email }: AlumnoApi["usuario"]) {
  return { nombre, apellido, dni, telefono, email };
}

export function aAlumnoDetalle(api: FichaAlumnoApi): AlumnoDetalle {
  const { usuario, responsable } = api;
  return {
    id_alumno: api.id_alumno,
    id_usuario_responsable: api.id_usuario_responsable,
    usuario: {
      ...aPersona(usuario),
      id_usuario: usuario.id_usuario,
      fecha_nacimiento: aFechaCalendario(usuario.fecha_nacimiento),
      direccion: usuario.direccion,
    },
    tutor: responsable && aPersona(responsable),
    cont_emerg_nombre: api.cont_emerg_nombre,
    cont_emerg_telefono: api.cont_emerg_telefono,
    apto_medico: api.apto_medico,
    fecha_apto_medico: api.fecha_apto_medico === null ? null : aFechaCalendario(api.fecha_apto_medico),
    observaciones: api.observaciones,
    estado: api.estado,
    fecha_alta: api.fecha_alta,
    fecha_baja: api.fecha_baja,
    // El back las ordena de la más reciente a la más vieja (fecha_inicio desc).
    inscripcion: api.inscripciones[0] ? aInscripcion(api.inscripciones[0]) : null,
  };
}

export async function obtenerAlumno(id: number): Promise<AlumnoDetalle> {
  const { data } = await apiClient.get(`/alumnos/${id}`);
  return aAlumnoDetalle(fichaAlumnoApiSchema.parse(data));
}

// Alta del alumno (US-05). Queda INACTIVO hasta el primer pago de su pre-inscripción (US-07).
export async function crearAlumno(cuerpo: CrearAlumnoPayload): Promise<{ id_alumno: number }> {
  const { data } = await apiClient.post<{ id_alumno: number }>("/alumnos", cuerpo);
  return data;
}

// Solo viajan los campos que cambiaron. El plan y los horarios se cambian desde la inscripción.
export async function actualizarAlumno(id: number, cambios: ActualizarAlumnoBody): Promise<void> {
  await apiClient.patch(`/alumnos/${id}`, cambios);
}

// Baja lógica (US-08): el back da de baja las inscripciones vigentes con el motivo y cierra sus
// horarios (libera el cupo). Responde 409 si ya estaba de baja.
export async function darDeBajaAlumno(id: number, motivo: MotivoBaja, detalle?: string): Promise<void> {
  // Sin detalle no viaja: el back lo guarda como NULL.
  const cuerpo: BajaAlumnoBody = { motivo_baja: motivo, ...(detalle && { detalle_baja: detalle }) };
  await apiClient.post(`/alumnos/${id}/baja`, cuerpo);
}
