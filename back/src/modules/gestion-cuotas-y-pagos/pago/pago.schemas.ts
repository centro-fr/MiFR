import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { montoSchema } from "../../../shared/utils/esquemas-numero.js";
import { textoOpcionalSchema, textoSchema } from "../../../shared/utils/esquemas-texto.js";
import { fechaSchema } from "../../../shared/utils/esquemas-fecha.js";
import { LIMITE_MAXIMO, paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";

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
  id_promocion: idSchema.optional(),
  monto,
  confirmar_monto_distinto,
  observaciones,
});

// Sin comprobante adjunto (decisión de SPRINT-3.md): la propietaria lo busca en su extracto.
export const informarTransferenciaSchema = z.object({
  id_inscripcion: idSchema,
  id_promocion: idSchema.optional(),
  monto,
  fecha_hora_transferencia,
  titular_cuenta_origen: textoOpcionalSchema(80).optional(),
  observaciones,
});

export const registrarTransferenciaRecibidaSchema = informarTransferenciaSchema.extend({
  confirmar_monto_distinto,
});

// Aprobar normalmente no lleva cuerpo: sin él, Express 5 deja req.body undefined.
export const aprobarTransferenciaSchema = z.object({ confirmar_monto_distinto }).default({});

// ck_pagos_x2 del DER: el rechazo lleva motivo.
export const rechazarTransferenciaSchema = z.object({ motivo_rechazo: textoSchema(255) });

function rangoValido({ desde, hasta }: { desde?: Date; hasta?: Date }): boolean {
  return !desde || !hasta || desde <= hasta;
}

const RANGO_INVALIDO = { message: "La fecha desde no puede ser posterior a hasta", path: ["desde"] };

// US-17: por defecto, las más viejas primero, para respetar las 24 horas. desde y hasta son días de
// Argentina sobre la fecha de carga.
export const listarTransferenciasQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]).optional(),
    id_alumno: idDesdeTextoSchema.optional(),
    tipo: z.enum(["PRIMERA_CUOTA", "RENOVACION", "CUOTA_VENCIDA"]).optional(),
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    orden: z.enum(["asc", "desc"]).default("asc"),
    ...paginacionSchema(LIMITE_MAXIMO),
  })
  .refine(rangoValido, RANGO_INVALIDO);

export const pagoIdParamSchema = z.object({ id: idDesdeTextoSchema });

const filtroEfectivo = {
  id_profesora: idDesdeTextoSchema.optional(),
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
};

// US-19: los cobros sin rendir, por la fecha del cobro. El detalle se pagina (máximo 100 por pedido,
// seguridad.md, regla 8); los totales son siempre completos.
export const efectivoPendienteQuerySchema = z
  .object({ ...filtroEfectivo, ...paginacionSchema(LIMITE_MAXIMO) })
  .refine(rangoValido, RANGO_INVALIDO);

// US-19: el historial de lo rendido, por la fecha de la rendición.
export const rendicionesQuerySchema = z
  .object({ ...filtroEfectivo, ...paginacionSchema(LIMITE_MAXIMO) })
  .refine(rangoValido, RANGO_INVALIDO);

// Rendir normalmente no lleva cuerpo: sin él, Express 5 deja req.body undefined.
export const rendirPagoSchema = z.object({ observaciones }).default({});

// Un lote es todo lo pendiente de una profesora o una lista de cobros, nunca las dos cosas.
const MAXIMO_COBROS_POR_LOTE = LIMITE_MAXIMO;
export const rendirLoteSchema = z.union(
  [
    z.object({ id_profesora: idSchema, observaciones }).strict(),
    z
      .object({
        ids_pagos: z
          .array(idSchema)
          .min(1, "Indique al menos un cobro")
          .max(MAXIMO_COBROS_POR_LOTE, `No se pueden rendir más de ${MAXIMO_COBROS_POR_LOTE} cobros por vez`)
          .refine((ids) => new Set(ids).size === ids.length, "No se puede repetir un cobro"),
        observaciones,
      })
      .strict(),
  ],
  {
    errorMap: () => ({
      message: "Indique la profesora (id_profesora) o los cobros (ids_pagos), no las dos cosas",
    }),
  },
);

export type RegistrarEfectivoInput = z.infer<typeof registrarEfectivoSchema>;
export type InformarTransferenciaInput = z.infer<typeof informarTransferenciaSchema>;
export type RegistrarTransferenciaRecibidaInput = z.infer<typeof registrarTransferenciaRecibidaSchema>;
export type AprobarTransferenciaInput = z.infer<typeof aprobarTransferenciaSchema>;
export type RechazarTransferenciaInput = z.infer<typeof rechazarTransferenciaSchema>;
export type ListarTransferenciasQuery = z.infer<typeof listarTransferenciasQuerySchema>;
export type EfectivoPendienteQuery = z.infer<typeof efectivoPendienteQuerySchema>;
export type RendicionesQuery = z.infer<typeof rendicionesQuerySchema>;
export type RendirPagoInput = z.infer<typeof rendirPagoSchema>;
export type RendirLoteInput = z.infer<typeof rendirLoteSchema>;
