import { z } from "zod";

export const alumnoDelPagoSchema = z.object({
  id_alumno: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string().nullable().optional(),
});

export const cuotaDelPagoSchema = z.object({
  numero: z.number().int().optional().default(1),
  vencimiento: z.string(),
});

export const profesoraDelPagoSchema = z.object({
  id_profesora: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
});

export const cobroSinRendirSchema = z.object({
  id_pago: z.number().int(),
  monto: z.number(),
  fecha_pago: z.string(),
  dias_sin_rendir: z.number().int(),
  alumno: alumnoDelPagoSchema,
  plan: z.string(),
  cuota: cuotaDelPagoSchema,
  profesora: profesoraDelPagoSchema,
});

export const totalDeProfesoraSchema = z.object({
  id_profesora: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  cantidad: z.number().int(),
  total: z.number(),
});

export const efectivoPendienteSchema = z.object({
  cantidad: z.number().int(),
  total: z.number(),
  profesoras: z.array(totalDeProfesoraSchema),
  cobros: z.array(cobroSinRendirSchema),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const cobroRendidoSchema = z.object({
  id_pago: z.number().int(),
  monto: z.number(),
  fecha_pago: z.string(),
  fecha_rendicion: z.string(),
  alumno: alumnoDelPagoSchema,
  plan: z.string(),
  cuota: cuotaDelPagoSchema,
  profesora: profesoraDelPagoSchema,
});

export const paginaRendicionesSchema = z.object({
  datos: z.array(cobroRendidoSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const resultadoRendicionSchema = z.object({
  rendidos: z.array(z.number().int()),
  cantidad: z.number().int(),
  total: z.number(),
  salteados: z.array(
    z.object({
      id_pago: z.number().int(),
      motivo: z.string(),
    })
  ),
});

export type CobroSinRendir = z.infer<typeof cobroSinRendirSchema>;
export type TotalDeProfesora = z.infer<typeof totalDeProfesoraSchema>;
export type EfectivoPendiente = z.infer<typeof efectivoPendienteSchema>;
export type CobroRendido = z.infer<typeof cobroRendidoSchema>;
export type PaginaRendiciones = z.infer<typeof paginaRendicionesSchema>;
export type ResultadoRendicion = z.infer<typeof resultadoRendicionSchema>;
