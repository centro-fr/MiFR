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

/** Los parámetros de los avisos automáticos (US-25 y US-26). */
export const CLAVES_AVISOS = {
  diasAviso: "DIAS_AVISO_VENCIMIENTO",
  horaResumen: "HORA_RESUMEN_DIARIO",
} as const;

export type CampoAvisos = keyof typeof CLAVES_AVISOS;

// Los mismos límites que valida el back (VALOR_POR_CLAVE en parametros-sistema.schemas.ts).
export const MAXIMO_DIAS_AVISO = 30;

export const configuracionAvisosSchema = z.object({
  diasAviso: z
    .string()
    .trim()
    .min(1, "Ingresá cuántos días antes avisar.")
    .regex(/^\d+$/, "Usá un número entero, sin decimales ni signos.")
    .refine((valor) => Number(valor) <= MAXIMO_DIAS_AVISO, `Como máximo ${MAXIMO_DIAS_AVISO} días.`),
  horaResumen: z
    .string()
    .trim()
    .min(1, "Elegí la hora del resumen.")
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Usá el formato HH:MM, entre 00:00 y 23:59."),
});

export type ConfiguracionAvisos = z.infer<typeof configuracionAvisosSchema>;

/** Lo que espera PATCH /parametros/:clave para cada campo: el entero como número, la hora como texto. */
export function valorParaElBack(campo: CampoAvisos, valores: ConfiguracionAvisos): number | string {
  return campo === "diasAviso" ? Number(valores.diasAviso) : valores.horaResumen;
}
