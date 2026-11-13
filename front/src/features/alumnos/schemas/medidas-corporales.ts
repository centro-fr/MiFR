import { z } from "zod";

// US-05: peso y talla, que se piden solo si alguna actividad de los horarios elegidos los requiere.
// Mismos rangos que medidaCorporalSchema del back (inscripcion.schemas.ts), para que el error se
// vea en el formulario y no como un rechazo del servidor al confirmar.

const tieneComoMaximoDosDecimales = (valor: number) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-9;

function medida(nombre: string, unidad: string, minimo: number, maximo: number) {
  const fueraDeRango = `${nombre} tiene que estar entre ${minimo} y ${maximo} ${unidad}`;
  return z
    .string()
    .trim()
    .min(1, `Ingresá ${nombre.toLowerCase()}`)
    // Se acepta la coma decimal ("65,5"), que es como se escribe en Argentina.
    .transform((valor) => Number(valor.replace(",", ".")))
    .pipe(
      z
        .number({ error: (issue) => (issue.input === undefined ? undefined : `${nombre} tiene que ser un número`) })
        .min(minimo, fueraDeRango)
        .max(maximo, fueraDeRango)
        .refine(tieneComoMaximoDosDecimales, `${nombre} admite como máximo dos decimales`),
    );
}

export const medidasCorporalesSchema = z.object({
  peso_kg: medida("El peso", "kg", 2, 400),
  talla_cm: medida("La talla", "cm", 40, 250),
});

export type MedidasCorporalesForm = z.input<typeof medidasCorporalesSchema>;
export type MedidasCorporales = z.output<typeof medidasCorporalesSchema>;

export const MEDIDAS_VACIAS: MedidasCorporalesForm = { peso_kg: "", talla_cm: "" };
