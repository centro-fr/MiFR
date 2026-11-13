import { db, type CambioPlanMock, type HorarioMock, type ProfesoraMock } from "@/mocks/db";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
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

// Profesora del back: trae el nombre, apellido, email, telefono y fecha_nacimiento de su usuario.
export function profesoraConNombre(profesora: ProfesoraMock) {
  const usuario = db.usuarios.find((u) => u.id_usuario === profesora.id_usuario)!;
  return {
    ...profesora,
    usuario: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono ?? null,
      fecha_nacimiento: usuario.fecha_nacimiento ?? null,
    },
  };
}

// El back guarda las horas como TIME y las serializa sobre el 1970-01-01 en UTC.
function horaComoFecha(hora: string): string {
  return `1970-01-01T${hora}:00.000Z`;
}

// Horario con actividad, profesora y cupo efectivo, como HorarioRespuesta del back.
export function horarioConDatos(horario: HorarioMock) {
  const actividad = db.actividades.find((a) => a.id_actividad === horario.id_actividad)!;
  const profesora = profesoraConNombre(db.profesoras.find((p) => p.id_profesora === horario.id_profesora)!);
  const inscriptos = db.inscripciones.filter(
    (ins) => (ins.estado === "ACTIVA" || ins.estado === "PREINSCRIPTA") && ins.ids_horarios.includes(horario.id_horario),
  ).length;
  return {
    ...horario,
    hora_inicio: horaComoFecha(horario.hora_inicio),
    hora_fin: horaComoFecha(horario.hora_fin),
    actividad,
    profesora,
    cupo_maximo_efectivo: horario.cupo_maximo ?? actividad.cupo_maximo,
    inscriptos,
  };
}

// Parámetro DIAS_RESERVA_PREINSCRIPCION del back, con su valor inicial.
const DIAS_RESERVA_PREINSCRIPCION = 3;
const UN_DIA_EN_MS = 86_400_000;

// conReserva de inscripcion.service.ts: solo las PREINSCRIPTA guardan su lugar unos días.
export function reservaDe({ estado, fecha_inicio }: InscripcionMock) {
  if (estado !== "PREINSCRIPTA") return null;
  const vence = new Date(new Date(fecha_inicio).getTime() + DIAS_RESERVA_PREINSCRIPCION * UN_DIA_EN_MS);
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  return { vence: vence.toISOString(), vencida: vence < hoy };
}

// Inscripcion del back: con alumno, plan, precio, profesora, horarios y reserva.
export function inscripcionConDatos(inscripcion: InscripcionMock) {
  const { ids_horarios, ...columnas } = inscripcion;
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno)!;
  const usuario = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario)!;
  const profesora = profesoraConNombre(db.profesoras.find((p) => p.id_profesora === inscripcion.id_profesora)!);
  return {
    ...columnas,
    reserva: reservaDe(inscripcion),
    alumno: { id_alumno: alumno.id_alumno, estado: alumno.estado, usuario: { nombre: usuario.nombre, apellido: usuario.apellido } },
    plan: db.planes.find((p) => p.id_plan === inscripcion.id_plan)!,
    plan_precio: db.planPrecios.find((p) => p.id_plan_precio === inscripcion.id_plan_precio)!,
    profesora: { id_profesora: profesora.id_profesora, usuario: profesora.usuario },
    horarios: ids_horarios.map((id_horario) => ({
      id_inscripcion: inscripcion.id_inscripcion,
      id_horario,
      fecha_desde: inscripcion.fecha_inicio,
      fecha_hasta: null,
      horario: horarioConDatos(db.horarios.find((h) => h.id_horario === id_horario)!),
    })),
  };
}

// CambioPlanProgramado del back (US-14), con los nombres del plan y de la profesora.
export function cambioProgramadoConDatos(cambio: CambioPlanMock) {
  const plan = db.planes.find((p) => p.id_plan === cambio.id_plan)!;
  const profesora = profesoraConNombre(db.profesoras.find((p) => p.id_profesora === cambio.id_profesora)!);
  return {
    ...cambio,
    nombre_plan: plan.nombre,
    nombre_profesora: `${profesora.usuario.nombre} ${profesora.usuario.apellido}`,
    fecha_aplicacion: `${cambio.fecha_aplicacion}T00:00:00.000Z`,
  };
}

export function cambioProgramadoDe(idInscripcion: number) {
  const cambio = db.cambiosPlan.find((c) => c.id_inscripcion === idInscripcion);
  return cambio ? cambioProgramadoConDatos(cambio) : null;
}
