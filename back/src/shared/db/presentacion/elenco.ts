import type { codigo_rol, modalidad_actividad, motivo_baja } from "@prisma/client";

// El centro de la presentación: Centro de Entrenamiento FR, en Perico (Jujuy). Las actividades y la
// grilla son las que muestra la página pública (front/src/features/publico/utils/actividades-del-centro.ts)
// y las cuentas que ofrece el login de prueba son las de front/src/mocks/data/semilla.ts, con los mismos
// emails y roles: así el selector de cuentas entra igual con mocks que contra esta base.

export interface ProfesoraDelElenco {
  email: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
  especialidad: string;
  roles: codigo_rol[];
}

export const MARINA = "marina.sosa@example.com";
export const LUCIA = "lucia.gomez@example.com";
export const CARLA = "carla.ruiz@example.com";
export const SOFIA = "sofia.martinez@example.com";

export const PROFESORAS: ProfesoraDelElenco[] = [
  {
    email: MARINA,
    nombre: "Marina",
    apellido: "Sosa",
    dni: "29444555",
    telefono: "388 415-2233",
    fecha_nacimiento: "1988-03-15",
    direccion: "San Martín 890",
    especialidad: "HIIT, Power y Combat",
    roles: ["PROPIETARIA", "PROFESORA"],
  },
  {
    email: LUCIA,
    nombre: "Lucía",
    apellido: "Gómez",
    dni: "32111222",
    telefono: "388 420-6677",
    fecha_nacimiento: "1992-05-10",
    direccion: "Belgrano 1234",
    especialidad: "Funcional",
    roles: ["PROFESORA"],
  },
  {
    email: CARLA,
    nombre: "Carla",
    apellido: "Ruiz",
    dni: "34888999",
    telefono: "388 431-7788",
    fecha_nacimiento: "1994-08-20",
    direccion: "Mitre 567",
    especialidad: "Entrenamiento personalizado, Bootyband y GAP",
    roles: ["PROFESORA"],
  },
  {
    email: SOFIA,
    nombre: "Sofía",
    apellido: "Martínez",
    dni: "36777888",
    telefono: "388 442-5566",
    fecha_nacimiento: "1996-11-25",
    direccion: "Sarmiento 432",
    especialidad: "Acondicionamiento físico, Training y Kid Fit",
    roles: ["PROFESORA"],
  },
];

export interface ActividadDelElenco {
  codigo: string;
  nombre: string;
  descripcion: string;
  modalidad: modalidad_actividad;
  cupo_maximo: number;
  requiere_medidas: boolean;
  solo_menores?: boolean;
}

