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
