import { z } from "./zod.js";

// Las PK del DER son SERIAL (INTEGER de Postgres). Un id más grande no puede existir y Prisma
// lo rechaza con un error de conversión que terminaba en 500; se corta acá como dato inválido.
const MAXIMO_INTEGER = 2_147_483_647;

export const idSchema = z.number().int().positive().max(MAXIMO_INTEGER);

// Para params y query, que llegan como texto. Se exige el entero escrito en decimal y sin ceros
// adelante: convertir con Number() aceptaba "0x10", "1e1", " 7 " o "5.", y así una misma
// entidad respondía en varias URLs distintas.
export const idDesdeTextoSchema = z
  .string({ error: "id inválido" })
  .regex(/^[1-9]\d{0,9}$/, "id inválido")
  .transform(Number)
  .pipe(z.number().max(MAXIMO_INTEGER, "id inválido"));
