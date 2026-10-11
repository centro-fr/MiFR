import type { ActividadApi } from "@/features/actividades/schemas/actividad";
import type { ProfesoraApi } from "@/features/horarios/schemas/horario";
import type { RoleCode } from "@/types/auth";

// Copia de los datos de back/prisma/seed-demo.ts, para que el front muestre lo mismo con
// mocks que contra un back sembrado. Los ids dependen del orden de carga en la base real:
// acá son de ejemplo.

export interface UsuarioSemilla {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido: string;
  roles: RoleCode[];
}

export interface HorarioSemilla {
  id_horario: number;
  id_actividad: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
}

export const USUARIOS_SEMILLA: UsuarioSemilla[] = [
  { id_usuario: 1, email: "lucia.gomez@example.com", nombre: "Lucía", apellido: "Gómez", roles: ["PROFESORA"] },
  { id_usuario: 2, email: "carla.ruiz@example.com", nombre: "Carla", apellido: "Ruiz", roles: ["PROFESORA"] },
  {
    id_usuario: 3,
    email: "marina.sosa@example.com",
    nombre: "Marina",
    apellido: "Sosa",
    roles: ["PROPIETARIA", "PROFESORA"],
  },
];

// Usuario con el que arranca la sesión del mock: la propietaria multi-rol de la seed.
export const ID_USUARIO_SESION_INICIAL = 3;

const FECHA_ALTA = "2026-01-01T00:00:00.000Z";

export const PROFESORAS_SEMILLA: Omit<ProfesoraApi, "usuario">[] = [
  { id_profesora: 1, id_usuario: 1, especialidad: "Entrenamiento funcional", fecha_alta: FECHA_ALTA, fecha_baja: null },
  { id_profesora: 2, id_usuario: 2, especialidad: "Clases infantiles y GAP", fecha_alta: FECHA_ALTA, fecha_baja: null },
  {
    id_profesora: 3,
    id_usuario: 3,
    especialidad: "Entrenamiento personalizado",
    fecha_alta: FECHA_ALTA,
    fecha_baja: null,
  },
];

export const ACTIVIDADES_SEMILLA: ActividadApi[] = [
  {
    id_actividad: 1,
    codigo: "FUNCIONAL",
    nombre: "Funcional",
    descripcion: "Trabajo de fuerza y resistencia mediante movimientos que emulan gestos cotidianos",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 2,
    codigo: "HIIT",
    nombre: "HIIT",
    descripcion: "Entrenamiento interválico de alta intensidad",
    modalidad: "GRUPAL",
    cupo_maximo: 15,
    activo: true,
  },
  {
    id_actividad: 3,
    codigo: "GAP",
    nombre: "GAP",
    descripcion: "Enfocado en el trabajo de glúteos, abdominales y piernas",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 4,
    codigo: "RETO_3M",
    nombre: "Reto 3M",
    descripcion: "Programa grupal estructurado en tres meses para objetivos físicos",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 5,
    codigo: "ENTRENAMIENTO",
    nombre: "Entrenamiento",
    descripcion: "Sesión de preparación física general, personalizada según el horario",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
    activo: true,
  },
  {
    id_actividad: 6,
    codigo: "POSING",
    nombre: "Posing",
    descripcion: "Técnica de posado corporal asociada a competencias de fisicoculturismo",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 2,
    activo: true,
  },
  {
    id_actividad: 7,
    codigo: "INFANTIL",
    nombre: "Clase infantil",
    descripcion: "Entrenamiento funcional adaptado al público infantil",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    activo: true,
  },
];

export const HORARIOS_SEMILLA: HorarioSemilla[] = [
  { id_horario: 1, id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: null },
  { id_horario: 2, id_actividad: 1, id_profesora: 1, dia_semana: 3, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: null },
  { id_horario: 3, id_actividad: 7, id_profesora: 2, dia_semana: 2, hora_inicio: "17:00", hora_fin: "18:00", cupo_maximo: null },
  { id_horario: 4, id_actividad: 7, id_profesora: 2, dia_semana: 4, hora_inicio: "17:00", hora_fin: "18:00", cupo_maximo: null },
  { id_horario: 5, id_actividad: 2, id_profesora: 3, dia_semana: 5, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: 12 },
];

export interface PlanSemilla {
  id_plan: number;
  tipo: "MENSUAL" | "CLASE_SUELTA";
  nombre: string;
  descripcion: string | null;
  clases_por_semana: number | null;
  dias_gracia: number;
  id_actividad_exclusiva: number | null;
  profesora_unica: boolean;
  activo: boolean;
  precio: number;
}

