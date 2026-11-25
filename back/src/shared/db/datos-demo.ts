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
  requiere_medidas: boolean;
  solo_menores?: boolean;
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
      email: LUCIA,
      nombre: "Lucía",
      apellido: "Gómez",
      roles: ["PROFESORA"],
      especialidad: "Entrenamiento funcional",
    },
    {
      email: CARLA,
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

// Las actividades y la grilla semanal del centro. Las grupales tienen cupo 12; el personalizado, 4.
export const ACTIVIDADES_DEMO: ActividadDemo[] = [
  {
    codigo: "FUNCIONAL",
    nombre: "Funcional",
    descripcion: "Entrenamiento funcional en grupo",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "FUNCIONAL_45",
    nombre: "Funcional +45",
    descripcion: "Entrenamiento funcional para mayores de 45 años",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "KID_FIT",
    nombre: "Kid Fit",
    descripcion: "Entrenamiento para chicos",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
    solo_menores: true,
  },
  {
    codigo: "ENTRENAMIENTO_PERS",
    nombre: "Personalizado",
    descripcion: "Preparación física general con rutina individual",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
    // La rutina individual parte del peso y la talla: la pre-inscripción los pide (US-05).
    requiere_medidas: true,
  },
  {
    codigo: "HIIT",
    nombre: "HIIT",
    descripcion: "Entrenamiento por intervalos de alta intensidad",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "GAP",
    nombre: "GAP",
    descripcion: "Glúteos, abdominales y piernas",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "TRAINING",
    nombre: "Training",
    descripcion: "Entrenamiento general en grupo",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "COMBAT",
    nombre: "Combat",
    descripcion: "Entrenamiento con movimientos de deportes de combate",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
];

const LUCIA = "lucia.gomez@example.com";
const CARLA = "carla.ruiz@example.com";

// Cada actividad la da siempre la misma profesora, así ninguna tiene dos clases a la misma hora.
function profesoraDe(codigoActividad: string, emailMultirol: string): string {
  if (["FUNCIONAL", "FUNCIONAL_45", "TRAINING"].includes(codigoActividad)) return LUCIA;
  if (["ENTRENAMIENTO_PERS", "KID_FIT", "GAP"].includes(codigoActividad)) return CARLA;
  return emailMultirol;
}

// La grilla de la semana: lunes, miércoles y viernes repiten la misma, y martes y jueves la otra. El
// sábado no hay clases. Cada clase dura una hora.
const GRILLA_LUNES_MIERCOLES_VIERNES: [string, string][] = [
  ["08:00", "FUNCIONAL"],
  ["09:00", "FUNCIONAL_45"],
  ["15:00", "ENTRENAMIENTO_PERS"],
  ["16:00", "HIIT"],
  ["19:00", "TRAINING"],
  ["20:00", "HIIT"],
  ["21:00", "FUNCIONAL"],
  ["22:00", "FUNCIONAL"],
];
const GRILLA_MARTES_JUEVES: [string, string][] = [
  ["09:00", "KID_FIT"],
  ["15:00", "FUNCIONAL"],
  ["16:00", "GAP"],
  ["17:00", "KID_FIT"],
  ["18:00", "ENTRENAMIENTO_PERS"],
  ["19:00", "HIIT"],
  ["20:00", "COMBAT"],
];
const GRILLA_POR_DIA: Record<number, [string, string][]> = {
  1: GRILLA_LUNES_MIERCOLES_VIERNES,
  2: GRILLA_MARTES_JUEVES,
  3: GRILLA_LUNES_MIERCOLES_VIERNES,
  4: GRILLA_MARTES_JUEVES,
  5: GRILLA_LUNES_MIERCOLES_VIERNES,
};

// Cupo propio del horario, distinto del de la actividad (CA-07): el Training del viernes.
const CUPO_PROPIO_TRAINING_VIERNES = 15;

function unaHoraDespues(hora: string): string {
  return `${String(Number(hora.slice(0, 2)) + 1).padStart(2, "0")}:00`;
}

function horariosDemo(emailMultirol: string): HorarioDemo[] {
  return Object.entries(GRILLA_POR_DIA).flatMap(([dia, clases]) =>
    clases.map(([hora_inicio, codigoActividad]) => ({
      codigoActividad,
      emailProfesora: profesoraDe(codigoActividad, emailMultirol),
      dia_semana: Number(dia),
      hora_inicio,
      hora_fin: unaHoraDespues(hora_inicio),
      cupo_maximo: codigoActividad === "TRAINING" && dia === "5" ? CUPO_PROPIO_TRAINING_VIERNES : null,
    })),
  );
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
  contacto_emergencia: { nombre: string; telefono: string };
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
    contacto_emergencia: { nombre: "Jorge Medina", telefono: "3794 401122" },
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
    contacto_emergencia: { nombre: "Paula Romero", telefono: "3794 402233" },
    activo: false,
  },
  {
    nombre: "Valentina",
    apellido: "Herrera",
    dni: "39222333",
    email: "valentina.herrera@example.com",
    fecha_nacimiento: new Date("1994-02-11T00:00:00Z"),
    tutor: null,
    contacto_emergencia: { nombre: "Marcos Herrera", telefono: "3794 403344" },
    activo: true,
  },
];

interface InscripcionDemo {
  dniAlumno: string;
  nombrePlan: string;
  emailProfesora: string;
  // Los horarios de la profesora en esos días y a esa hora, de la actividad indicada.
  codigoActividad: string;
  dias: number[];
  horaInicio: string;
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
    horaInicio: "08:00",
    estado: "PREINSCRIPTA",
  },
  {
    dniAlumno: "52111222",
    nombrePlan: "Personalizado 2 días",
    emailProfesora: "carla.ruiz@example.com",
    codigoActividad: "ENTRENAMIENTO_PERS",
    dias: [2, 4],
    horaInicio: "18:00",
    estado: "PREINSCRIPTA",
  },
  {
    dniAlumno: "39222333",
    nombrePlan: "Intermedio",
    emailProfesora: "carla.ruiz@example.com",
    codigoActividad: "ENTRENAMIENTO_PERS",
    dias: [1, 3, 5],
    horaInicio: "15:00",
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
  await cargarTarifas(prisma, idProfesora, idPlan);
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
  for (const { tutor, activo, contacto_emergencia, ...persona } of ALUMNOS_DEMO) {
    const estado = activo ? "ACTIVO" : "INACTIVO";
    const idResponsable = tutor ? await cargarPersona(prisma, tutor) : null;
    const idUsuario = await cargarPersona(prisma, persona, estado);
    const alumno = await prisma.alumnos.upsert({
      where: { id_usuario: idUsuario },
      update: {},
      create: {
        id_usuario: idUsuario,
        id_usuario_responsable: idResponsable,
        cont_emerg_nombre: contacto_emergencia.nombre,
        cont_emerg_telefono: contacto_emergencia.telefono,
        estado,
      },
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
      await completarPrimerPago(prisma, existente, hoy);
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
          hora_inicio: convertirHora(inscripcion.horaInicio),
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

// Una base cargada antes de que existieran los pagos tiene a los alumnos activos sin su primera cuota:
// se la agrega para que el escenario quede igual que en una base nueva.
async function completarPrimerPago(
  prisma: PrismaClient,
  inscripcion: { id_inscripcion: number; id_plan_precio: number; id_profesora: number; estado: string },
  hoy: Date,
): Promise<void> {
  if (inscripcion.estado !== "ACTIVA") return;
  if (await prisma.cuotas.findFirst({ where: { id_inscripcion: inscripcion.id_inscripcion } })) return;

  const precio = await prisma.plan_precios.findUniqueOrThrow({
    where: { id_plan_precio: inscripcion.id_plan_precio },
  });
  await cargarPrimerPagoEnEfectivo(
    prisma,
    inscripcion.id_inscripcion,
    inscripcion.id_profesora,
    precio.precio.toNumber(),
    hoy,
  );
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

// Los honorarios rigen desde el 01/01/2026, así hoy siempre hay una tarifa vigente.
const VIGENCIA_TARIFAS_DEMO = new Date("2026-01-01T00:00:00Z");

interface TarifaDemo {
  id_profesora: number;
  concepto: "ALUMNO_A_CARGO" | "HORA_SUPLENCIA";
  id_plan: number | null;
  tipo_valor: "MONTO_FIJO" | "PORCENTAJE";
  valor: number;
}

// Las tarifas no tienen una clave única en el DER: se busca la abierta del mismo alcance antes de
// crearla, para que volver a correr el script no la duplique.
async function cargarTarifa(prisma: PrismaClient, tarifa: TarifaDemo): Promise<void> {
  const { id_profesora, concepto, id_plan } = tarifa;
  const existente = await prisma.tarifas_honorario.findFirst({
    where: { id_profesora, concepto, id_plan, fecha_vigencia_hasta: null },
  });
  if (!existente) {
    await prisma.tarifas_honorario.create({
      data: { ...tarifa, fecha_vigencia_desde: VIGENCIA_TARIFAS_DEMO },
    });
  }
}

// Cada profesora cobra un monto fijo por alumno a cargo y por hora de suplencia. La primera, además,
// cobra el 10 % de lo cobrado en el plan Intermedio: esa tarifa gana a la de todos los planes.
async function cargarTarifas(
  prisma: PrismaClient,
  idProfesora: Map<string, number>,
  idPlan: Map<string, number>,
): Promise<void> {
  const profesoras = [...idProfesora.values()];
  for (const id_profesora of profesoras) {
    await cargarTarifa(prisma, {
      id_profesora,
      concepto: "ALUMNO_A_CARGO",
      id_plan: null,
      tipo_valor: "MONTO_FIJO",
      valor: 3000,
    });
    await cargarTarifa(prisma, {
      id_profesora,
      concepto: "HORA_SUPLENCIA",
      id_plan: null,
      tipo_valor: "MONTO_FIJO",
      valor: 2500,
    });
  }
  const primera = profesoras[0];
  const intermedio = idPlan.get("Intermedio");
  if (primera !== undefined && intermedio !== undefined) {
    await cargarTarifa(prisma, {
      id_profesora: primera,
      concepto: "ALUMNO_A_CARGO",
      id_plan: intermedio,
      tipo_valor: "PORCENTAJE",
      valor: 10,
    });
  }
}
