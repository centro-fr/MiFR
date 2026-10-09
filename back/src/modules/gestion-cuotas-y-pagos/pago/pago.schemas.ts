import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { montoSchema } from "../../../shared/utils/esquemas-numero.js";
import { textoOpcionalSchema, textoSchema } from "../../../shared/utils/esquemas-texto.js";

const monto = montoSchema("monto");
const observaciones = textoOpcionalSchema(255, { multilinea: true }).optional();
// US-15 y US-17: un monto distinto del esperado pasa solo si quien lo carga lo confirma.
const confirmar_monto_distinto = z.boolean().default(false);

// El momento en que se hizo la transferencia, con su zona horaria (ISO 8601). No puede ser
// futuro: todavía no pasó.
const fecha_hora_transferencia = z
  .string({ invalid_type_error: "La fecha y hora debe tener formato ISO 8601" })
  .datetime({ offset: true, message: "La fecha y hora debe tener formato ISO 8601, con zona horaria" })
  .transform((valor) => new Date(valor))
  .refine((fecha) => fecha <= new Date(), { message: "La transferencia no puede ser futura" });

export const registrarEfectivoSchema = z.object({
  id_inscripcion: idSchema,
  monto,
  confirmar_monto_distinto,
  observaciones,
});

// Sin comprobante adjunto (decisión de SPRINT-3.md): la propietaria lo busca en su extracto.
export const informarTransferenciaSchema = z.object({
  id_inscripcion: idSchema,
  monto,
  fecha_hora_transferencia,
  titular_cuenta_origen: textoOpcionalSchema(80).optional(),
  observaciones,
});

export const registrarTransferenciaRecibidaSchema = informarTransferenciaSchema.extend({
  confirmar_monto_distinto,
});

export const aprobarTransferenciaSchema = z.object({ confirmar_monto_distinto });

// ck_pagos_x2 del DER: el rechazo lleva motivo.
export const rechazarTransferenciaSchema = z.object({ motivo_rechazo: textoSchema(255) });

export const listarTransferenciasQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]).optional(),
  id_alumno: idDesdeTextoSchema.optional(),
});

export const pagoIdParamSchema = z.object({ id: idDesdeTextoSchema });

export type RegistrarEfectivoInput = z.infer<typeof registrarEfectivoSchema>;
export type InformarTransferenciaInput = z.infer<typeof informarTransferenciaSchema>;
export type RegistrarTransferenciaRecibidaInput = z.infer<typeof registrarTransferenciaRecibidaSchema>;
export type AprobarTransferenciaInput = z.infer<typeof aprobarTransferenciaSchema>;
export type RechazarTransferenciaInput = z.infer<typeof rechazarTransferenciaSchema>;
export type ListarTransferenciasQuery = z.infer<typeof listarTransferenciasQuerySchema>;
