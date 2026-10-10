import { z } from "zod";

// Ningún listado devuelve más de esto por pedido: una tabla que crece con el historial no puede
// llegar entera a una respuesta.
export const LIMITE_MAXIMO = 100;

// limit y offset de la query, que llegan como texto: solo dígitos, como los ids (validaciones.md).
export function paginacionSchema(limitePorDefecto: number) {
  return {
    limit: z
      .string()
      .regex(/^\d{1,3}$/, "limit inválido")
      .transform(Number)
      .pipe(z.number().int().min(1).max(LIMITE_MAXIMO))
      .default(String(limitePorDefecto)),
    offset: z
      .string()
      .regex(/^\d{1,9}$/, "offset inválido")
      .transform(Number)
      .default("0"),
  };
}

export interface Paginacion {
  limit: number;
  offset: number;
}
