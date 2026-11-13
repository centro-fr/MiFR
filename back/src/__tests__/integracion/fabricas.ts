import type { PrismaClient } from "@prisma/client";
import type { CodigoRol, Usuario } from "../../modules/gestion-usuarios/usuario/usuario.types.js";

export interface UsuarioDePrueba {
  id_usuario: number;
  email: string;
}

interface OpcionesUsuario {
  roles: CodigoRol[];
  estado?: Usuario["estado"];
}

let siguienteNumero = 1;

// Prepara el escenario directo en la base, como lo dejaría el alta de la propietaria:
// lo que se prueba es lo que pasa después, al pedir por la API.
export async function crearUsuario(
  prisma: PrismaClient,
  { roles, estado = "ACTIVO" }: OpcionesUsuario,
): Promise<UsuarioDePrueba> {
  const numero = siguienteNumero++;
  const filasRoles = await prisma.roles.findMany({ where: { codigo: { in: roles } } });

  const usuario = await prisma.usuarios.create({
    data: {
      email: `usuario${numero}@example.com`,
      nombre: "Usuario",
      apellido: `De Prueba ${numero}`,
      fecha_nacimiento: new Date("1990-01-01"),
      estado,
      roles: { create: filasRoles.map((rol) => ({ id_rol: rol.id_rol })) },
    },
  });

  return { id_usuario: usuario.id_usuario, email: usuario.email as string };
}

export interface PlanDePrueba {
  id_plan: number;
  id_plan_precio: number;
}

interface OpcionesPlan {
  nombre?: string;
  tipo?: "MENSUAL" | "CLASE_SUELTA";
  clases_por_semana?: number | null;
  precio?: number;
  vigenteDesde?: Date;
  id_actividad_exclusiva?: number;
}

// Plan con un único precio abierto, como lo deja el alta por la API. Las inscripciones lo
// necesitan para guardar el plan y el precio con el que se inscribió el alumno.
export async function crearPlan(
  prisma: PrismaClient,
  {
    nombre = `Plan ${siguienteNumero++}`,
    tipo = "MENSUAL",
    clases_por_semana = tipo === "MENSUAL" ? 2 : null,
    precio = 25000,
    vigenteDesde = new Date("2026-01-01T00:00:00Z"),
    id_actividad_exclusiva,
  }: OpcionesPlan = {},
): Promise<PlanDePrueba> {
  const plan = await prisma.planes.create({
    data: {
      nombre,
      tipo,
      clases_por_semana,
      dias_gracia: tipo === "MENSUAL" ? 5 : 0,
      profesora_unica: false,
      id_actividad_exclusiva,
      precios: { create: { precio, fecha_vigencia_desde: vigenteDesde } },
    },
    include: { precios: true },
  });

  return { id_plan: plan.id_plan, id_plan_precio: plan.precios[0].id_plan_precio };
}

export interface AlumnoDePrueba {
  id_alumno: number;
  id_usuario: number;
}

interface OpcionesAlumno {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string | null;
  fecha_nacimiento?: Date;
  estado?: "ACTIVO" | "INACTIVO" | "BAJA";
  id_usuario_responsable?: number;
}

// Alumno con su usuario, como lo deja el alta por la API (pre-inscripto: INACTIVO y sin roles).
// Los casos de inscripciones lo usan para tener a quién inscribir.
export async function crearAlumno(
  prisma: PrismaClient,
  {
    nombre = "Alumno",
    apellido,
    dni,
    email,
    fecha_nacimiento = new Date("1995-04-20T00:00:00Z"),
    estado = "INACTIVO",
    id_usuario_responsable,
  }: OpcionesAlumno = {},
): Promise<AlumnoDePrueba> {
  const numero = siguienteNumero++;
  const alumno = await prisma.alumnos.create({
    data: {
      estado,
      fecha_baja: estado === "BAJA" ? new Date() : null,
      cont_emerg_nombre: "Contacto De Prueba",
      cont_emerg_telefono: "3794 400000",
      responsable: id_usuario_responsable ? { connect: { id_usuario: id_usuario_responsable } } : undefined,
      usuario: {
        create: {
          nombre,
          apellido: apellido ?? `De Prueba ${numero}`,
          dni,
          email: email === undefined ? `alumno${numero}@example.com` : email,
          fecha_nacimiento,
          estado: estado === "ACTIVO" ? "ACTIVO" : "INACTIVO",
        },
      },
    },
  });

  return { id_alumno: alumno.id_alumno, id_usuario: alumno.id_usuario };
}

