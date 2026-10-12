/** Sin tildes ni mayúsculas: "Benítez" se encuentra buscando "benitez". */
export function normalizarParaBuscar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
