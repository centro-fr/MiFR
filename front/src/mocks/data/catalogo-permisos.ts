import type { RoleCode } from "@/types/auth";

// Copia de back/src/modules/gestion-usuarios/rol/rol.catalogo.ts y de los roles de
// back/prisma/seed.ts: el mock tiene que responder lo mismo que la API real.

export interface PermisoCatalogo {
  codigo: string;
  modulo: string;
  descripcion: string;
}

export const CATALOGO_PERMISOS: PermisoCatalogo[] = [
  { codigo: "SEGURIDAD_MATRIZ_VER", modulo: "SEGURIDAD", descripcion: "Ver la matriz de permisos por rol" },
  { codigo: "SEGURIDAD_MATRIZ_EDITAR", modulo: "SEGURIDAD", descripcion: "Modificar la matriz de permisos por rol" },
  { codigo: "USUARIOS_VER", modulo: "USUARIOS", descripcion: "Ver el listado de usuarios" },
  { codigo: "USUARIOS_EDITAR", modulo: "USUARIOS", descripcion: "Dar de alta, modificar y dar de baja usuarios y sus roles" },
  { codigo: "ACTIVIDADES_VER", modulo: "ACTIVIDADES", descripcion: "Ver las actividades y sus cupos" },
  { codigo: "ACTIVIDADES_EDITAR", modulo: "ACTIVIDADES", descripcion: "Dar de alta, modificar y dar de baja actividades" },
  { codigo: "HORARIOS_VER", modulo: "HORARIOS", descripcion: "Ver los horarios de las actividades" },
  { codigo: "HORARIOS_EDITAR", modulo: "HORARIOS", descripcion: "Asignar profesoras y horarios a las actividades" },
  { codigo: "ALUMNOS_VER", modulo: "ALUMNOS", descripcion: "Ver los alumnos y sus inscripciones" },
  { codigo: "ALUMNOS_EDITAR", modulo: "ALUMNOS", descripcion: "Inscribir, modificar y dar de baja alumnos" },
  { codigo: "PLANES_VER", modulo: "PLANES", descripcion: "Ver los planes y sus precios" },
  { codigo: "PLANES_EDITAR", modulo: "PLANES", descripcion: "Crear y modificar planes y precios" },
  { codigo: "PAGOS_REGISTRAR", modulo: "PAGOS", descripcion: "Registrar cobros en efectivo" },
  { codigo: "PAGOS_CONFIRMAR", modulo: "PAGOS", descripcion: "Confirmar o rechazar pagos" },
  { codigo: "PAGOS_RENDICION_VER", modulo: "PAGOS", descripcion: "Ver la rendición de efectivo" },
  { codigo: "HONORARIOS_VER_TODOS", modulo: "HONORARIOS", descripcion: "Ver las liquidaciones de todas las profesoras" },
  { codigo: "HONORARIOS_VER_PROPIOS", modulo: "HONORARIOS", descripcion: "Ver únicamente los honorarios propios" },
  { codigo: "HONORARIOS_LIQUIDAR", modulo: "HONORARIOS", descripcion: "Generar y cerrar liquidaciones" },
  { codigo: "ASISTENCIAS_MARCAR", modulo: "ASISTENCIAS", descripcion: "Tomar asistencia en las clases" },
  { codigo: "RUTINAS_VER", modulo: "RUTINAS", descripcion: "Ver las rutinas y el progreso de los alumnos" },
  { codigo: "RUTINAS_EDITAR", modulo: "RUTINAS", descripcion: "Crear y modificar rutinas de alumnos" },
  { codigo: "REPORTES_COBRANZA_VER", modulo: "REPORTES", descripcion: "Ver los reportes de cobranza" },
];

export const PERMISOS_EXCLUSIVOS_PROPIETARIA = new Set([
  "SEGURIDAD_MATRIZ_VER",
  "SEGURIDAD_MATRIZ_EDITAR",
  "PAGOS_CONFIRMAR",
  "PAGOS_RENDICION_VER",
  "HONORARIOS_VER_TODOS",
  "HONORARIOS_LIQUIDAR",
  "REPORTES_COBRANZA_VER",
]);

export const PERMISOS_CRITICOS = new Set([...PERMISOS_EXCLUSIVOS_PROPIETARIA, "USUARIOS_VER", "USUARIOS_EDITAR"]);

export const ROLES: { id_rol: number; codigo: RoleCode; nombre: string; descripcion: string }[] = [
  {
    id_rol: 1,
    codigo: "PROPIETARIA",
    nombre: "Propietaria",
    descripcion: "Administradora y dueña del centro de entrenamiento",
  },
  {
    id_rol: 2,
    codigo: "PROFESORA",
    nombre: "Profesora",
    descripcion: "Instructora que dicta clases y gestiona asistencias y rutinas",
  },
  { id_rol: 3, codigo: "ALUMNO", nombre: "Alumno", descripcion: "Persona que asiste al centro" },
  { id_rol: 4, codigo: "TUTOR", nombre: "Tutor", descripcion: "Responsable de un alumno menor de edad" },
];

export function matrizInicial(): Record<RoleCode, string[]> {
  return {
    PROPIETARIA: CATALOGO_PERMISOS.map((permiso) => permiso.codigo),
    // Como en el back: la profesora pre-inscribe alumnos (US-05) y cobra en efectivo (US-15).
    PROFESORA: [
      "ACTIVIDADES_VER",
      "HORARIOS_VER",
      "PLANES_VER",
      "ALUMNOS_VER",
      "ALUMNOS_EDITAR",
      "PAGOS_REGISTRAR",
      "ASISTENCIAS_MARCAR",
      "RUTINAS_VER",
      "RUTINAS_EDITAR",
      "HONORARIOS_VER_PROPIOS",
    ],
    ALUMNO: ["ACTIVIDADES_VER", "HORARIOS_VER"],
    TUTOR: ["ACTIVIDADES_VER", "HORARIOS_VER"],
  };
}
