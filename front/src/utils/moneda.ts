const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 25000 → "$ 25.000". */
export function formatearPrecio(precio: number): string {
  return FORMATO_PRECIO.format(precio);
}
