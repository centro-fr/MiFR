import { db, type HorarioMock, type ProfesoraMock } from "@/mocks/db";
import { ROLES } from "@/mocks/data/catalogo-permisos";
import type { UsuarioSemilla } from "@/mocks/data/semilla";

// Arma las respuestas con la misma forma que las del back.

const FECHA = "2026-01-01T00:00:00.000Z";

// UsuarioConRoles del back: los roles vienen anidados con los datos del rol.
export function usuarioConRoles(usuario: UsuarioSemilla) {
  return {
    id_usuario: usuario.id_usuario,
    google_id: null,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    dni: usuario.dni ?? null,
    telefono: usuario.telefono ?? null,
    fecha_nacimiento: usuario.fecha_nacimiento ?? "1990-01-01T00:00:00.000Z",
    direccion: usuario.direccion ?? null,
    estado: usuario.estado ?? "ACTIVO",
    fecha_alta: FECHA,
    fecha_actualizacion: FECHA,
    roles: usuario.roles.map((codigo) => {
      const rol = ROLES.find((r) => r.codigo === codigo)!;
      return { id_usuario: usuario.id_usuario, id_rol: rol.id_rol, fecha_asignacion: FECHA, rol };
    }),
  };
}

// Profesora del back: trae el nombre y apellido de su usuario.
export function profesoraConNombre(profesora: ProfesoraMock) {
  const usuario = db.usuarios.find((u) => u.id_usuario === profesora.id_usuario)!;
  return { ...profesora, usuario: { nombre: usuario.nombre, apellido: usuario.apellido } };
}

// El back guarda las horas como TIME y las serializa sobre el 1970-01-01 en UTC.
function horaComoFecha(hora: string): string {
  return `1970-01-01T${hora}:00.000Z`;
}

// Horario con actividad, profesora y cupo efectivo, como HorarioRespuesta del back.
export function horarioConDatos(horario: HorarioMock) {
  const actividad = db.actividades.find((a) => a.id_actividad === horario.id_actividad)!;
  const profesora = profesoraConNombre(db.profesoras.find((p) => p.id_profesora === horario.id_profesora)!);
  return {
    ...horario,
    hora_inicio: horaComoFecha(horario.hora_inicio),
    hora_fin: horaComoFecha(horario.hora_fin),
    actividad,
    profesora,
    cupo_maximo_efectivo: horario.cupo_maximo ?? actividad.cupo_maximo,
  };
}