interface OpcionesHorario {
  id_actividad: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo?: number | null;
  // Sin valor, la base pone el día real. Un test con el reloj simulado la fija antes de ese día.
  fecha_alta?: Date;
}

function convertirHora(hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

export async function crearHorarioDePrueba(
  prisma: PrismaClient,
  input: OpcionesHorario,
): Promise<{ id_horario: number }> {
  const horario = await prisma.horarios.create({
    data: {
      ...input,
      hora_inicio: convertirHora(input.hora_inicio),
      hora_fin: convertirHora(input.hora_fin),
    },
    select: { id_horario: true },
  });
  return horario;
}

interface OpcionesInscripcion {
  id_alumno: number;
  plan: PlanDePrueba;
  id_profesora: number;
  id_horario: number;
  estado?: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
  fecha_inicio?: Date;
}

// Inscripción en un horario, directo en la base: los casos de asistencia (US-20, US-21) la usan
// para armar la lista de una clase sin pasar por la pre-inscripción y el cobro.
export async function crearInscripcionDePrueba(
  prisma: PrismaClient,
  {
    id_alumno,
    plan,
    id_profesora,
    id_horario,
    estado = "ACTIVA",
    fecha_inicio = new Date("2026-10-01T00:00:00Z"),
  }: OpcionesInscripcion,
): Promise<{ id_inscripcion: number }> {
  const deBaja = estado === "BAJA";
  return prisma.inscripciones.create({
    data: {
      id_alumno,
      id_plan: plan.id_plan,
      id_plan_precio: plan.id_plan_precio,
      id_profesora,
      sin_cargo: false,
      fecha_inicio,
      estado,
      fecha_baja: deBaja ? fecha_inicio : null,
      motivo_baja: deBaja ? "ABANDONO" : null,
      horarios: {
        create: { id_horario, fecha_desde: fecha_inicio, fecha_hasta: deBaja ? fecha_inicio : null },
      },
    },
    select: { id_inscripcion: true },
  });
}

// El alta definitiva le da su rol al alumno o al tutor (US-07); los casos que solo necesitan que pueda
// entrar al portal se lo dan directo.
export async function darRol(prisma: PrismaClient, id_usuario: number, codigo: CodigoRol): Promise<void> {
  const { id_rol } = await prisma.roles.findUniqueOrThrow({ where: { codigo } });
  await prisma.usuario_roles.create({ data: { id_usuario, id_rol } });
}

export async function crearProfesora(
  prisma: PrismaClient,
): Promise<{ id_profesora: number; id_usuario: number; email: string }> {
  const { id_usuario, email } = await crearUsuario(prisma, { roles: ["PROFESORA"] });
  const { id_profesora } = await prisma.profesoras.create({ data: { id_usuario } });
  return { id_profesora, id_usuario, email };
}

export async function crearActividad(
  prisma: PrismaClient,
  {
    modalidad = "GRUPAL",
    cupo_maximo = null,
  }: { modalidad?: "GRUPAL" | "PERSONALIZADA"; cupo_maximo?: number | null } = {},
): Promise<{ id_actividad: number }> {
  const numero = siguienteNumero++;
  return prisma.actividades.create({
    data: { codigo: `ACT_${numero}`, nombre: `Actividad ${numero}`, modalidad, cupo_maximo, activo: true },
    select: { id_actividad: true },
  });
}

interface OpcionesClase {
  id_horario: number;
  fecha_clase: Date;
  id_prof_dictante: number;
  estado?: "PROGRAMADA" | "DICTADA" | "CANCELADA";
  // Una marca por inscripto; los que no figuran quedan sin marcar. Sin id_usuario_registra, la marca
  // es como las que deja el cierre de la asistencia.
  marcas?: { id_alumno: number; id_inscripcion: number; asistio: boolean; id_usuario_registra?: number }[];
}

// Clase con sus marcas, directo en la base: los casos de racha, ranking e informes (US-22, US-30,
// US-31, US-33) la usan para cargar el historial de asistencia sin tomarla clase por clase.
export async function crearClase(
  prisma: PrismaClient,
  { id_horario, fecha_clase, id_prof_dictante, estado = "DICTADA", marcas = [] }: OpcionesClase,
): Promise<{ id_clase: number }> {
  const { id_clase } = await prisma.clases.create({
    data: { id_horario, fecha_clase, id_prof_dictante, estado },
  });
  if (marcas.length > 0) {
    await prisma.asistencias.createMany({
      data: marcas.map((marca) => ({ id_clase, ...marca, fecha_registro: new Date() })),
    });
  }
  return { id_clase };
}
