import type { PrismaClient, codigo_rol, modalidad_actividad, tipo_plan } from "@prisma/client";
import { fechaActualArgentina } from "../utils/fecha-argentina.js";

// Datos de prueba de las tareas 1.2 del SDD de autenticación (usuario multi-rol), de
// configuración base (actividades, profesoras y horarios), de planes, de alumnos y de sus inscripciones. Los cargan seed-demo.ts en la base
// local y los tests de integración en la base de prueba, así el escenario que se recorre a mano
// es el mismo que verifican los tests.

export const EMAIL_MULTIROL_DEMO = "marina.sosa@example.com";

interface UsuarioDemo {
  email: string;
  nombre: string;
  apellido: string;
  roles: codigo_rol[];
  especialidad: string;
}

interface ActividadDemo {
  codigo: string;
  nombre: string;
  descripcion: string;
  modalidad: modalidad_actividad;
  cupo_maximo: number | null;
}

interface HorarioDemo {
  codigoActividad: string;
  emailProfesora: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
}

function usuariosDemo(emailMultirol: string): UsuarioDemo[] {
  return [
    {
      email: "lucia.gomez@example.com",
      nombre: "Lucía",
      apellido: "Gómez",
      roles: ["PROFESORA"],
      especialidad: "Entrenamiento funcional",
    },
    {
      email: "carla.ruiz@example.com",
      nombre: "Carla",
      apellido: "Ruiz",
      roles: ["PROFESORA"],
      especialidad: "Entrenamiento personalizado",
    },
    {
      email: emailMultirol,
      nombre: "Marina",
      apellido: "Sosa",
      roles: ["PROPIETARIA", "PROFESORA"],
      especialidad: "Entrenamiento personalizado",
    },
  ];
}

export const ACTIVIDADES_DEMO: ActividadDemo[] = [
  {
    codigo: "FUNCIONAL",
    nombre: "Funcional Grupal",
    descripcion: "Clase grupal de entrenamiento funcional",
    modalidad: "GRUPAL",
    cupo_maximo: null,
  },
  {
    codigo: "ENTRENAMIENTO_PERS",
    nombre: "Entrenamiento Personalizado",
    descripcion: "Preparación física general con rutina individual",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
  },
];

function horariosDemo(emailMultirol: string): HorarioDemo[] {
  return [
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: "lucia.gomez@example.com",
      dia_semana: 1,
      hora_inicio: "18:00",
      hora_fin: "19:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: "lucia.gomez@example.com",
      dia_semana: 3,
      hora_inicio: "18:00",
      hora_fin: "19:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "ENTRENAMIENTO_PERS",
      emailProfesora: "carla.ruiz@example.com",
      dia_semana: 2,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "ENTRENAMIENTO_PERS",
      emailProfesora: "carla.ruiz@example.com",
      dia_semana: 4,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      cupo_maximo: null,
    },
    // Cupo propio del horario, distinto del de la actividad (CA-07).
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: emailMultirol,
      dia_semana: 5,
      hora_inicio: "19:00",
      hora_fin: "20:00",
      cupo_maximo: 12,
    },
  ];
}

interface PlanDemo {
  nombre: string;
  tipo: tipo_plan;
  clases_por_semana: number | null;
  dias_gracia: number;
  profesora_unica: boolean;
  codigoActividadExclusiva: string | null;
  precio: number;
}

// Los precios rigen desde el 01/01/2026, así hoy siempre tienen un precio vigente.
const VIGENCIA_PRECIOS_DEMO = new Date("2026-01-01T00:00:00Z");

export const PLANES_DEMO: PlanDemo[] = [
  {
    nombre: "Básico",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precio: 25000,
  },
  {
    nombre: "Intermedio",
    tipo: "MENSUAL",
    clases_por_semana: 3,
    dias_gracia: 5,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precio: 30000,
  },
  {
    nombre: "Personalizado 2 días",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: true,
    codigoActividadExclusiva: "ENTRENAMIENTO_PERS",
    precio: 45000,
  },
  {
    nombre: "Clase suelta",
    tipo: "CLASE_SUELTA",
    clases_por_semana: null,
    dias_gracia: 0,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precio: 6000,
  },
];

interface PersonaDemo {
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  fecha_nacimiento: Date;
}

