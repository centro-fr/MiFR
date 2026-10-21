import type { CodigoRol } from "../usuario/usuario.types.js";

// Catálogo de roles del DER (roles.codigo): lo cargan los seeds en la tabla `roles`.
export const CATALOGO_ROLES: readonly { codigo: CodigoRol; nombre: string; descripcion: string }[] = [
  {
    codigo: "PROPIETARIA",
    nombre: "Propietaria",
    descripcion: "Administradora y dueña del centro de entrenamiento",
  },
  {
    codigo: "PROFESORA",
    nombre: "Profesora",
    descripcion: "Instructora que dicta clases y gestiona asistencias y rutinas",
  },
  { codigo: "ALUMNO", nombre: "Alumno", descripcion: "Persona que asiste al centro" },
  { codigo: "TUTOR", nombre: "Tutor", descripcion: "Responsable de un alumno menor de edad" },
];

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
  {
    codigo: "PARAMETROS_EDITAR",
    modulo: "PARAMETROS",
    descripcion: "Ver y modificar los parámetros del sistema",
  },
  { codigo: "PAGOS_REGISTRAR", modulo: "PAGOS", descripcion: "Registrar cobros en efectivo" },
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
  { codigo: "REPORTES_RANKING_VER", modulo: "REPORTES", descripcion: "Ver el ranking de asistencia" },
  {
    codigo: "INSIGNIAS_VER_PROPIAS",
    modulo: "INSIGNIAS",
    descripcion: "Ver la racha y las insignias propias o de un menor a cargo",
  },
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
  "PARAMETROS_EDITAR",
];

// El DER no tiene columna para marcarlos: la lista vive acá. La matriz no deja
// quitárselos a la propietaria, para que no pueda dejar al centro sin administración.
export const PERMISOS_CRITICOS: readonly CodigoPermiso[] = [
  ...PERMISOS_EXCLUSIVOS_PROPIETARIA,
  "USUARIOS_VER",
  "USUARIOS_EDITAR",
];

// Matriz con la que arranca el sistema; después la administra la propietaria.
// Lo de cada alumno se acota por pertenencia; el permiso solo abre la pantalla del portal. El ranking
// es la misma vista para todos los roles (US-30).
export const MATRIZ_INICIAL: Record<CodigoRol, readonly CodigoPermiso[]> = {
  PROPIETARIA: CATALOGO_PERMISOS.map((permiso) => permiso.codigo),
  // La profesora pre-inscribe alumnos (US-05): para eso necesita ver los planes y dar de alta al
  // alumno. Cambiar el plan o dar de baja sigue siendo de la propietaria, que lo exige por rol.
  // También cobra en efectivo a los alumnos a su cargo (US-15).
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
    "REPORTES_RANKING_VER",
  ],
  ALUMNO: ["ACTIVIDADES_VER", "HORARIOS_VER", "REPORTES_RANKING_VER", "INSIGNIAS_VER_PROPIAS"],
  TUTOR: ["ACTIVIDADES_VER", "HORARIOS_VER", "REPORTES_RANKING_VER", "INSIGNIAS_VER_PROPIAS"],
};

export function esPermisoCritico(codigo: string): boolean {
  return (PERMISOS_CRITICOS as readonly string[]).includes(codigo);
}

export function esPermisoExclusivoPropietaria(codigo: string): boolean {
  return (PERMISOS_EXCLUSIVOS_PROPIETARIA as readonly string[]).includes(codigo);
}
