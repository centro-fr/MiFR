import { apiClient } from "@/api/client";
import { fichaAlumnoApiSchema, type BajaAlumnoBody, type FichaAlumnoApi } from "@/features/alumnos/schemas/alumno";
import type { FichaAlumno, MotivoBaja } from "@/types/alumno";

// Las columnas DATE viajan como medianoche UTC ("1996-04-24T00:00:00.000Z"): se queda
// solo la fecha para que el huso horario del navegador no la corra un día.
function aFechaCalendario(valor: string): string {
  return valor.slice(0, 10);
}

export function aFichaAlumno(api: FichaAlumnoApi): FichaAlumno {
  return {
    id: String(api.id_alumno),
    nombre: api.usuario.nombre,
    apellido: api.usuario.apellido,
    dni: api.usuario.dni,
    email: api.usuario.email,
    telefono: api.usuario.telefono,
    fechaNacimiento: aFechaCalendario(api.usuario.fecha_nacimiento),
    direccion: api.usuario.direccion,
    estado: api.estado,
    fechaAlta: api.fecha_alta,
    fechaBaja: api.fecha_baja,
    contactoEmergencia: { nombre: api.cont_emerg_nombre, telefono: api.cont_emerg_telefono },
    aptoMedico: api.apto_medico,
    fechaAptoMedico: api.fecha_apto_medico === null ? null : aFechaCalendario(api.fecha_apto_medico),
    observaciones: api.observaciones,
    responsable: api.responsable && {
      nombre: api.responsable.nombre,
      apellido: api.responsable.apellido,
      telefono: api.responsable.telefono,
      email: api.responsable.email,
    },
  };
}

export async function obtenerFichaAlumno(id: string): Promise<FichaAlumno> {
  const { data } = await apiClient.get(`/alumnos/${encodeURIComponent(id)}`);
  return aFichaAlumno(fichaAlumnoApiSchema.parse(data));
}

// Baja lógica: el back da de baja las inscripciones vigentes con el motivo y cierra sus
// horarios (libera el cupo). Responde 409 si ya estaba de baja.
export async function darDeBajaAlumno(id: string, motivo: MotivoBaja, detalle?: string): Promise<void> {
  // Sin detalle no viaja: el back lo guarda como NULL.
  const cuerpo: BajaAlumnoBody = { motivo_baja: motivo, ...(detalle && { detalle_baja: detalle }) };
  await apiClient.post(`/alumnos/${encodeURIComponent(id)}/baja`, cuerpo);
}