interface AlumnoDemo extends PersonaDemo {
  tutor: PersonaDemo | null;
  // Activo: ya pagó su primera cuota en efectivo, que el escenario carga junto con su inscripción.
  activo: boolean;
}

// Los pre-inscriptos quedan INACTIVO hasta que se confirma su primer pago.
export const ALUMNOS_DEMO: AlumnoDemo[] = [
  {
    nombre: "Sofía",
    apellido: "Medina",
    dni: "38111222",
    email: "sofia.medina@example.com",
    fecha_nacimiento: new Date("1996-08-14T00:00:00Z"),
    tutor: null,
    activo: false,
  },
  {
    nombre: "Mateo",
    apellido: "Romero",
    dni: "52111222",
    email: null,
    fecha_nacimiento: new Date("2015-11-03T00:00:00Z"),
    tutor: {
      nombre: "Paula",
      apellido: "Romero",
      dni: "31222333",
      email: "paula.romero@example.com",
      fecha_nacimiento: new Date("1984-06-21T00:00:00Z"),
    },
    activo: false,
  },
  {
    nombre: "Valentina",
    apellido: "Herrera",
    dni: "39222333",
    email: "valentina.herrera@example.com",
    fecha_nacimiento: new Date("1994-02-11T00:00:00Z"),
    tutor: null,
    activo: true,
  },
];

interface InscripcionDemo {
  dniAlumno: string;
  nombrePlan: string;
  emailProfesora: string;
  // Los horarios de la profesora en esos días, de la actividad indicada.
  codigoActividad: string;
  dias: number[];
  estado: "PREINSCRIPTA" | "ACTIVA";
}

// Las PREINSCRIPTA reservan cupo y el alumno sigue INACTIVO hasta el primer pago (US-05, US-07).
export const INSCRIPCIONES_DEMO: InscripcionDemo[] = [
  {
    dniAlumno: "38111222",
    nombrePlan: "Básico",
    emailProfesora: "lucia.gomez@example.com",
    codigoActividad: "FUNCIONAL",
    dias: [1, 3],
    estado: "PREINSCRIPTA",
  },
  {
    dniAlumno: "52111222",
    nombrePlan: "Personalizado 2 días",
    emailProfesora: "carla.ruiz@example.com",
    codigoActividad: "ENTRENAMIENTO_PERS",
    dias: [2, 4],
    estado: "PREINSCRIPTA",
  },
  {
    dniAlumno: "39222333",
    nombrePlan: "Intermedio",
    emailProfesora: "carla.ruiz@example.com",
    codigoActividad: "ENTRENAMIENTO_PERS",
    dias: [2, 4],
    estado: "ACTIVA",
  },
];

