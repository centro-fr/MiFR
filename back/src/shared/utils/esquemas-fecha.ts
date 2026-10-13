import { z } from "zod";

// Llega como AAAA-MM-DD y se guarda en una columna DATE: se convierte a las 00:00 UTC, que es
// como Prisma espera ese tipo. z.string().date() rechaza los días que no existen (2026-02-30).
export const fechaSchema = z
  .string({ invalid_type_error: "La fecha debe tener formato AAAA-MM-DD" })
  .date("La fecha debe tener formato AAAA-MM-DD")
  .transform((valor) => new Date(`${valor}T00:00:00Z`));
