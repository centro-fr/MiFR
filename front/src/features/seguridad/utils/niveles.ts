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

/**
 * Motivo de bloqueo de la celda, o null si es editable. Espejo exacto del back:
 * críticos no se quitan a la propietaria y exclusivos apagados no se otorgan
 * a otros roles (la celda entera se bloquea para no generar cambios inválidos).
 */
export function motivoBloqueoCelda(
  matriz: MatrizPermisos,
  rol: RoleCode,
  modulo: string,
): string | null {
  const permisos = matriz.modulos.find((m) => m.modulo === modulo)?.permisos ?? [];
  const otorgados = new Set(matriz.matriz[rol]);
  if (rol === "PROPIETARIA") {
    if (permisos.some((p) => p.critico)) {
      return "Permiso crítico: no se puede modificar a la propietaria";
    }
    return null;
  }
  const exclusivoApagado = permisos.some(
    (p) => EXCLUSIVOS_PROPIETARIA.has(p.codigo) && !otorgados.has(p.codigo),
  );
  if (exclusivoApagado) return "Permiso exclusivo de la propietaria";
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
  const permisos = matriz.modulos.find((m) => m.modulo === modulo)?.permisos ?? [];
  const codigos = permisos.map((p) => p.codigo);
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
  const permisos = matriz.modulos.find((m) => m.modulo === modulo)?.permisos ?? [];
  const codigos = permisos.map((p) => p.codigo);
  const otorgados = new Set(matriz.matriz[rol]);
  const valores = new Map<string, boolean>();
  for (const codigo of codigos) {
    valores.set(codigo, valorCanonico(codigos, codigo, nivel));
  }
  // Los bloqueados conservan siempre el valor del servidor.
  if (motivoBloqueoCelda(matriz, rol, modulo) !== null) {
    for (const codigo of codigos) valores.set(codigo, otorgados.has(codigo));
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
  const codigos = matriz.modulos.find((m) => m.modulo === modulo)?.permisos.map((p) => p.codigo) ?? [];
  return codigos.every((codigo) => va.get(codigo) === vb.get(codigo));
}