function convertirHora(hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

export interface DatosDemoCargados {
  // id_profesora por correo de la profesora
  idProfesora: Map<string, number>;
  // id_actividad por código de la actividad
  idActividad: Map<string, number>;
  horariosCreados: number;
  // id_plan por nombre del plan
  idPlan: Map<string, number>;
  // id_alumno por DNI del alumno
  idAlumno: Map<string, number>;
  // id_inscripcion por DNI del alumno
  idInscripcion: Map<string, number>;
}

// Espera el catálogo de seguridad ya cargado: las profesoras reciben sus roles de la tabla roles.
export async function cargarDatosDemo(
  prisma: PrismaClient,
  emailMultirol: string = EMAIL_MULTIROL_DEMO,
): Promise<DatosDemoCargados> {
  const idProfesora = await cargarUsuarios(prisma, usuariosDemo(emailMultirol));
  const idActividad = await cargarActividades(prisma);
  const horariosCreados = await cargarHorarios(prisma, horariosDemo(emailMultirol), idActividad, idProfesora);
  const idPlan = await cargarPlanes(prisma, idActividad);
  const idAlumno = await cargarAlumnos(prisma);
  const idInscripcion = await cargarInscripciones(prisma, { idProfesora, idActividad, idPlan, idAlumno });
  return { idProfesora, idActividad, horariosCreados, idPlan, idAlumno, idInscripcion };
}

async function cargarUsuarios(prisma: PrismaClient, usuarios: UsuarioDemo[]): Promise<Map<string, number>> {
  const roles = await prisma.roles.findMany();
  const idRol = new Map(roles.map((rol) => [rol.codigo, rol.id_rol]));
  const idProfesoraPorEmail = new Map<string, number>();

  for (const datos of usuarios) {
    const usuario = await prisma.usuarios.upsert({
      where: { email: datos.email },
      update: {},
      create: {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: new Date("1990-01-01"),
      },
    });
    await prisma.usuario_roles.createMany({
      data: datos.roles.map((rol) => ({ id_usuario: usuario.id_usuario, id_rol: idRol.get(rol) as number })),
      skipDuplicates: true,
    });
    const profesora = await prisma.profesoras.upsert({
      where: { id_usuario: usuario.id_usuario },
      update: {},
      create: { id_usuario: usuario.id_usuario, especialidad: datos.especialidad },
    });
    idProfesoraPorEmail.set(datos.email, profesora.id_profesora);
  }

  return idProfesoraPorEmail;
}

async function cargarActividades(prisma: PrismaClient): Promise<Map<string, number>> {
  const idActividadPorCodigo = new Map<string, number>();
  for (const actividad of ACTIVIDADES_DEMO) {
    const creada = await prisma.actividades.upsert({
      where: { codigo: actividad.codigo },
      update: {},
      create: { ...actividad, activo: true },
    });
    idActividadPorCodigo.set(actividad.codigo, creada.id_actividad);
  }
  return idActividadPorCodigo;
}

// Los horarios no tienen una clave única en el DER: se busca el mismo bloque activo antes de crearlo
// para que volver a correr el script no los duplique.
async function cargarHorarios(
  prisma: PrismaClient,
  horarios: HorarioDemo[],
  idActividad: Map<string, number>,
  idProfesora: Map<string, number>,
): Promise<number> {
  let creados = 0;
  for (const horario of horarios) {
    const clave = {
      id_actividad: idActividad.get(horario.codigoActividad) as number,
      id_profesora: idProfesora.get(horario.emailProfesora) as number,
      dia_semana: horario.dia_semana,
      hora_inicio: convertirHora(horario.hora_inicio),
    };
    const existente = await prisma.horarios.findFirst({ where: { ...clave, fecha_baja: null } });
    if (existente) continue;

    await prisma.horarios.create({
      data: { ...clave, hora_fin: convertirHora(horario.hora_fin), cupo_maximo: horario.cupo_maximo },
    });
    creados++;
  }
  return creados;
}

// Los planes no tienen una clave única en el DER: se busca uno vigente con el mismo nombre.
async function cargarPlanes(
  prisma: PrismaClient,
  idActividad: Map<string, number>,
): Promise<Map<string, number>> {
  const idPlanPorNombre = new Map<string, number>();
  for (const { codigoActividadExclusiva, precio, ...plan } of PLANES_DEMO) {
    const existente = await prisma.planes.findFirst({ where: { nombre: plan.nombre, fecha_baja: null } });
    const creado =
      existente ??
      (await prisma.planes.create({
        data: {
          ...plan,
          id_actividad_exclusiva: codigoActividadExclusiva ? idActividad.get(codigoActividadExclusiva) : null,
          precios: { create: { precio, fecha_vigencia_desde: VIGENCIA_PRECIOS_DEMO } },
        },
      }));
    idPlanPorNombre.set(plan.nombre, creado.id_plan);
  }
  return idPlanPorNombre;
}

async function cargarPersona(
  prisma: PrismaClient,
  persona: PersonaDemo,
  estado: "ACTIVO" | "INACTIVO" = "INACTIVO",
): Promise<number> {
  const usuario = await prisma.usuarios.upsert({
    where: { dni: persona.dni },
    update: {},
    create: { ...persona, estado },
  });
  return usuario.id_usuario;
}

async function cargarAlumnos(prisma: PrismaClient): Promise<Map<string, number>> {
  const idAlumnoPorDni = new Map<string, number>();
  const rolAlumno = await prisma.roles.findUniqueOrThrow({ where: { codigo: "ALUMNO" } });
  for (const { tutor, activo, ...persona } of ALUMNOS_DEMO) {
    const estado = activo ? "ACTIVO" : "INACTIVO";
    const idResponsable = tutor ? await cargarPersona(prisma, tutor) : null;
    const idUsuario = await cargarPersona(prisma, persona, estado);
    const alumno = await prisma.alumnos.upsert({
      where: { id_usuario: idUsuario },
      update: {},
      create: { id_usuario: idUsuario, id_usuario_responsable: idResponsable, estado },
    });
    if (activo) {
      await prisma.usuario_roles.createMany({
        data: [{ id_usuario: idUsuario, id_rol: rolAlumno.id_rol }],
        skipDuplicates: true,
      });
    }
    idAlumnoPorDni.set(persona.dni, alumno.id_alumno);
  }
  return idAlumnoPorDni;
}

// Si el alumno ya tiene una inscripción vigente se deja como está, para que volver a correr el
// script no la duplique.
async function cargarInscripciones(
  prisma: PrismaClient,
  ids: Omit<DatosDemoCargados, "horariosCreados" | "idInscripcion">,
): Promise<Map<string, number>> {
  const idInscripcionPorDni = new Map<string, number>();
  const hoy = fechaActualArgentina();
  for (const inscripcion of INSCRIPCIONES_DEMO) {
    const id_alumno = ids.idAlumno.get(inscripcion.dniAlumno) as number;
    const id_plan = ids.idPlan.get(inscripcion.nombrePlan) as number;
    const id_profesora = ids.idProfesora.get(inscripcion.emailProfesora) as number;
    const existente = await prisma.inscripciones.findFirst({
      where: { id_alumno, estado: { in: ["PREINSCRIPTA", "ACTIVA"] } },
    });
    if (existente) {
      idInscripcionPorDni.set(inscripcion.dniAlumno, existente.id_inscripcion);
      continue;
    }

    const [precio, horarios] = await Promise.all([
      prisma.plan_precios.findFirstOrThrow({ where: { id_plan }, orderBy: { fecha_vigencia_desde: "desc" } }),
      prisma.horarios.findMany({
        where: {
          id_profesora,
          id_actividad: ids.idActividad.get(inscripcion.codigoActividad),
          dia_semana: { in: inscripcion.dias },
          fecha_baja: null,
        },
      }),
    ]);
    const creada = await prisma.inscripciones.create({
      data: {
        id_alumno,
        id_plan,
        id_plan_precio: precio.id_plan_precio,
        id_profesora,
        sin_cargo: false,
        fecha_inicio: hoy,
        estado: inscripcion.estado,
        horarios: { create: horarios.map(({ id_horario }) => ({ id_horario, fecha_desde: hoy })) },
      },
    });
    if (inscripcion.estado === "ACTIVA") {
      await cargarPrimerPagoEnEfectivo(
        prisma,
        creada.id_inscripcion,
        id_profesora,
        precio.precio.toNumber(),
        hoy,
      );
    }
    idInscripcionPorDni.set(inscripcion.dniAlumno, creada.id_inscripcion);
  }
  return idInscripcionPorDni;
}

// Un alumno activo ya pagó su primera cuota (US-07): se la cobró en efectivo su profesora y todavía
// no la rindió (US-19).
async function cargarPrimerPagoEnEfectivo(
  prisma: PrismaClient,
  idInscripcion: number,
  idProfesora: number,
  monto: number,
  hoy: Date,
): Promise<void> {
  const profesora = await prisma.profesoras.findUniqueOrThrow({ where: { id_profesora: idProfesora } });
  const ahora = new Date();
  await prisma.cuotas.create({
    data: {
      id_inscripcion: idInscripcion,
      numero_cuota: 1,
      fecha_vencimiento: unMesDespues(hoy),
      monto,
      pagos: {
        create: {
          forma_pago: "EFECTIVO",
          estado: "CONFIRMADO",
          monto,
          fecha_pago: ahora,
          id_usuario_registra: profesora.id_usuario,
          id_profesora_cobra: idProfesora,
          rendido: false,
          id_usuario_confirma: profesora.id_usuario,
          fecha_confirmacion: ahora,
        },
      },
    },
  });
}

// La regla de un plan mensual (de fecha a fecha, 31/01 → 28 o 29/02). En la aplicación la resuelve
// ICalculoVencimiento; el escenario no depende de él para poder cargarse solo.
function unMesDespues(dia: Date): Date {
  const anio = dia.getUTCFullYear();
  const mes = dia.getUTCMonth() + 1;
  const ultimoDiaDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(dia.getUTCDate(), ultimoDiaDelMes)));
}
