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
  dni?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string;
  direccion?: string | null;
  estado?: "ACTIVO" | "INACTIVO";
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
  {
    id_usuario: 1,
    email: "lucia.gomez@example.com",
    nombre: "Lucía",
    apellido: "Gómez",
    roles: ["PROFESORA"],
    dni: "32111222",
    telefono: "11 4455-6677",
    fecha_nacimiento: "1992-05-10",
    direccion: "Av. Corrientes 1234",
  },
  {
    id_usuario: 2,
    email: "carla.ruiz@example.com",
    nombre: "Carla",
    apellido: "Ruiz",
    roles: ["PROFESORA"],
    dni: "34888999",
    telefono: "11 5566-7788",
    fecha_nacimiento: "1994-08-20",
    direccion: "Belgrano 567",
  },
  {
    id_usuario: 3,
    email: "marina.sosa@example.com",
    nombre: "Marina",
    apellido: "Sosa",
    roles: ["PROPIETARIA", "PROFESORA"],
    dni: "29444555",
    telefono: "11 6677-8899",
    fecha_nacimiento: "1988-03-15",
    direccion: "San Martín 890",
  },
  { id_usuario: 4, email: "camila.perez@example.com", nombre: "Camila", apellido: "Pérez", roles: ["ALUMNO"] },
  { id_usuario: 5, email: "valentina.lopez@example.com", nombre: "Valentina", apellido: "López", roles: ["ALUMNO"] },
  { id_usuario: 6, email: "julian.fernandez@example.com", nombre: "Julián", apellido: "Fernández", roles: ["ALUMNO"] },
  { id_usuario: 7, email: "micaela.garcia@example.com", nombre: "Micaela", apellido: "García", roles: ["ALUMNO"] },
  { id_usuario: 8, email: "mariana.lopez@example.com", nombre: "Mariana", apellido: "López", roles: ["TUTOR"] },
  {
    id_usuario: 9,
    email: "sofia.martinez@example.com",
    nombre: "Sofía",
    apellido: "Martínez",
    roles: ["PROFESORA"],
    estado: "ACTIVO",
    dni: "36777888",
    telefono: "11 3344-5566",
    fecha_nacimiento: "1996-11-25",
    direccion: "Mitre 432",
  },
];

// Usuario con el que arranca la sesión del mock: la propietaria multi-rol de la seed.
export const ID_USUARIO_SESION_INICIAL = 3;

const FECHA_ALTA = "2026-01-01T00:00:00.000Z";

export const PROFESORAS_SEMILLA: Omit<ProfesoraApi, "usuario">[] = [
  { id_profesora: 1, id_usuario: 1, especialidad: "Funcional, HIIT", fecha_alta: FECHA_ALTA, fecha_baja: null },
  { id_profesora: 2, id_usuario: 2, especialidad: "GAP, Kid Fit", fecha_alta: FECHA_ALTA, fecha_baja: null },
  {
    id_profesora: 3,
    id_usuario: 3,
    especialidad: "Personalizado",
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
    codigo: "ACONDICIONAMIENTO",
    nombre: "Acondicionamiento físico",
    descripcion: "Entrenamiento general orientado a mejorar la capacidad física y movilidad",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 5,
    codigo: "PERSONALIZADO",
    nombre: "Personalizado",
    descripcion: "Sesión de preparación física individualizada con seguimiento personal",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
    activo: true,
    requiere_medidas: true,
  },
  {
    id_actividad: 6,
    codigo: "TRAINING",
    nombre: "Training",
    descripcion: "Circuito de fuerza, acondicionamiento y potencia física",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 7,
    codigo: "KID_FIT",
    nombre: "Kid Fit",
    descripcion: "Entrenamiento motriz y lúdico para niños y jóvenes",
    modalidad: "GRUPAL",
    cupo_maximo: 12,
    activo: true,
  },
  {
    id_actividad: 8,
    codigo: "COMBAT",
    nombre: "Combat",
    descripcion: "Entrenamiento cardiovascular inspirado en técnicas de combate",
    modalidad: "GRUPAL",
    cupo_maximo: 15,
    activo: true,
  },
  {
    id_actividad: 9,
    codigo: "POWER",
    nombre: "Power",
    descripcion: "Entrenamiento de sobrecarga y fuerza muscular",
    modalidad: "GRUPAL",
    cupo_maximo: 15,
    activo: true,
  },
  {
    id_actividad: 10,
    codigo: "BOOTYBAND",
    nombre: "Bootyband",
    descripcion: "Trabajo focalizado con bandas de resistencia en glúteos y piernas",
    modalidad: "GRUPAL",
    cupo_maximo: 15,
    activo: true,
  },
];

