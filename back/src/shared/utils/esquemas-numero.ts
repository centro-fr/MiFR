import { z } from "zod";

const MONTO_MAXIMO = 99_999_999.99;

// Montos de dinero en columnas NUMERIC(10,2) (precios, cuotas, pagos): mayor a 0, hasta lo que
// entra en la columna y con dos decimales como máximo, porque con más Postgres redondearía en
// silencio. La comparación tolera el error de los decimales en coma flotante (19.99 * 100).
export function montoSchema(nombre: string) {
  return z
    .number()
    .positive(`El ${nombre} tiene que ser mayor a 0`)
    .max(MONTO_MAXIMO, `El ${nombre} no puede superar ${MONTO_MAXIMO}`)
    .refine((valor) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6, {
      message: `El ${nombre} admite como máximo dos decimales`,
    });
}

// En JSON "-0" es un número válido y z.number().min(0) lo acepta, porque -0 >= 0. Se rechaza
// igual que un negativo: nadie escribe -0 a propósito y no debería llegar a la base.
export function enteroNoNegativoSchema(maximo: number) {
  return z
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(maximo, `No puede superar ${maximo}`)
    .refine((valor) => !Object.is(valor, -0), "No puede ser negativo");
}
