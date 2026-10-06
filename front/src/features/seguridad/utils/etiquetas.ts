// Etiquetas visibles de la matriz. El glosario MiFR prohíbe "pago" en la
// interfaz: los códigos PAGOS_* del back se muestran como transferencias.
const MODULOS: Record<string, string> = {
  SEGURIDAD: "Seguridad",
  USUARIOS: "Usuarios",
  ACTIVIDADES: "Actividades",
  HORARIOS: "Horarios",
  ALUMNOS: "Alumnos",
  PLANES: "Planes",
  PAGOS: "Transferencias",
  HONORARIOS: "Honorarios",
  ASISTENCIAS: "Asistencias",
  RUTINAS: "Rutinas",
  REPORTES: "Reportes",
};

export function etiquetaModulo(modulo: string): string {
  return MODULOS[modulo] ?? modulo;
}

const DESCRIPCIONES: Record<string, string> = {
  SEGURIDAD: "Matriz de permisos y accesos del sistema",
  USUARIOS: "Alta, baja y roles de usuarios",
  ACTIVIDADES: "Catálogo de actividades y cupos",
  HORARIOS: "Cronograma y asignación de profesoras",
  ALUMNOS: "Inscripciones y legajos de alumnos",
  PLANES: "Planes, precios y promociones",
  PAGOS: "Transferencias y rendición de efectivo",
  HONORARIOS: "Liquidaciones de profesoras",
  ASISTENCIAS: "Toma de asistencia en clases",
  RUTINAS: "Rutinas y progreso físico",
  REPORTES: "Informes y estadísticas",
};

export function descripcionModulo(modulo: string): string {
  return DESCRIPCIONES[modulo] ?? "";
}

export function etiquetaPermiso(descripcion: string): string {
  return descripcion.replace(/pagos/i, "transferencias").replace(/Pagos/i, "Transferencias");
}