export const PLANES_SEMILLA: PlanSemilla[] = [
  {
    id_plan: 1,
    tipo: "MENSUAL",
    nombre: "Plan Básico",
    descripcion: "Acceso a 2 veces por semana con una profesora",
    clases_por_semana: 2,
    dias_gracia: 5,
    id_actividad_exclusiva: null,
    profesora_unica: false,
    activo: true,
    precio: 25000,
  },
  {
    id_plan: 2,
    tipo: "MENSUAL",
    nombre: "Plan Intermedio",
    descripcion: "Acceso a 3 veces por semana con una profesora",
    clases_por_semana: 3,
    dias_gracia: 5,
    id_actividad_exclusiva: null,
    profesora_unica: false,
    activo: true,
    precio: 30000,
  },
  {
    id_plan: 3,
    tipo: "MENSUAL",
    nombre: "Plan 5 días",
    descripcion: "Entrenamiento de 5 veces por semana con una profesora",
    clases_por_semana: 5,
    dias_gracia: 5,
    id_actividad_exclusiva: null,
    profesora_unica: false,
    activo: true,
    precio: 42000,
  },
  {
    id_plan: 4,
    tipo: "MENSUAL",
    nombre: "Plan Premium",
    descripcion: "5 veces por semana + guía de alimentación y posing de sábados",
    clases_por_semana: 5,
    dias_gracia: 5,
    id_actividad_exclusiva: null,
    profesora_unica: false,
    activo: true,
    precio: 52000,
  },
  {
    id_plan: 5,
    tipo: "MENSUAL",
    nombre: "Plan Kids",
    descripcion: "Exclusivo de la clase infantil (adaptado para menores)",
    clases_por_semana: 2,
    dias_gracia: 5,
    id_actividad_exclusiva: 7,
    profesora_unica: false,
    activo: true,
    precio: 22000,
  },
  {
    id_plan: 6,
    tipo: "CLASE_SUELTA",
    nombre: "Clase particular",
    descripcion: "1 día único / pase individual",
    clases_por_semana: 1,
    dias_gracia: 0,
    id_actividad_exclusiva: null,
    profesora_unica: false,
    activo: true,
    precio: 6000,
  },
];

export interface AlumnoMockRegistro {
  id_alumno: number;
  id_usuario: number;
  id_responsable_menor: number | null;
  cont_emerg_nombre: string | null;
  cont_emerg_telefono: string | null;
  apto_medico: boolean;
  fecha_apto_medico: string | null;
  observaciones: string | null;
  estado: "ACTIVO" | "INACTIVO" | "BAJA";
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  direccion: string | null;
  // Tutor
  tutor_nombre?: string;
  tutor_apellido?: string;
  tutor_dni?: string;
  tutor_email?: string;
  tutor_telefono?: string;
  tutor_fecha_nacimiento?: string;
}

export const ALUMNOS_SEMILLA: AlumnoMockRegistro[] = [
  {
    id_alumno: 1,
    id_usuario: 101,
    id_responsable_menor: null,
    nombre: "Sofía",
    apellido: "Medina",
    dni: "38111222",
    email: "sofia.medina@example.com",
    telefono: "3514112233",
    fecha_nacimiento: "1996-08-14",
    direccion: "Av. Colón 1234",
    apto_medico: true,
    fecha_apto_medico: "2026-01-10",
    cont_emerg_nombre: "Mamá Sofía",
    cont_emerg_telefono: "3514998877",
    observaciones: "Pre-inscripta esperando confirmación de pago",
    estado: "INACTIVO",
  },
  {
    id_alumno: 2,
    id_usuario: 102,
    id_responsable_menor: 201,
    nombre: "Mateo",
    apellido: "Romero",
    dni: "52111222",
    email: null,
    telefono: null,
    fecha_nacimiento: "2015-11-03",
    direccion: "Bv. San Juan 543",
    apto_medico: true,
    fecha_apto_medico: "2026-02-01",
    cont_emerg_nombre: "Paula Romero",
    cont_emerg_telefono: "3515556677",
    observaciones: "Menor de edad, asiste por la tarde",
    estado: "INACTIVO",
    tutor_nombre: "Paula",
    tutor_apellido: "Romero",
    tutor_dni: "31222333",
    tutor_email: "paula.romero@example.com",
    tutor_telefono: "3515556677",
    tutor_fecha_nacimiento: "1984-06-21",
  },
  {
    id_alumno: 3,
    id_usuario: 103,
    id_responsable_menor: null,
    nombre: "Valentina",
    apellido: "Herrera",
    dni: "39222333",
    email: "valentina.herrera@example.com",
    telefono: "3516667788",
    fecha_nacimiento: "1998-03-25",
    direccion: "Ituzaingó 789",
    apto_medico: true,
    fecha_apto_medico: "2026-01-05",
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    observaciones: null,
    estado: "ACTIVO",
  },
];

export interface InscripcionMockRegistro {
  id_inscripcion: number;
  id_alumno: number;
  id_plan: number;
  id_profesora: number;
  ids_horarios: number[];
  estado: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
  fecha_inscripcion: string;
  fecha_inicio: string;
  sin_cargo: boolean;
  observaciones: string | null;
}

export const INSCRIPCIONES_SEMILLA: InscripcionMockRegistro[] = [
  {
    id_inscripcion: 1,
    id_alumno: 1,
    id_plan: 1, // Plan Básico
    id_profesora: 1,
    ids_horarios: [1, 2],
    estado: "PREINSCRIPTA",
    fecha_inscripcion: "2026-02-15",
    fecha_inicio: "2026-03-01",
    sin_cargo: false,
    observaciones: "Esperando primer pago",
  },
  {
    id_inscripcion: 2,
    id_alumno: 2,
    id_plan: 5, // Plan Kids (exclusivo para menores)
    id_profesora: 2,
    ids_horarios: [3, 4],
    estado: "PREINSCRIPTA",
    fecha_inscripcion: "2026-02-18",
    fecha_inicio: "2026-03-01",
    sin_cargo: false,
    observaciones: null,
  },
  {
    id_inscripcion: 3,
    id_alumno: 3,
    id_plan: 2, // Plan Intermedio
    id_profesora: 1,
    ids_horarios: [1, 2],
    estado: "ACTIVA",
    fecha_inscripcion: "2026-01-05",
    fecha_inicio: "2026-01-05",
    sin_cargo: false,
    observaciones: null,
  },
];

