/** Sin tildes ni mayúsculas: "Benítez" se encuentra buscando "benitez". */
export function normalizarParaBuscar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** "Sofía Medina" → "SM". */
export function inicialesDeNombre(nombreCompleto: string): string {
  return nombreCompleto
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}
