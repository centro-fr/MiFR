import type { CodigoRol } from "../usuario/user.types.js";

// Catálogo de permisos del sistema: lo carga el seed en la tabla `permisos` y lo usan
// las rutas en requierePermiso. El módulo es la columna permisos.modulo (el DER no
// tiene tabla de módulos). Largos: codigo VARCHAR(50), modulo VARCHAR(30).
export const CATALOGO_PERMISOS = [
  { codigo: "SEGURIDAD_MATRIZ_VER", modulo: "SEGURIDAD", descripcion: "Ver la matriz de permisos por rol" },
  {
    codigo: "SEGURIDAD_MATRIZ_EDITAR",
    modulo: "SEGURIDAD",
    descripcion: "Modificar la matriz de permisos por rol",
  },
  { codigo: "USUARIOS_VER", modulo: "USUARIOS", descripcion: "Ver el listado de usuarios" },
  {
    codigo: "USUARIOS_EDITAR",
    modulo: "USUARIOS",
    descripcion: "Dar de alta, modificar y dar de baja usuarios y sus roles",
  },
  { codigo: "ACTIVIDADES_VER", modulo: "ACTIVIDADES", descripcion: "Ver las actividades y sus cupos" },
  {
    codigo: "ACTIVIDADES_EDITAR",
    modulo: "ACTIVIDADES",
    descripcion: "Dar de alta, modificar y dar de baja actividades",
  },
  { codigo: "HORARIOS_VER", modulo: "HORARIOS", descripcion: "Ver los horarios de las actividades" },
  {
    codigo: "HORARIOS_EDITAR",
    modulo: "HORARIOS",
    descripcion: "Asignar profesoras y horarios a las actividades",
  },
  { codigo: "ALUMNOS_VER", modulo: "ALUMNOS", descripcion: "Ver los alumnos y sus inscripciones" },
  { codigo: "ALUMNOS_EDITAR", modulo: "ALUMNOS", descripcion: "Inscribir, modificar y dar de baja alumnos" },
  { codigo: "PLANES_VER", modulo: "PLANES", descripcion: "Ver los planes y sus precios" },
  { codigo: "PLANES_EDITAR", modulo: "PLANES", descripcion: "Crear y modificar planes y precios" },
  { codigo: "PAGOS_CONFIRMAR", modulo: "PAGOS", descripcion: "Confirmar o rechazar pagos" },
  { codigo: "PAGOS_RENDICION_VER", modulo: "PAGOS", descripcion: "Ver la rendición de efectivo" },
  {
    codigo: "HONORARIOS_VER_TODOS",
    modulo: "HONORARIOS",
    descripcion: "Ver las liquidaciones de todas las profesoras",
  },
  {
    codigo: "HONORARIOS_VER_PROPIOS",
    modulo: "HONORARIOS",
    descripcion: "Ver únicamente los honorarios propios",
  },
  { codigo: "HONORARIOS_LIQUIDAR", modulo: "HONORARIOS", descripcion: "Generar y cerrar liquidaciones" },
  { codigo: "ASISTENCIAS_MARCAR", modulo: "ASISTENCIAS", descripcion: "Tomar asistencia en las clases" },
  { codigo: "RUTINAS_VER", modulo: "RUTINAS", descripcion: "Ver las rutinas y el progreso de los alumnos" },
  { codigo: "RUTINAS_EDITAR", modulo: "RUTINAS", descripcion: "Crear y modificar rutinas de alumnos" },
  { codigo: "REPORTES_COBRANZA_VER", modulo: "REPORTES", descripcion: "Ver los reportes de cobranza" },
] as const;

export type CodigoPermiso = (typeof CATALOGO_PERMISOS)[number]["codigo"];

// Datos financieros y administración de la seguridad: solo la propietaria (US-02).
// La matriz no deja otorgárselos a otro rol.
export const PERMISOS_EXCLUSIVOS_PROPIETARIA: readonly CodigoPermiso[] = [
  "SEGURIDAD_MATRIZ_VER",
  "SEGURIDAD_MATRIZ_EDITAR",
  "PAGOS_CONFIRMAR",
  "PAGOS_RENDICION_VER",
  "HONORARIOS_VER_TODOS",
  "HONORARIOS_LIQUIDAR",
  "REPORTES_COBRANZA_VER",
];

// El DER no tiene columna para marcarlos: la lista vive acá. La matriz no deja
// quitárselos a la propietaria, para que no pueda dejar al centro sin administración.
export const PERMISOS_CRITICOS: readonly CodigoPermiso[] = [
  ...PERMISOS_EXCLUSIVOS_PROPIETARIA,
  "USUARIOS_VER",
  "USUARIOS_EDITAR",
];

// Matriz con la que arranca el sistema; después la administra la propietaria.
// Alumno y tutor no necesitan permisos para ver lo suyo: eso se resuelve por pertenencia.
export const MATRIZ_INICIAL: Record<CodigoRol, readonly CodigoPermiso[]> = {
  PROPIETARIA: CATALOGO_PERMISOS.map((permiso) => permiso.codigo),
  PROFESORA: [
    "ACTIVIDADES_VER",
    "HORARIOS_VER",
    "ALUMNOS_VER",
    "ASISTENCIAS_MARCAR",
    "RUTINAS_VER",
    "RUTINAS_EDITAR",
    "HONORARIOS_VER_PROPIOS",
  ],
  ALUMNO: ["ACTIVIDADES_VER", "HORARIOS_VER"],
  TUTOR: ["ACTIVIDADES_VER", "HORARIOS_VER"],
};

export function esPermisoCritico(codigo: string): boolean {
  return (PERMISOS_CRITICOS as readonly string[]).includes(codigo);
}

export function esPermisoExclusivoPropietaria(codigo: string): boolean {
  return (PERMISOS_EXCLUSIVOS_PROPIETARIA as readonly string[]).includes(codigo);
}
