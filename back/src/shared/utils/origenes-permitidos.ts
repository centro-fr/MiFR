// CORS_ORIGENES es una lista separada por comas, por ejemplo
// "https://mifr.netlify.app,http://localhost:5173". Vacía o ausente devuelve undefined.
export function leerOrigenesPermitidos(valor: string | undefined): string[] | undefined {
  const origenes = (valor ?? "")
    .split(",")
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);
  return origenes.length > 0 ? origenes : undefined;
}
