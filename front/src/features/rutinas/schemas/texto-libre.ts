// Réplica de textoSchema del back (shared/utils/esquemas-texto.ts): sin caracteres de control y con al
// menos una letra. Así "20" en las notas de un ejercicio se marca en el formulario ("20 kg" sí pasa)
// en lugar de volver como un 400.

const CARACTER_NO_PERMITIDO = /[\p{Cc}\p{Cf}]/u;
const CARACTER_NO_PERMITIDO_MULTILINEA = /(?![\n\r])[\p{Cc}\p{Cf}]/u;
const LETRA = /\p{L}/u;

interface OpcionesTexto {
  maximo: number;
  multilinea?: boolean;
  /** Las repeticiones ("12", "8-10") usan textoBusquedaSchema, que no exige letras. */
  exigeLetra?: boolean;
}

/** null si el texto (ya sin espacios en los extremos y no vacío) lo acepta el back. */
export function problemaDelTexto(texto: string, { maximo, multilinea = false, exigeLetra = true }: OpcionesTexto): string | null {
  if (texto.length > maximo) return `Usá como máximo ${maximo} caracteres.`;
  if ((multilinea ? CARACTER_NO_PERMITIDO_MULTILINEA : CARACTER_NO_PERMITIDO).test(texto)) {
    return "Tiene caracteres no permitidos.";
  }
  return !exigeLetra || LETRA.test(texto) ? null : "Tiene que tener al menos una letra.";
}

/** Los textos opcionales vacíos viajan como null, como los guarda el back. */
export function textoOpcional(texto: string): string | null {
  const limpio = texto.trim();
  return limpio === "" ? null : limpio;
}
