import { z } from "zod";

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