export const ACTIVIDADES: ActividadDelElenco[] = [
  {
    codigo: "FUNCIONAL",
    nombre: "Funcional",
    descripcion: "Trabajo de fuerza y resistencia mediante movimientos que emulan gestos cotidianos",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "ACONDICIONAMIENTO",
    nombre: "Acondicionamiento físico",
    descripcion: "Entrenamiento general orientado a mejorar la capacidad física y movilidad",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "POWER",
    nombre: "Power",
    descripcion: "Entrenamiento de sobrecarga y fuerza muscular",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "PERSONALIZADO",
    nombre: "Personalizado",
    descripcion: "Sesión de preparación física individualizada con seguimiento personal",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
    // La rutina individual parte del peso y la talla: la pre-inscripción los pide (US-05).
    requiere_medidas: true,
  },
  {
    codigo: "HIIT",
    nombre: "HIIT",
    descripcion: "Entrenamiento interválico de alta intensidad",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "TRAINING",
    nombre: "Training",
    descripcion: "Circuito de fuerza, acondicionamiento y potencia física",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "BOOTYBAND",
    nombre: "Bootyband",
    descripcion: "Trabajo focalizado con bandas de resistencia en glúteos y piernas",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "GAP",
    nombre: "GAP",
    descripcion: "Enfocado en el trabajo de glúteos, abdominales y piernas",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
  {
    codigo: "KID_FIT",
    nombre: "Kid Fit",
    descripcion: "Entrenamiento motriz y lúdico para niños y jóvenes",
    modalidad: "GRUPAL",
    cupo_maximo: 10,
    requiere_medidas: false,
    solo_menores: true,
  },
  {
    codigo: "COMBAT",
    nombre: "Combat",
    descripcion: "Entrenamiento cardiovascular inspirado en técnicas de combate",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    requiere_medidas: false,
  },
];

export interface BloqueDeGrilla {
  hora: string;
  codigoActividad: string;
  emailProfesora: string;
}

// Cada actividad la da siempre la misma profesora: una inscripción es de una actividad y de una
// profesora, y ninguna profesora tiene dos clases a la misma hora. Los totales por semana son los de
// la página pública (Funcional 13, Personalizado 8, HIIT 8, Acondicionamiento 5...).
const LUCIA_TARDE: BloqueDeGrilla[] = [
  { hora: "12:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "13:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "14:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "15:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "16:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "17:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
];

const LUNES_MIERCOLES_VIERNES: BloqueDeGrilla[] = [
  { hora: "07:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "08:00", codigoActividad: "ACONDICIONAMIENTO", emailProfesora: SOFIA },
  { hora: "09:00", codigoActividad: "PERSONALIZADO", emailProfesora: CARLA },
  { hora: "10:00", codigoActividad: "HIIT", emailProfesora: MARINA },
  ...LUCIA_TARDE,
  { hora: "16:00", codigoActividad: "PERSONALIZADO", emailProfesora: CARLA },
  { hora: "17:00", codigoActividad: "POWER", emailProfesora: MARINA },
  { hora: "18:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "19:00", codigoActividad: "TRAINING", emailProfesora: SOFIA },
  { hora: "20:00", codigoActividad: "HIIT", emailProfesora: MARINA },
  { hora: "21:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
];

const MARTES_JUEVES: BloqueDeGrilla[] = [
  { hora: "07:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
  { hora: "08:00", codigoActividad: "ACONDICIONAMIENTO", emailProfesora: SOFIA },
  { hora: "09:00", codigoActividad: "PERSONALIZADO", emailProfesora: CARLA },
  { hora: "10:00", codigoActividad: "HIIT", emailProfesora: MARINA },
  ...LUCIA_TARDE,
  { hora: "17:00", codigoActividad: "KID_FIT", emailProfesora: SOFIA },
  { hora: "18:00", codigoActividad: "BOOTYBAND", emailProfesora: CARLA },
  { hora: "19:00", codigoActividad: "GAP", emailProfesora: CARLA },
  { hora: "20:00", codigoActividad: "COMBAT", emailProfesora: MARINA },
  { hora: "21:00", codigoActividad: "FUNCIONAL", emailProfesora: LUCIA },
];

// De 1 (lunes) a 7 (domingo): incluye los bloques de 12 a 18 hs de Lucía todos los días para la presentación.
export const GRILLA: Record<number, BloqueDeGrilla[]> = {
  1: LUNES_MIERCOLES_VIERNES,
  2: MARTES_JUEVES,
  3: LUNES_MIERCOLES_VIERNES,
  4: MARTES_JUEVES,
  5: LUNES_MIERCOLES_VIERNES,
  6: LUCIA_TARDE,
  7: LUCIA_TARDE,
};

// El Training del viernes tiene un cupo propio, distinto del de la actividad (CA-07).
export const CUPO_TRAINING_VIERNES = 15;

export interface PlanDelElenco {
  nombre: string;
  tipo: "MENSUAL" | "CLASE_SUELTA";
  clases_por_semana: number | null;
  dias_gracia: number;
  profesora_unica: boolean;
  solo_menores?: boolean;
  codigoActividadExclusiva: string | null;
  // El precio de antes del aumento y el actual; el programado empieza a regir el mes que viene.
  precioAnterior: number;
  precioActual: number;
  precioProgramado?: number;
}

export const PLANES: PlanDelElenco[] = [
  {
    nombre: "Básico",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precioAnterior: 28000,
    precioActual: 32000,
  },
  {
    nombre: "Intermedio",
    tipo: "MENSUAL",
    clases_por_semana: 3,
    dias_gracia: 5,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precioAnterior: 33000,
    precioActual: 38000,
    precioProgramado: 42000,
  },
  {
    nombre: "Full",
    tipo: "MENSUAL",
    clases_por_semana: 5,
    dias_gracia: 5,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precioAnterior: 40000,
    precioActual: 46000,
  },
  {
    nombre: "Personalizado 2 días",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: true,
    codigoActividadExclusiva: "PERSONALIZADO",
    precioAnterior: 52000,
    precioActual: 60000,
  },
  {
    nombre: "Personalizado 3 días",
    tipo: "MENSUAL",
    clases_por_semana: 3,
    dias_gracia: 5,
    profesora_unica: true,
    codigoActividadExclusiva: "PERSONALIZADO",
    precioAnterior: 70000,
    precioActual: 80000,
  },
  {
    nombre: "Kid Fit",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: false,
    solo_menores: true,
    codigoActividadExclusiva: "KID_FIT",
    precioAnterior: 22000,
    precioActual: 25000,
  },
  {
    nombre: "Clase suelta",
    tipo: "CLASE_SUELTA",
    clases_por_semana: null,
    dias_gracia: 0,
    profesora_unica: false,
    codigoActividadExclusiva: null,
    precioAnterior: 7000,
    precioActual: 8000,
  },
];

// Cómo paga cada inscripción. "puntual" paga antes del vencimiento y "tarde" dentro de la gracia; los
// demás terminan en un estado que conviene ver en la presentación.
export type PerfilDePago =
  | "puntual"
  | "tarde"
  // Hoy está dentro de los días de gracia sin haber pagado.
  | "por_vencer"
  // Dejó de pagar hace más que la gracia.
  | "vencida"
  // Informó por transferencia el pago de hoy y la propietaria todavía no lo revisó.
  | "transferencia_pendiente"
  // Igual, pero hace dos días: ya supera las 24 horas para revisarla (US-17).
  | "transferencia_demorada"
  // Una transferencia rechazada en el historial, que después pagó en efectivo.
  | "transferencia_rechazada";

export type FormaDePago = "efectivo" | "transferencia";

export interface InscripcionDelElenco {
  plan: string;
  actividad: string;
  hora: string;
  // Días de la semana (1 a 5) entre los que tiene la actividad a esa hora; si no se indican, los primeros.
  dias?: number[];
  // Hace cuántos días empezó (y pagó la primera cuota). En una pre-inscripción, hace cuánto se cargó.
  inicioHaceDias: number;
  pago: PerfilDePago;
  forma: FormaDePago;
  promocion?: boolean;
  preinscripta?: boolean;
  baja?: { haceDias: number; motivo: motivo_baja; detalle: string };
}

export interface AlumnoDelElenco {
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  direccion: string;
  contacto: [string, string];
  // DNI del tutor, para los menores.
  dniTutor?: string;
  // Probabilidad de asistir a cada clase.
  asistencia: number;
  // Faltó a las últimas clases: lo muestra el reporte de inactivos (US-22).
  dejoDeVenir?: boolean;
  aptoMedico?: boolean;
  observaciones?: string;
  inscripciones: InscripcionDelElenco[];
}

export interface TutorDelElenco {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
}

// Tutores que no entrenan: la cuenta existe solo para seguir a sus menores (US-28).
export const TUTORES: TutorDelElenco[] = [
  {
    nombre: "Mariana",
    apellido: "López",
    dni: "30876543",
    email: "mariana.lopez@example.com",
    telefono: "388 450-1226",
    fecha_nacimiento: "1982-09-02",
    direccion: "Mitre 202",
  },
];

const PUNTUAL_EFECTIVO = { pago: "puntual", forma: "efectivo" } as const;
const PUNTUAL_TRANSFERENCIA = { pago: "puntual", forma: "transferencia" } as const;

const NOMBRES_LUCIA_TARDE: [string, string][] = [
  ["Belén", "Tapia"],
  ["Mauro", "Paredes"],
  ["Natalia", "Aramayo"],
  ["Cristian", "Farfán"],
  ["Yanina", "Aparicio"],
  ["Rodrigo", "Calisaya"],
  ["Melina", "Zambrano"],
  ["Gastón", "Condori"],
  ["Antonella", "Burgos"],
  ["Nahuel", "Tejerina"],
  ["Nadia", "Vilca"],
  ["Sebastián", "Gallardo"],
  ["Gisela", "Arias"],
  ["Bruno", "Velázquez"],
  ["Tamara", "Figueroa"],
  ["Darío", "Cárdenas"],
  ["Cinthia", "Nieva"],
  ["Lautaro", "Acuña"],
  ["Jessica", "Salas"],
  ["Iván", "Ledesma"],
  ["Karina", "Zárate"],
  ["Marcos", "Bustamante"],
  ["Solange", "Ponce"],
  ["Esteban", "Miranda"],
  ["Lorena", "Ibáñez"],
  ["Kevin", "Méndez"],
  ["Verónica", "Córdoba"],
  ["Adrián", "Peralta"],
  ["Priscila", "Duarte"],
  ["Maximiliano", "Correa"],
];

const ALUMNOS_POR_HORARIO_LUCIA_TARDE = 5;

function normalizarParaEmail(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// 5 alumnos activos por cada bloque de LUCIA_TARDE en los 7 días (Full lun-vie + Básico sáb-dom).
function alumnosDeLuciaTarde(): AlumnoDelElenco[] {
  return LUCIA_TARDE.flatMap(({ hora }, indiceHora) =>
    Array.from({ length: ALUMNOS_POR_HORARIO_LUCIA_TARDE }, (_, posicion) => {
      const indice = indiceHora * ALUMNOS_POR_HORARIO_LUCIA_TARDE + posicion;
      const [nombre, apellido] = NOMBRES_LUCIA_TARDE[indice];
      const numero = String(indice + 1).padStart(2, "0");
      const pago = indice % 2 === 0 ? PUNTUAL_EFECTIVO : PUNTUAL_TRANSFERENCIA;
      return {
        nombre,
        apellido,
        dni: `451000${numero}`,
        email: `${normalizarParaEmail(nombre)}.${normalizarParaEmail(apellido)}@example.com`,
        telefono: `388 490-01${numero}`,
        fecha_nacimiento: `199${indice % 10}-0${(indice % 9) + 1}-1${indice % 9}`,
        direccion: `Av. Éxodo ${300 + indice * 15}`,
        contacto: [`Familiar ${apellido}`, `388 490-02${numero}`] as [string, string],
        asistencia: 0.78,
        aptoMedico: true,
        inscripciones: [
          {
            plan: "Full",
            actividad: "FUNCIONAL",
            hora,
            dias: [1, 2, 3, 4, 5],
            inicioHaceDias: 20,
            ...pago,
          },
          {
            plan: "Básico",
            actividad: "FUNCIONAL",
            hora,
            dias: [6, 7],
            inicioHaceDias: 20,
            ...pago,
          },
        ],
      };
    }),
  );
}

export const ALUMNOS: AlumnoDelElenco[] = [
  // Las cuentas del login de prueba.
  {
    nombre: "Camila",
    apellido: "Pérez",
    dni: "35123456",
    email: "camila.perez@example.com",
    telefono: "388 461-0101",
    fecha_nacimiento: "1992-04-18",
    direccion: "Av. San Martín 123",
    contacto: ["Raúl Pérez", "388 461-0102"],
    asistencia: 0.92,
    aptoMedico: true,
    inscripciones: [
      { plan: "Intermedio", actividad: "FUNCIONAL", hora: "18:00", inicioHaceDias: 150, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Valentina",
    apellido: "López",
    dni: "40111333",
    email: "valentina.lopez@example.com",
    telefono: "388 462-3344",
    fecha_nacimiento: "1999-07-09",
    direccion: "Rivadavia 455",
    contacto: ["Susana López", "388 462-3345"],
    asistencia: 0.8,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "HIIT",
        hora: "20:00",
        dias: [1, 3],
        inicioHaceDias: 95,
        pago: "tarde",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Julián",
    apellido: "Fernández",
    dni: "38555111",
    email: "julian.fernandez@example.com",
    telefono: "388 463-8899",
    fecha_nacimiento: "1995-12-01",
    direccion: "Lavalle 77",
    contacto: ["Marta Fernández", "388 463-8800"],
    asistencia: 0.85,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "POWER",
        hora: "17:00",
        inicioHaceDias: 130,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Valentina",
    apellido: "Herrera",
    dni: "39222333",
    email: "valentina.herrera@example.com",
    telefono: "388 466-7788",
    fecha_nacimiento: "1998-03-25",
    direccion: "Ituzaingó 789",
    contacto: ["Marcos Herrera", "388 466-7789"],
    asistencia: 0.9,
    aptoMedico: true,
    // Dos planes vigentes a la vez: el grupal de la mañana y el personalizado.
    inscripciones: [
      { plan: "Intermedio", actividad: "FUNCIONAL", hora: "07:00", inicioHaceDias: 170, ...PUNTUAL_EFECTIVO },
      {
        plan: "Personalizado 2 días",
        actividad: "PERSONALIZADO",
        hora: "09:00",
        dias: [2, 4],
        inicioHaceDias: 60,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Micaela",
    apellido: "García",
    dni: "32987654",
    email: "micaela.garcia@example.com",
    telefono: "388 467-0401",
    fecha_nacimiento: "1990-01-15",
    direccion: "Alvear 310",
    contacto: ["Daniel García", "388 467-0402"],
    asistencia: 0.7,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "GAP",
        hora: "19:00",
        inicioHaceDias: 160,
        ...PUNTUAL_EFECTIVO,
        baja: { haceDias: 40, motivo: "ECONOMICO", detalle: "No puede sostener la cuota por ahora" },
      },
    ],
  },
  {
    nombre: "Paula",
    apellido: "Romero",
    dni: "31222333",
    email: "paula.romero@example.com",
    telefono: "388 455-6677",
    fecha_nacimiento: "1984-06-21",
    direccion: "Bv. San Juan 543",
    contacto: ["Héctor Romero", "388 455-6678"],
    asistencia: 0.85,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "BOOTYBAND",
        hora: "18:00",
        inicioHaceDias: 120,
        ...PUNTUAL_TRANSFERENCIA,
      },
      {
        plan: "Básico",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [1, 3],
        inicioHaceDias: 70,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Carlos",
    apellido: "Fernández",
    dni: "31888999",
    email: "carlos.fernandez@example.com",
    telefono: "388 433-3444",
    fecha_nacimiento: "1983-05-20",
    direccion: "Av. San Juan 740",
    contacto: ["Laura Fernández", "388 433-3445"],
    asistencia: 0.75,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "HIIT",
        hora: "20:00",
        inicioHaceDias: 140,
        pago: "tarde",
        forma: "efectivo",
      },
    ],
  },
  // Menores a cargo de sus tutores.
  {
    nombre: "Mateo",
    apellido: "Romero",
    dni: "52111222",
    email: null,
    telefono: null,
    fecha_nacimiento: "2015-11-03",
    direccion: "Bv. San Juan 543",
    contacto: ["Paula Romero", "388 455-6677"],
    dniTutor: "31222333",
    asistencia: 0.88,
    aptoMedico: true,
    inscripciones: [
      { plan: "Kid Fit", actividad: "KID_FIT", hora: "17:00", inicioHaceDias: 50, ...PUNTUAL_TRANSFERENCIA },
    ],
  },
  {
    nombre: "Sol",
    apellido: "Romero",
    dni: "56987123",
    email: null,
    telefono: null,
    fecha_nacimiento: "2017-08-30",
    direccion: "Bv. San Juan 543",
    contacto: ["Paula Romero", "388 455-6677"],
    dniTutor: "31222333",
    asistencia: 0,
    inscripciones: [
      {
        plan: "Kid Fit",
        actividad: "KID_FIT",
        hora: "17:00",
        inicioHaceDias: 1,
        preinscripta: true,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Mateo",
    apellido: "Fernández",
    dni: "52444555",
    email: null,
    telefono: null,
    fecha_nacimiento: "2013-09-14",
    direccion: "Av. San Juan 740",
    contacto: ["Carlos Fernández", "388 433-3444"],
    dniTutor: "31888999",
    asistencia: 0.9,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Kid Fit",
        actividad: "KID_FIT",
        hora: "17:00",
        inicioHaceDias: 140,
        pago: "tarde",
        forma: "efectivo",
      },
    ],
  },
  {
    nombre: "Lucía",
    apellido: "Benítez",
    dni: "53234567",
    email: null,
    telefono: null,
    fecha_nacimiento: "2012-07-20",
    direccion: "Mitre 202",
    contacto: ["Mariana López", "388 450-1226"],
    dniTutor: "30876543",
    asistencia: 0.93,
    aptoMedico: true,
    inscripciones: [
      { plan: "Kid Fit", actividad: "KID_FIT", hora: "17:00", inicioHaceDias: 110, ...PUNTUAL_TRANSFERENCIA },
    ],
  },
  {
    nombre: "Benjamín",
    apellido: "López",
    dni: "55321987",
    email: null,
    telefono: null,
    fecha_nacimiento: "2016-02-10",
    direccion: "Mitre 202",
    contacto: ["Mariana López", "388 450-1226"],
    dniTutor: "30876543",
    asistencia: 0.86,
    aptoMedico: true,
    inscripciones: [
      { plan: "Kid Fit", actividad: "KID_FIT", hora: "17:00", inicioHaceDias: 80, ...PUNTUAL_TRANSFERENCIA },
    ],
  },
  // El resto del centro.
  {
    nombre: "Sofía",
    apellido: "Medina",
    dni: "38111222",
    email: "sofia.medina@example.com",
    telefono: "388 411-2233",
    fecha_nacimiento: "1996-08-14",
    direccion: "Av. Colón 1234",
    contacto: ["Jorge Medina", "388 411-2234"],
    asistencia: 0,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "FUNCIONAL",
        hora: "18:00",
        dias: [1, 3],
        inicioHaceDias: 1,
        preinscripta: true,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Lucas",
    apellido: "Benítez",
    dni: "39777888",
    email: "lucas.benitez@example.com",
    telefono: "388 477-7888",
    fecha_nacimiento: "1997-11-23",
    direccion: "Bv. Chacabuco 320",
    contacto: ["Mirta Benítez", "388 477-7889"],
    // No falta nunca: es el que encabeza el ranking y junta las insignias.
    asistencia: 1,
    aptoMedico: true,
    inscripciones: [
      { plan: "Full", actividad: "FUNCIONAL", hora: "21:00", inicioHaceDias: 175, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Franco",
    apellido: "Navarro",
    dni: "39456123",
    email: "franco.navarro@example.com",
    telefono: "388 412-1201",
    fecha_nacimiento: "1998-05-15",
    direccion: "Belgrano 101",
    contacto: ["Elena Navarro", "388 412-1202"],
    asistencia: 0.88,
    aptoMedico: true,
    inscripciones: [
      { plan: "Full", actividad: "FUNCIONAL", hora: "21:00", inicioHaceDias: 120, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Santiago",
    apellido: "Medina",
    dni: "38456789",
    email: "santiago.medina@example.com",
    telefono: "388 412-1211",
    fecha_nacimiento: "1996-01-19",
    direccion: "Güemes 1111",
    contacto: ["Rosa Medina", "388 412-1212"],
    asistencia: 0.95,
    aptoMedico: true,
    inscripciones: [
      { plan: "Full", actividad: "FUNCIONAL", hora: "07:00", inicioHaceDias: 160, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Leandro",
    apellido: "Torres",
    dni: "37112244",
    email: "leandro.torres@example.com",
    telefono: "388 413-5521",
    fecha_nacimiento: "1994-10-02",
    direccion: "Independencia 58",
    contacto: ["Gisela Torres", "388 413-5522"],
    asistencia: 0.8,
    inscripciones: [
      { plan: "Full", actividad: "FUNCIONAL", hora: "07:00", inicioHaceDias: 85, ...PUNTUAL_TRANSFERENCIA },
    ],
  },
  {
    nombre: "Martín",
    apellido: "Morales",
    dni: "38789012",
    email: "martin.morales@example.com",
    telefono: "388 412-1203",
    fecha_nacimiento: "1996-03-12",
    direccion: "Rivadavia 303",
    contacto: ["Ana Morales", "388 412-1204"],
    asistencia: 0.8,
    dejoDeVenir: true,
    inscripciones: [
      { plan: "Intermedio", actividad: "TRAINING", hora: "19:00", inicioHaceDias: 100, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Rocío",
    apellido: "Castro",
    dni: "40567890",
    email: "rocio.castro@example.com",
    telefono: "388 412-1205",
    fecha_nacimiento: "1997-11-05",
    direccion: "Sarmiento 404",
    contacto: ["Pedro Castro", "388 412-1206"],
    asistencia: 0.5,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "BOOTYBAND",
        hora: "18:00",
        inicioHaceDias: 90,
        pago: "vencida",
        forma: "efectivo",
      },
    ],
  },
  {
    nombre: "Emiliano",
    apellido: "Sosa",
    dni: "42345678",
    email: "emiliano.sosa@example.com",
    telefono: "388 412-1207",
    fecha_nacimiento: "2000-09-18",
    direccion: "Urquiza 505",
    contacto: ["Claudia Sosa", "388 412-1208"],
    asistencia: 0.85,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "HIIT",
        hora: "20:00",
        inicioHaceDias: 75,
        pago: "transferencia_pendiente",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Tomás",
    apellido: "Herrera",
    dni: "37890123",
    email: "tomas.herrera@example.com",
    telefono: "388 412-1209",
    fecha_nacimiento: "1995-02-28",
    direccion: "Lavalle 606",
    contacto: ["Inés Herrera", "388 412-1210"],
    asistencia: 0.95,
    aptoMedico: true,
    observaciones: "Lesión de rodilla derecha en 2024: evitar saltos con carga",
    inscripciones: [
      {
        plan: "Personalizado 3 días",
        actividad: "PERSONALIZADO",
        hora: "16:00",
        inicioHaceDias: 130,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Julieta",
    apellido: "Domínguez",
    dni: "43123456",
    email: "julieta.dominguez@example.com",
    telefono: "388 412-1213",
    fecha_nacimiento: "2001-04-14",
    direccion: "Moreno 707",
    contacto: ["Sergio Domínguez", "388 412-1214"],
    asistencia: 0.9,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "GAP",
        hora: "19:00",
        inicioHaceDias: 85,
        promocion: true,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Agustín",
    apellido: "Giménez",
    dni: "39901234",
    email: "agustin.gimenez@example.com",
    telefono: "388 412-1215",
    fecha_nacimiento: "1998-10-30",
    direccion: "Alberdi 808",
    contacto: ["Norma Giménez", "388 412-1216"],
    asistencia: 0.75,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "FUNCIONAL",
        hora: "18:00",
        inicioHaceDias: 65,
        pago: "por_vencer",
        forma: "efectivo",
      },
    ],
  },
  {
    nombre: "Florencia",
    apellido: "Ortiz",
    dni: "41678901",
    email: "florencia.ortiz@example.com",
    telefono: "388 412-1217",
    fecha_nacimiento: "1999-12-08",
    direccion: "Castelli 909",
    contacto: ["Ricardo Ortiz", "388 412-1218"],
    asistencia: 0.95,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Personalizado 2 días",
        actividad: "PERSONALIZADO",
        hora: "09:00",
        dias: [1, 3],
        inicioHaceDias: 110,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Lucas",
    apellido: "Romero",
    dni: "40234567",
    email: "lucas.romero@example.com",
    telefono: "388 412-1219",
    fecha_nacimiento: "1997-06-22",
    direccion: "Paso 1010",
    contacto: ["Gloria Romero", "388 412-1220"],
    asistencia: 0.8,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "COMBAT",
        hora: "20:00",
        inicioHaceDias: 70,
        pago: "tarde",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Micaela",
    apellido: "Ríos",
    dni: "42789012",
    email: "micaela.rios@example.com",
    telefono: "388 412-1221",
    fecha_nacimiento: "2000-08-03",
    direccion: "Laprida 1212",
    contacto: ["Oscar Ríos", "388 412-1222"],
    asistencia: 0.85,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [2, 4],
        inicioHaceDias: 55,
        promocion: true,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Nicolás",
    apellido: "Vega",
    dni: "40123789",
    email: "nicolas.vega@example.com",
    telefono: "388 412-1223",
    fecha_nacimiento: "1997-05-25",
    direccion: "Gorriti 1313",
    contacto: ["Beatriz Vega", "388 412-1224"],
    asistencia: 0.8,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "POWER",
        hora: "17:00",
        inicioHaceDias: 45,
        pago: "transferencia_rechazada",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Daiana",
    apellido: "Silva",
    dni: "39345678",
    email: "daiana.silva@example.com",
    telefono: "388 412-1225",
    fecha_nacimiento: "1998-09-11",
    direccion: "Arenales 1414",
    contacto: ["Rubén Silva", "388 412-1227"],
    asistencia: 0.4,
    dejoDeVenir: true,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "HIIT",
        hora: "10:00",
        dias: [2, 4],
        inicioHaceDias: 100,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Gonzalo",
    apellido: "Fernández",
    dni: "41890123",
    email: "gonzalo.fernandez@example.com",
    telefono: "388 412-1228",
    fecha_nacimiento: "1999-03-07",
    direccion: "Juncal 1515",
    contacto: ["Alicia Fernández", "388 412-1229"],
    asistencia: 0.9,
    inscripciones: [
      { plan: "Intermedio", actividad: "TRAINING", hora: "19:00", inicioHaceDias: 30, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Ana Laura",
    apellido: "Quispe",
    dni: "36222111",
    email: "analaura.quispe@example.com",
    telefono: "388 414-2201",
    fecha_nacimiento: "1991-02-17",
    direccion: "Tucumán 250",
    contacto: ["Víctor Quispe", "388 414-2202"],
    asistencia: 0.85,
    aptoMedico: true,
    inscripciones: [
      { plan: "Intermedio", actividad: "FUNCIONAL", hora: "07:00", inicioHaceDias: 140, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Ramiro",
    apellido: "Mamaní",
    dni: "37444666",
    email: "ramiro.mamani@example.com",
    telefono: "388 414-2203",
    fecha_nacimiento: "1993-06-30",
    direccion: "Lamadrid 88",
    contacto: ["Elsa Mamaní", "388 414-2204"],
    asistencia: 0.7,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "FUNCIONAL",
        hora: "07:00",
        dias: [2, 4],
        inicioHaceDias: 120,
        pago: "tarde",
        forma: "efectivo",
      },
    ],
  },
  {
    nombre: "Celeste",
    apellido: "Cruz",
    dni: "38999000",
    email: "celeste.cruz@example.com",
    telefono: "388 414-2205",
    fecha_nacimiento: "1995-09-12",
    direccion: "Pellegrini 640",
    contacto: ["Hugo Cruz", "388 414-2206"],
    asistencia: 0.9,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [1, 3, 5],
        inicioHaceDias: 100,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Matías",
    apellido: "Vilte",
    dni: "40888777",
    email: "matias.vilte@example.com",
    telefono: "388 414-2207",
    fecha_nacimiento: "1998-01-08",
    direccion: "Senador Pérez 33",
    contacto: ["Rita Vilte", "388 414-2208"],
    asistencia: 0.8,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "HIIT",
        hora: "10:00",
        dias: [1, 3, 5],
        inicioHaceDias: 90,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Brenda",
    apellido: "Choque",
    dni: "42111999",
    email: "brenda.choque@example.com",
    telefono: "388 414-2209",
    fecha_nacimiento: "2000-11-21",
    direccion: "Jujuy 1180",
    contacto: ["Mirna Choque", "388 414-2210"],
    asistencia: 0.88,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "BOOTYBAND",
        hora: "18:00",
        inicioHaceDias: 60,
        promocion: true,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Ezequiel",
    apellido: "Tolaba",
    dni: "37666555",
    email: "ezequiel.tolaba@example.com",
    telefono: "388 414-2211",
    fecha_nacimiento: "1992-04-04",
    direccion: "Patricias Argentinas 15",
    contacto: ["Graciela Tolaba", "388 414-2212"],
    asistencia: 0.82,
    inscripciones: [
      { plan: "Intermedio", actividad: "FUNCIONAL", hora: "21:00", inicioHaceDias: 150, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Gabriela",
    apellido: "Mendoza",
    dni: "33555444",
    email: "gabriela.mendoza@example.com",
    telefono: "388 414-2213",
    fecha_nacimiento: "1987-07-27",
    direccion: "Belgrano 980",
    contacto: ["Javier Mendoza", "388 414-2214"],
    asistencia: 0.95,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Personalizado 2 días",
        actividad: "PERSONALIZADO",
        hora: "16:00",
        dias: [1, 3],
        inicioHaceDias: 40,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Jorge",
    apellido: "Álvarez",
    dni: "23111888",
    email: "jorge.alvarez@example.com",
    telefono: "388 414-2215",
    fecha_nacimiento: "1974-12-11",
    direccion: "25 de Mayo 410",
    contacto: ["Teresa Álvarez", "388 414-2216"],
    asistencia: 0.9,
    aptoMedico: true,
    observaciones: "Hipertensión controlada: cortar el trabajo si refiere mareos",
    inscripciones: [
      {
        plan: "Básico",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [1, 3],
        inicioHaceDias: 160,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Silvia",
    apellido: "Ramos",
    dni: "20777333",
    email: "silvia.ramos@example.com",
    telefono: "388 414-2217",
    fecha_nacimiento: "1968-05-19",
    direccion: "Corrientes 702",
    contacto: ["Alberto Ramos", "388 414-2218"],
    asistencia: 0.95,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [1, 3, 5],
        inicioHaceDias: 170,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Pablo",
    apellido: "Gutiérrez",
    dni: "35888222",
    email: "pablo.gutierrez@example.com",
    telefono: "388 414-2219",
    fecha_nacimiento: "1990-08-16",
    direccion: "Salta 321",
    contacto: ["Liliana Gutiérrez", "388 414-2220"],
    asistencia: 0.7,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "POWER",
        hora: "17:00",
        inicioHaceDias: 110,
        pago: "tarde",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Carolina",
    apellido: "Flores",
    dni: "36444999",
    email: "carolina.flores@example.com",
    telefono: "388 414-2221",
    fecha_nacimiento: "1993-03-03",
    direccion: "Güemes 455",
    contacto: ["Mario Flores", "388 414-2222"],
    asistencia: 0.85,
    inscripciones: [
      { plan: "Básico", actividad: "GAP", hora: "19:00", inicioHaceDias: 130, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Noelia",
    apellido: "Aguirre",
    dni: "39111444",
    email: "noelia.aguirre@example.com",
    telefono: "388 414-2223",
    fecha_nacimiento: "1996-10-28",
    direccion: "Las Heras 61",
    contacto: ["Ramón Aguirre", "388 414-2224"],
    asistencia: 0.7,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "COMBAT",
        hora: "20:00",
        inicioHaceDias: 95,
        pago: "por_vencer",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Facundo",
    apellido: "Rojas",
    dni: "41222555",
    email: "facundo.rojas@example.com",
    telefono: "388 414-2225",
    fecha_nacimiento: "1999-02-14",
    direccion: "Dorrego 870",
    contacto: ["Silvina Rojas", "388 414-2226"],
    asistencia: 0.85,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "TRAINING",
        hora: "19:00",
        inicioHaceDias: 60,
        pago: "transferencia_demorada",
        forma: "transferencia",
      },
    ],
  },
  {
    nombre: "Milagros",
    apellido: "Sánchez",
    dni: "43555666",
    email: "milagros.sanchez@example.com",
    telefono: "388 414-2227",
    fecha_nacimiento: "2002-06-06",
    direccion: "Av. Libertad 1500",
    contacto: ["Cecilia Sánchez", "388 414-2228"],
    asistencia: 0.9,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "HIIT",
        hora: "20:00",
        dias: [3, 5],
        inicioHaceDias: 25,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Diego",
    apellido: "Cardozo",
    dni: "38333777",
    email: "diego.cardozo@example.com",
    telefono: "388 414-2229",
    fecha_nacimiento: "1994-09-09",
    direccion: "Mendoza 77",
    contacto: ["Andrea Cardozo", "388 414-2230"],
    asistencia: 0.95,
    inscripciones: [
      { plan: "Intermedio", actividad: "FUNCIONAL", hora: "18:00", inicioHaceDias: 12, ...PUNTUAL_EFECTIVO },
    ],
  },
  {
    nombre: "Valeria",
    apellido: "Benítez",
    dni: "40999111",
    email: "valeria.benitez@example.com",
    telefono: "388 414-2231",
    fecha_nacimiento: "1997-12-19",
    direccion: "Rivadavia 92",
    contacto: ["Omar Benítez", "388 414-2232"],
    asistencia: 0,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "HIIT",
        hora: "10:00",
        dias: [1, 3, 5],
        inicioHaceDias: 2,
        preinscripta: true,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Hernán",
    apellido: "Cabrera",
    dni: "34777111",
    email: "hernan.cabrera@example.com",
    telefono: "388 414-2233",
    fecha_nacimiento: "1989-01-25",
    direccion: "San Martín 1290",
    contacto: ["Paola Cabrera", "388 414-2234"],
    asistencia: 0.8,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "FUNCIONAL",
        hora: "18:00",
        inicioHaceDias: 170,
        ...PUNTUAL_EFECTIVO,
        baja: { haceDias: 60, motivo: "MUDANZA", detalle: "Se mudó a San Salvador de Jujuy" },
      },
    ],
  },
  {
    nombre: "Romina",
    apellido: "Paz",
    dni: "37555222",
    email: "romina.paz@example.com",
    telefono: "388 414-2235",
    fecha_nacimiento: "1993-11-30",
    direccion: "Belgrano 45",
    contacto: ["Luis Paz", "388 414-2236"],
    asistencia: 0.75,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "BOOTYBAND",
        hora: "18:00",
        inicioHaceDias: 140,
        ...PUNTUAL_TRANSFERENCIA,
        baja: { haceDias: 20, motivo: "SALUD", detalle: "Embarazo: vuelve después del parto" },
      },
    ],
  },
  {
    nombre: "Federico",
    apellido: "Luna",
    dni: "39888333",
    email: "federico.luna@example.com",
    telefono: "388 414-2237",
    fecha_nacimiento: "1997-07-07",
    direccion: "Alem 310",
    contacto: ["Marisa Luna", "388 414-2238"],
    asistencia: 0.6,
    dejoDeVenir: true,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "FUNCIONAL",
        hora: "21:00",
        dias: [1, 3],
        inicioHaceDias: 75,
        pago: "tarde",
        forma: "efectivo",
      },
    ],
  },
  {
    nombre: "Abril",
    apellido: "Montenegro",
    dni: "44222333",
    email: "abril.montenegro@example.com",
    telefono: "388 414-2239",
    fecha_nacimiento: "2003-04-01",
    direccion: "Av. Bolivia 220",
    contacto: ["Fernanda Montenegro", "388 414-2240"],
    asistencia: 0.9,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Personalizado 2 días",
        actividad: "PERSONALIZADO",
        hora: "09:00",
        dias: [2, 4],
        inicioHaceDias: 20,
        ...PUNTUAL_TRANSFERENCIA,
      },
    ],
  },
  {
    nombre: "Ignacio",
    apellido: "Ríos",
    dni: "41000222",
    email: "ignacio.rios@example.com",
    telefono: "388 414-2241",
    fecha_nacimiento: "1999-10-15",
    direccion: "Laprida 1212",
    contacto: ["Oscar Ríos", "388 412-1222"],
    asistencia: 0.9,
    inscripciones: [
      {
        plan: "Intermedio",
        actividad: "HIIT",
        hora: "10:00",
        dias: [1, 3, 5],
        inicioHaceDias: 35,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  {
    nombre: "Patricia",
    apellido: "Gómez",
    dni: "18444777",
    email: "patricia.gomez@example.com",
    telefono: "388 414-2243",
    fecha_nacimiento: "1965-02-08",
    direccion: "Sarmiento 1020",
    contacto: ["Eduardo Gómez", "388 414-2244"],
    asistencia: 0.95,
    aptoMedico: true,
    inscripciones: [
      {
        plan: "Básico",
        actividad: "ACONDICIONAMIENTO",
        hora: "08:00",
        dias: [2, 4],
        inicioHaceDias: 150,
        ...PUNTUAL_EFECTIVO,
      },
    ],
  },
  ...alumnosDeLuciaTarde(),
];

// Valentina López pasa del Básico al Intermedio cuando termine la gracia de su cuota (US-14).
export const CAMBIO_DE_PLAN_PROGRAMADO = {
  dniAlumno: "40111333",
  plan: "Intermedio",
  actividad: "HIIT",
  hora: "20:00",
};

// Días en que la titular faltó y la cubrió otra profesora (US-24).
export const SUPLENCIAS = [
  { haceDias: 18, ausente: LUCIA, suplente: SOFIA, motivo: "Turno médico" },
  { haceDias: 33, ausente: CARLA, suplente: LUCIA, motivo: "Capacitación en Salta" },
];

// Clases que no se dieron (US-20).
export const CANCELACIONES = [
  { haceDias: 26, codigoActividad: "COMBAT", motivo: "Corte de luz en el barrio" },
  { haceDias: 47, codigoActividad: "TRAINING", motivo: "Fumigación del salón" },
];
