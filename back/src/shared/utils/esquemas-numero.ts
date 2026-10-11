import { z } from "zod";

const MONTO_MAXIMO = 99_999_999.99;

// Con más de dos decimales, Postgres redondearía en silencio. La comparación tolera el error de los
// decimales en coma flotante (19.99 * 100).
function tieneComoMaximoDosDecimales(valor: number): boolean {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

// Montos de dinero en columnas NUMERIC(10,2) (precios, cuotas, pagos): mayor a 0, hasta lo que
// entra en la columna y con dos decimales como máximo.
export function montoSchema(nombre: string) {
  return z
    .number()
    .positive(`El ${nombre} tiene que ser mayor a 0`)
    .max(MONTO_MAXIMO, `El ${nombre} no puede superar ${MONTO_MAXIMO}`)
    .refine(tieneComoMaximoDosDecimales, {
      message: `El ${nombre} admite como máximo dos decimales`,
    });
}

// Medidas corporales (medidas_corporales.valor, NUMERIC(6,2)): entre un mínimo y un máximo razonables
// para la medida, que cortan errores de carga como poner la talla en metros, y con dos decimales.
// El nombre va con su artículo ("El peso", "La talla"), porque abre los mensajes.
export function medidaCorporalSchema(nombre: string, unidad: string, minimo: number, maximo: number) {
  return z
    .number({ invalid_type_error: `${nombre} tiene que ser un número` })
    .min(minimo, `${nombre} tiene que estar entre ${minimo} y ${maximo} ${unidad}`)
    .max(maximo, `${nombre} tiene que estar entre ${minimo} y ${maximo} ${unidad}`)
    .refine(tieneComoMaximoDosDecimales, { message: `${nombre} admite como máximo dos decimales` });
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
