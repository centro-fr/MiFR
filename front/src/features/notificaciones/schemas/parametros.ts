import { z } from "zod";

// GET /parametros y PATCH /parametros/:clave (parametros-sistema.openapi.ts del back). Solo la
// propietaria con PARAMETROS_EDITAR.

export const parametroSchema = z.object({
  clave: z.string(),
  tipo_dato: z.enum(["TEXTO", "ENTERO", "DECIMAL", "BOOLEANO"]),
  // Ya convertido a su tipo.
  valor: z.union([z.string(), z.number(), z.boolean()]),
  descripcion: z.string(),
  // null: todavía rige el valor inicial.
  fecha_actualizacion: z.string().nullable(),
});

export type Parametro = z.infer<typeof parametroSchema>;