export const HORARIOS_SEMILLA: HorarioSemilla[] = [
  // 08:00 a 09:00 - FUNCIONAL (Lunes a Viernes)
  { id_horario: 1, id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: null },
  { id_horario: 2, id_actividad: 1, id_profesora: 1, dia_semana: 2, hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: null },
  { id_horario: 3, id_actividad: 1, id_profesora: 1, dia_semana: 3, hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: null },
  { id_horario: 4, id_actividad: 1, id_profesora: 1, dia_semana: 4, hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: null },
  { id_horario: 5, id_actividad: 1, id_profesora: 1, dia_semana: 5, hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: null },

  // 09:00 a 10:00 - ACONDICIONAMIENTO FÍSICO (Lunes a Viernes)
  { id_horario: 6, id_actividad: 4, id_profesora: 1, dia_semana: 1, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  { id_horario: 7, id_actividad: 4, id_profesora: 1, dia_semana: 2, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  { id_horario: 8, id_actividad: 4, id_profesora: 1, dia_semana: 3, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  { id_horario: 9, id_actividad: 4, id_profesora: 1, dia_semana: 4, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  { id_horario: 10, id_actividad: 4, id_profesora: 1, dia_semana: 5, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },

  // 14:00 a 15:00 - POWER (L, X, V) / BOOTYBAND (M, J)
  { id_horario: 11, id_actividad: 9, id_profesora: 2, dia_semana: 1, hora_inicio: "14:00", hora_fin: "15:00", cupo_maximo: 15 },
  { id_horario: 12, id_actividad: 10, id_profesora: 2, dia_semana: 2, hora_inicio: "14:00", hora_fin: "15:00", cupo_maximo: 15 },
  { id_horario: 13, id_actividad: 9, id_profesora: 2, dia_semana: 3, hora_inicio: "14:00", hora_fin: "15:00", cupo_maximo: 15 },
  { id_horario: 14, id_actividad: 10, id_profesora: 2, dia_semana: 4, hora_inicio: "14:00", hora_fin: "15:00", cupo_maximo: 15 },
  { id_horario: 15, id_actividad: 9, id_profesora: 2, dia_semana: 5, hora_inicio: "14:00", hora_fin: "15:00", cupo_maximo: 15 },

  // 15:00 a 16:00 - PERSONALIZADO (L, X, V) / FUNCIONAL (M, J)
  { id_horario: 16, id_actividad: 5, id_profesora: 3, dia_semana: 1, hora_inicio: "15:00", hora_fin: "16:00", cupo_maximo: 4 },
  { id_horario: 17, id_actividad: 1, id_profesora: 1, dia_semana: 2, hora_inicio: "15:00", hora_fin: "16:00", cupo_maximo: null },
  { id_horario: 18, id_actividad: 5, id_profesora: 3, dia_semana: 3, hora_inicio: "15:00", hora_fin: "16:00", cupo_maximo: 4 },
  { id_horario: 19, id_actividad: 1, id_profesora: 1, dia_semana: 4, hora_inicio: "15:00", hora_fin: "16:00", cupo_maximo: null },
  { id_horario: 20, id_actividad: 5, id_profesora: 3, dia_semana: 5, hora_inicio: "15:00", hora_fin: "16:00", cupo_maximo: 4 },

  // 16:00 a 17:00 - HIIT (L, X, V) / GAP (M, J)
  { id_horario: 21, id_actividad: 2, id_profesora: 1, dia_semana: 1, hora_inicio: "16:00", hora_fin: "17:00", cupo_maximo: 15 },
  { id_horario: 22, id_actividad: 3, id_profesora: 2, dia_semana: 2, hora_inicio: "16:00", hora_fin: "17:00", cupo_maximo: null },
  { id_horario: 23, id_actividad: 2, id_profesora: 1, dia_semana: 3, hora_inicio: "16:00", hora_fin: "17:00", cupo_maximo: 15 },
  { id_horario: 24, id_actividad: 3, id_profesora: 2, dia_semana: 4, hora_inicio: "16:00", hora_fin: "17:00", cupo_maximo: null },
  { id_horario: 25, id_actividad: 2, id_profesora: 1, dia_semana: 5, hora_inicio: "16:00", hora_fin: "17:00", cupo_maximo: 15 },

  // 17:00 a 18:00 - KID FIT (M, J)
  { id_horario: 26, id_actividad: 7, id_profesora: 2, dia_semana: 2, hora_inicio: "17:00", hora_fin: "18:00", cupo_maximo: 12 },
  { id_horario: 27, id_actividad: 7, id_profesora: 2, dia_semana: 4, hora_inicio: "17:00", hora_fin: "18:00", cupo_maximo: 12 },

  // 18:00 a 19:00 - PERSONALIZADO (Lunes a Viernes)
  { id_horario: 28, id_actividad: 5, id_profesora: 3, dia_semana: 1, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: 4 },
  { id_horario: 29, id_actividad: 5, id_profesora: 3, dia_semana: 2, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: 4 },
  { id_horario: 30, id_actividad: 5, id_profesora: 3, dia_semana: 3, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: 4 },
  { id_horario: 31, id_actividad: 5, id_profesora: 3, dia_semana: 4, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: 4 },
  { id_horario: 32, id_actividad: 5, id_profesora: 3, dia_semana: 5, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: 4 },

  // 19:00 a 20:00 - TRAINING (L, X, V) / HIIT (M, J)
  { id_horario: 33, id_actividad: 6, id_profesora: 1, dia_semana: 1, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: null },
  { id_horario: 34, id_actividad: 2, id_profesora: 3, dia_semana: 2, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: 15 },
  { id_horario: 35, id_actividad: 6, id_profesora: 1, dia_semana: 3, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: null },
  { id_horario: 36, id_actividad: 2, id_profesora: 3, dia_semana: 4, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: 15 },
  { id_horario: 37, id_actividad: 6, id_profesora: 1, dia_semana: 5, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: null },

  // 20:00 a 21:00 - HIIT (L, X, V) / COMBAT (M, J)
  { id_horario: 38, id_actividad: 2, id_profesora: 1, dia_semana: 1, hora_inicio: "20:00", hora_fin: "21:00", cupo_maximo: 15 },
  { id_horario: 39, id_actividad: 8, id_profesora: 2, dia_semana: 2, hora_inicio: "20:00", hora_fin: "21:00", cupo_maximo: 15 },
  { id_horario: 40, id_actividad: 2, id_profesora: 1, dia_semana: 3, hora_inicio: "20:00", hora_fin: "21:00", cupo_maximo: 15 },
  { id_horario: 41, id_actividad: 8, id_profesora: 2, dia_semana: 4, hora_inicio: "20:00", hora_fin: "21:00", cupo_maximo: 15 },
  { id_horario: 42, id_actividad: 2, id_profesora: 1, dia_semana: 5, hora_inicio: "20:00", hora_fin: "21:00", cupo_maximo: 15 },

  // 21:00 a 22:00 - FUNCIONAL (L, X, V)
  { id_horario: 43, id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "21:00", hora_fin: "22:00", cupo_maximo: null },
  { id_horario: 44, id_actividad: 1, id_profesora: 1, dia_semana: 3, hora_inicio: "21:00", hora_fin: "22:00", cupo_maximo: null },
  { id_horario: 45, id_actividad: 1, id_profesora: 1, dia_semana: 5, hora_inicio: "21:00", hora_fin: "22:00", cupo_maximo: null },

  // 22:00 a 23:00 - FUNCIONAL (L, X, V)
  { id_horario: 46, id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "22:00", hora_fin: "23:00", cupo_maximo: null },
  { id_horario: 47, id_actividad: 1, id_profesora: 1, dia_semana: 3, hora_inicio: "22:00", hora_fin: "23:00", cupo_maximo: null },
  { id_horario: 48, id_actividad: 1, id_profesora: 1, dia_semana: 5, hora_inicio: "22:00", hora_fin: "23:00", cupo_maximo: null },
];
