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
  { id_profesora: 2, id_usuario: 2, especialidad: "Pilates", fecha_alta: FECHA_ALTA, fecha_baja: null },
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
    nombre: "Funcional Grupal",
    descripcion: "Clase grupal de entrenamiento funcional",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
  },
  {
    id_actividad: 2,
    codigo: "PILATES_REF",
    nombre: "Pilates Reformer",
    descripcion: "Clase personalizada en máquina reformer",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
    activo: true,
  },
];

export const HORARIOS_SEMILLA: HorarioSemilla[] = [
  { id_horario: 1, id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: null },
  { id_horario: 2, id_actividad: 1, id_profesora: 1, dia_semana: 3, hora_inicio: "18:00", hora_fin: "19:00", cupo_maximo: null },
  { id_horario: 3, id_actividad: 2, id_profesora: 2, dia_semana: 2, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  { id_horario: 4, id_actividad: 2, id_profesora: 2, dia_semana: 4, hora_inicio: "09:00", hora_fin: "10:00", cupo_maximo: null },
  // Cupo propio del horario, distinto del de la actividad (CA-07).
  { id_horario: 5, id_actividad: 1, id_profesora: 3, dia_semana: 5, hora_inicio: "19:00", hora_fin: "20:00", cupo_maximo: 12 },
];
