import { z } from "zod";

// Las PK del DER son SERIAL (INTEGER de Postgres). Un id más grande no puede existir y Prisma
// lo rechaza con un error de conversión que terminaba en 500; se corta acá como dato inválido.
const MAXIMO_INTEGER = 2_147_483_647;

export const idSchema = z.number().int().positive().max(MAXIMO_INTEGER);

// Para params y query, que llegan como texto.
export const idDesdeTextoSchema = z.coerce
  .number({ invalid_type_error: "id inválido" })
  .int("id inválido")
  .positive("id inválido")
  .max(MAXIMO_INTEGER, "id inválido");
