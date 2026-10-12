import type { CambioPermiso, MatrizPermisos } from "@/types/permissions";
import type { RoleCode } from "@/types/auth";

// Tri-estado por módulo (lenguaje visual Stitch):
// 0 = Puede ver y modificar · 1 = Solo puede ver · 2 = Sin acceso.
// El back guarda booleanos por permiso, así que cada nivel se traduce a un
// conjunto canónico de valores: FULL = todo otorgado, VER = solo los de
// lectura, SIN = nada otorgado. Los bloqueados conservan el valor del servidor.
export type NivelAcceso = 0 | 1 | 2;

export const NIVEL_COMPLETO: NivelAcceso = 0;
export const NIVEL_LECTURA: NivelAcceso = 1;
export const NIVEL_SIN_ACCESO: NivelAcceso = 2;

export function siguienteNivel(nivel: NivelAcceso): NivelAcceso {
  return ((nivel + 1) % 3) as NivelAcceso;
}

// Permisos exclusivos de la propietaria.
// NOTA: los códigos (p. ej. PAGOS_*) son contrato interno con el back, no texto
// visible. La UI nunca debe mostrar "pago": ver etiquetas.ts y glosario.
// TODO(back): exponer `exclusivo` por permiso en GET /seguridad/matriz para
// no duplicar esta lista en el front.
export const EXCLUSIVOS_PROPIETARIA = new Set([
  "SEGURIDAD_MATRIZ_VER",
  "SEGURIDAD_MATRIZ_EDITAR",
  "PAGOS_CONFIRMAR",
  "PAGOS_RENDICION_VER",
  "HONORARIOS_VER_TODOS",
  "HONORARIOS_LIQUIDAR",
  "REPORTES_COBRANZA_VER",
]);

function esLectura(codigosDelModulo: string[], codigo: string): boolean {
  if (codigo.includes("_VER")) return true;
  // Módulos de un solo permiso de acción (ej. ASISTENCIAS_MARCAR): el nivel
  // "solo ver" equivale a otorgado, igual que "ver y modificar".
  return codigosDelModulo.length === 1;
}

/** Estado que muestra la celda según los valores efectivos en el servidor. */
export function derivarNivel(codigosDelModulo: string[], otorgados: Set<string>): NivelAcceso {
  const activos = codigosDelModulo.filter((codigo) => otorgados.has(codigo));
  if (activos.length === codigosDelModulo.length) return NIVEL_COMPLETO;
  if (activos.length === 0) return NIVEL_SIN_ACCESO;
  return NIVEL_LECTURA;
}

/** Valor canónico de un permiso para un nivel objetivo. */
export function valorCanonico(
  codigosDelModulo: string[],
  codigo: string,
  nivel: NivelAcceso,
): boolean {
  if (nivel === NIVEL_COMPLETO) return true;
  if (nivel === NIVEL_SIN_ACCESO) return false;
  return esLectura(codigosDelModulo, codigo);
}

function codigosDelModulo(matriz: MatrizPermisos, modulo: string): string[] {
  return matriz.modulos.find((m) => m.modulo === modulo)?.permisos.map((p) => p.codigo) ?? [];
}

/**
 * Permisos del módulo que la celda puede cambiar para ese rol. Un exclusivo de la propietaria
 * nunca se le otorga a otro rol (el back lo rechaza), así que queda fuera; salvo que ya lo
 * tenga por error, y entonces entra para poder revocarlo. El resto del módulo se edita
 * normalmente: así la profesora puede tener PAGOS_REGISTRAR aunque PAGOS_CONFIRMAR sea exclusivo.
 */
export function codigosEditables(matriz: MatrizPermisos, rol: RoleCode, modulo: string): string[] {
  const otorgados = new Set(matriz.matriz[rol]);
  return codigosDelModulo(matriz, modulo).filter(
    (codigo) => !EXCLUSIVOS_PROPIETARIA.has(codigo) || otorgados.has(codigo),
  );
}

/**
 * Permisos con los que se calcula el nivel que muestra la celda: los editables, o todos si
 * no queda ninguno (celda bloqueada), para que una celda sin acceso no se vea como completa.
 */
export function codigosDelNivel(matriz: MatrizPermisos, rol: RoleCode, modulo: string): string[] {
  const editables = codigosEditables(matriz, rol, modulo);
  return editables.length > 0 ? editables : codigosDelModulo(matriz, modulo);
}

/**
 * Motivo de bloqueo de la celda, o null si es editable. Espejo exacto del back,
 * más la regla de producto: la columna PROPIETARIA es de acceso total fijo y
 * nunca editable desde la UI (toda la columna bloqueada).
 */
export function motivoBloqueoCelda(
  matriz: MatrizPermisos,
  rol: RoleCode,
  modulo: string,
): string | null {
  if (rol === "PROPIETARIA") {
    return "Acceso total: la propietaria conserva todos los permisos y no se puede modificar";
  }
  const hayPermisos = codigosDelModulo(matriz, modulo).length > 0;
  if (hayPermisos && codigosEditables(matriz, rol, modulo).length === 0) {
    return "Permiso exclusivo de la propietaria";
  }
  return null;
}

/** Cambios atómicos para llevar una celda a un nivel (omite bloqueados e iguales). */
export function cambiosParaNivel(
  matriz: MatrizPermisos,
  rol: RoleCode,
  modulo: string,
  nivel: NivelAcceso,
): CambioPermiso[] {
  if (motivoBloqueoCelda(matriz, rol, modulo) !== null) return [];
  const codigos = codigosEditables(matriz, rol, modulo);
  const otorgados = new Set(matriz.matriz[rol]);
  const cambios: CambioPermiso[] = [];
  for (const codigo of codigos) {
    const objetivo = valorCanonico(codigos, codigo, nivel);
    if (objetivo !== otorgados.has(codigo)) {
      cambios.push({ rol, permiso: codigo, otorgado: objetivo });
    }
  }
  return cambios;
}

/** Valores resultantes por permiso si la celda quedara en un nivel. */
export function valoresParaNivel(
  matriz: MatrizPermisos,
  rol: RoleCode,
  modulo: string,
  nivel: NivelAcceso,
): Map<string, boolean> {
  const otorgados = new Set(matriz.matriz[rol]);
  // Los que la celda no puede cambiar conservan siempre el valor del servidor.
  const valores = new Map(codigosDelModulo(matriz, modulo).map((codigo) => [codigo, otorgados.has(codigo)]));
  if (motivoBloqueoCelda(matriz, rol, modulo) !== null) return valores;

  const editables = codigosEditables(matriz, rol, modulo);
  for (const codigo of editables) {
    valores.set(codigo, valorCanonico(editables, codigo, nivel));
  }
  return valores;
}

/** Dos niveles son indistinguibles si producen los mismos valores efectivos. */
export function nivelesEquivalentes(
  matriz: MatrizPermisos,
  rol: RoleCode,
  modulo: string,
  a: NivelAcceso,
  b: NivelAcceso,
): boolean {
  const va = valoresParaNivel(matriz, rol, modulo, a);
  const vb = valoresParaNivel(matriz, rol, modulo, b);
  return codigosDelModulo(matriz, modulo).every((codigo) => va.get(codigo) === vb.get(codigo));
}
