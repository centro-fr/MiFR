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
  { id_usuario: 1, email: "lucia.gomez@example.com", nombre: "Lucía", apellido: "Gómez", roles: ["PROFESORA"] },
  { id_usuario: 2, email: "carla.ruiz@example.com", nombre: "Carla", apellido: "Ruiz", roles: ["PROFESORA"] },
  {
    id_usuario: 3,
    email: "marina.sosa@example.com",
    nombre: "Marina",
    apellido: "Sosa",
    roles: ["PROPIETARIA", "PROFESORA"],
  },
  { id_usuario: 4, email: "camila.perez@example.com", nombre: "Camila", apellido: "Pérez", roles: ["ALUMNO"] },
  { id_usuario: 5, email: "valentina.lopez@example.com", nombre: "Valentina", apellido: "López", roles: ["ALUMNO"] },
  { id_usuario: 6, email: "julian.fernandez@example.com", nombre: "Julián", apellido: "Fernández", roles: ["ALUMNO"] },
  { id_usuario: 7, email: "micaela.garcia@example.com", nombre: "Micaela", apellido: "García", roles: ["ALUMNO"] },
  { id_usuario: 8, email: "mariana.lopez@example.com", nombre: "Mariana", apellido: "López", roles: ["TUTOR"] },
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
