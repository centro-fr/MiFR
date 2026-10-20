import { z } from "zod";

// GET /resumen-diario (US-26): resumen-diario-propietaria.openapi.ts del back. Solo se validan los
// campos que muestra la pantalla; el resto de cada objeto se descarta.

const personaSchema = z.object({ nombre: z.string(), apellido: z.string() });

const transferenciaSchema = z.object({
  id_pago: z.number().int(),
  monto: z.number(),
  horas_desde_la_carga: z.number().int(),
  alumno: personaSchema,
});

const transferenciasSchema = z.object({
  cantidad: z.number().int(),
  total: z.number(),
  supera_24_horas: z.number().int(),
  por_superar_24_horas: z.number().int(),
  // Las 5 más viejas.
  mas_antiguas: z.array(transferenciaSchema),
});

const efectivoSchema = z.object({
  cantidad: z.number().int(),
  total: z.number(),
  profesoras: z.array(personaSchema.extend({ id_profesora: z.number().int(), cantidad: z.number().int(), total: z.number() })),
  mas_antiguo: z
    .object({ id_pago: z.number().int(), monto: z.number(), dias_sin_rendir: z.number().int(), alumno: personaSchema, profesora: personaSchema })
    .nullable(),
});

const cuotasVencidasSchema = z.object({
  cantidad_alumnos: z.number().int(),
  monto_estimado: z.number(),
  // Vencidas que no suman al monto porque su plan no tiene precio hoy.
  sin_precio: z.number().int(),
  // Las 5 con más días de atraso.
  mas_atrasadas: z.array(
    z.object({
      id_inscripcion: z.number().int(),
      alumno: personaSchema,
      plan: z.object({ nombre: z.string() }),
      dias_vencida: z.number().int(),
    }),
  ),
});

export const BLOQUES_DEL_RESUMEN = ["transferencias", "efectivo", "cuotas_vencidas"] as const;

export const resumenDiarioSchema = z.object({
  // El día de Argentina, como DATE a las 00:00 UTC.
  fecha: z.string(),
  // Un bloque que no se pudo armar llega en null y figura en bloques_con_error.
  transferencias: transferenciasSchema.nullable(),
  efectivo: efectivoSchema.nullable(),
  cuotas_vencidas: cuotasVencidasSchema.nullable(),
  bloques_con_error: z.array(z.enum(BLOQUES_DEL_RESUMEN)),
  sin_novedades: z.boolean(),
});

export type ResumenDiario = z.infer<typeof resumenDiarioSchema>;
export type BloqueDelResumen = (typeof BLOQUES_DEL_RESUMEN)[number];
export type TransferenciasDelResumen = z.infer<typeof transferenciasSchema>;
export type EfectivoDelResumen = z.infer<typeof efectivoSchema>;
export type CuotasVencidasDelResumen = z.infer<typeof cuotasVencidasSchema>;
