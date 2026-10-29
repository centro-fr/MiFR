import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  aprobarTransferenciaSchema,
  efectivoPendienteQuerySchema,
  informarTransferenciaSchema,
  listarTransferenciasQuerySchema,
  pagoIdParamSchema,
  rechazarTransferenciaSchema,
  registrarEfectivoSchema,
  registrarTransferenciaRecibidaSchema,
  rendicionesQuerySchema,
  rendirLoteSchema,
  rendirPagoSchema,
} from "./pago.schemas.js";

const pagoSchema = z
  .object({
    id_pago: z.number().int(),
    id_cuota: z.number().int(),
    forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
    estado: z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]),
    monto: z.number(),
    fecha_pago: fechaSchema.openapi({ description: "Cuándo se registró el pago" }),
    titular_cuenta_origen: z.string().nullable(),
    fecha_hora_transferencia: fechaSchema.nullable(),
    id_usuario_registra: z.number().int(),
    id_profesora_cobra: z.number().int().nullable().openapi({ description: "Solo si cobró una profesora" }),
    rendido: z
      .boolean()
      .openapi({ description: "false: efectivo que una profesora todavía no rindió (US-19)" }),
    fecha_rendicion: fechaSchema.nullable(),
    id_usuario_confirma: z.number().int().nullable(),
    fecha_confirmacion: fechaSchema.nullable(),
    motivo_rechazo: z.string().nullable(),
    observaciones: z.string().nullable(),
  })
  .openapi("Pago");

const alumnoSchema = z.object({ id_alumno: z.number().int(), nombre: z.string(), apellido: z.string() });

const transferenciaSchema = pagoSchema.extend({ alumno: alumnoSchema }).openapi("Transferencia");

// También lo muestra el resumen diario de la propietaria (US-26).
export const transferenciaEnRevisionSchema = transferenciaSchema
  .extend({
    plan: z.string().openapi({ description: "El plan de la cuota que paga" }),
    monto_esperado: z
      .number()
      .openapi({ description: "El monto de la cuota, con el descuento si tuvo promoción" }),
    tipo: z.enum(["PRIMERA_CUOTA", "RENOVACION", "CUOTA_VENCIDA"]).openapi({
      description:
        "PRIMERA_CUOTA: la que da el alta. CUOTA_VENCIDA: se cargó después del vencimiento de la cuota " +
        "anterior. RENOVACION: el resto. Es el del momento de la carga, no la situación actual del alumno",
    }),
    horas_desde_la_carga: z.number().int(),
    supera_24_horas: z.boolean().openapi({ description: "Pendiente desde hace 24 horas o más (US-17)" }),
  })
  .openapi("TransferenciaEnRevision");

const nombreSchema = z.object({ nombre: z.string(), apellido: z.string() });

const comprobanteSchema = z
  .object({
    numero: z.number().int().openapi({ description: "El id del pago" }),
    fecha: fechaSchema,
    forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
    monto: z.number(),
    alumno: nombreSchema.extend({ dni: z.string().nullable() }),
    plan: z.string(),
    cuota: z.object({
      numero: z.number().int(),
      vencimiento: fechaSchema,
      monto: z.number().openapi({ description: "Lo que había que cobrar ese día, ya con el descuento" }),
    }),
    precio_lista: z
      .number()
      .nullable()
      .openapi({ description: "El precio del plan el día del cobro (US-12)" }),
    descuento: z.number().openapi({ description: "Lo que descontó la promoción; 0 si no tuvo (US-13)" }),
    promocion: z.object({ codigo: z.string(), nombre: z.string() }).nullable(),
    registrado_por: nombreSchema,
    profesora_cobra: nombreSchema.nullable(),
  })
  .openapi("Comprobante");

const cobroEnEfectivoSchema = z
  .object({
    id_pago: z.number().int(),
    monto: z.number(),
    fecha_pago: fechaSchema,
    fecha_rendicion: fechaSchema.nullable(),
    alumno: alumnoSchema,
    plan: z.string(),
    cuota: z.object({ numero: z.number().int(), vencimiento: fechaSchema }),
    profesora: nombreSchema.extend({ id_profesora: z.number().int() }),
  })
  .openapi("CobroEnEfectivo");

// También lo muestra el resumen diario de la propietaria (US-26).
export const cobroSinRendirSchema = cobroEnEfectivoSchema
  .omit({ fecha_rendicion: true })
  .extend({
    dias_sin_rendir: z.number().int().openapi({ description: "Días de Argentina desde el cobro hasta hoy" }),
  })
  .openapi("CobroSinRendir");

// También lo muestra el resumen diario de la propietaria (US-26).
export const totalDeProfesoraSchema = nombreSchema.extend({
  id_profesora: z.number().int(),
  cantidad: z.number().int(),
  total: z.number(),
});

const efectivoPendienteSchema = z
  .object({
    cantidad: z.number().int().openapi({ description: "Cobros sin rendir en total, para paginar" }),
    total: z.number(),
    profesoras: z.array(totalDeProfesoraSchema).openapi({
      description: "Cantidad y total de cada profesora, completos aunque el detalle esté paginado",
    }),
    cobros: z
      .array(cobroSinRendirSchema)
      .openapi({ description: "Una página, del cobro más viejo al más nuevo" }),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("EfectivoPendiente");

const resultadoRendicionSchema = z
  .object({
    rendidos: z.array(z.number().int()),
    cantidad: z.number().int(),
    total: z.number(),
    salteados: z.array(
      z.object({
        id_pago: z.number().int(),
        motivo: z.enum(["NO_EXISTE", "YA_RENDIDO", "NO_ES_EFECTIVO_DE_PROFESORA"]),
      }),
    ),
  })
  .openapi("ResultadoRendicion");

const paginaRendicionesSchema = z
  .object({
    datos: z.array(cobroEnEfectivoSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("PaginaRendiciones");

const montoDistinto =
  "Si el monto no es el precio vigente del plan responde 409 `MONTO_DISTINTO` con el esperado; para " +
  "registrarlo igual se manda `confirmar_monto_distinto: true`.";
const cuotaQueSeCobra =
  "La cuota se genera con el pago: cubre desde hoy, o desde el vencimiento vigente si un mensual paga por " +
  "adelantado. Con el alumno dado de baja o una transferencia pendiente de revisión responde 409.";
const propietariaConfirma = "Requiere el rol PROPIETARIA y el permiso `PAGOS_CONFIRMAR`.";
const transferenciaEjemplo = {
  id_inscripcion: 12,
  monto: 30000,
  fecha_hora_transferencia: "2026-10-09T10:30:00-03:00",
  titular_cuenta_origen: "Paula Romero",
};

export function registrarDocumentacionPagos(registro: OpenAPIRegistry): void {
  const tags = ["Pagos"];
  const security = SEGURIDAD_BEARER;
  const pago = respuestaJson("Pago", pagoSchema);

  registro.registerPath({
    method: "post",
    path: "/pagos/efectivo",
    tags,
    security,
    summary: "Registrar un cobro en efectivo (US-15)",
    description:
      "Requiere el permiso `PAGOS_REGISTRAR`. Cobra la profesora a cargo de la inscripción o la propietaria " +
      `(otra profesora recibe 403). ${cuotaQueSeCobra} ${montoDistinto} El primer pago de una pre-inscripción ` +
      "da el alta definitiva (US-07). Lo que cobra una profesora queda pendiente de rendición.",
    request: {
      body: cuerpoJson(
        registrarEfectivoSchema.openapi("RegistrarEfectivo", {
          example: { id_inscripcion: 12, monto: 30000 },
        }),
      ),
    },
    responses: { 201: pago, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/transferencia",
    tags,
    security,
    summary: "Informar una transferencia (US-16)",
    description:
      "Requiere el permiso `PAGOS_REGISTRAR`: la informa la profesora a cargo de la inscripción o la propietaria " +
      "(con otra inscripción, 403; el alumno y el tutor no la informan). Queda " +
      `PENDIENTE hasta que la revise la propietaria y no cambia la habilitación. ${cuotaQueSeCobra} La misma ` +
      "transferencia (alumno, monto y día) informada dos veces responde 409. Sin comprobante adjunto.",
    request: {
      body: cuerpoJson(
        informarTransferenciaSchema.openapi("InformarTransferencia", { example: transferenciaEjemplo }),
      ),
    },
    responses: { 201: pago, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/transferencia-recibida",
    tags,
    security,
    summary: "Registrar una transferencia ya recibida",
    description:
      `${propietariaConfirma} Para cuando la propietaria ya vio el ingreso en su cuenta, como la primera ` +
      "cuota de un alumno nuevo, que todavía no puede entrar al sistema. Queda CONFIRMADA y da el alta " +
      `definitiva. ${cuotaQueSeCobra} ${montoDistinto}`,
    request: {
      body: cuerpoJson(
        registrarTransferenciaRecibidaSchema.openapi("RegistrarTransferenciaRecibida", {
          example: transferenciaEjemplo,
        }),
      ),
    },
    responses: { 201: pago, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/pagos/mis-transferencias",
    tags,
    security,
    summary: "Mis transferencias",
    description:
      "Rol ALUMNO o TUTOR: las del alumno y, para un tutor, las de sus menores. De la más nueva a la más vieja.",
    responses: {
      200: respuestaJson("Transferencias", z.array(transferenciaSchema)),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/pagos/transferencias",
    tags,
    security,
    summary: "Transferencias para revisar (US-17)",
    description:
      `${propietariaConfirma} Por fecha de carga, las más viejas primero (\`orden=desc\` para las más nuevas), ` +
      "con las horas desde que se cargaron y la marca de las pendientes que pasaron las 24 horas. Filtros por " +
      "estado, alumno, tipo y días de carga (`desde` y `hasta`, inclusive). Paginado con `limit` (por defecto y " +
      "como máximo 100) y `offset`; `total` es la cantidad de las que coinciden. El filtro por tipo se calcula " +
      "sobre las que cumplen los otros filtros: si son más de 500 responde 400.",
    request: { query: listarTransferenciasQuerySchema },
    responses: {
      200: respuestaJson(
        "Transferencias",
        z
          .object({
            datos: z.array(transferenciaEnRevisionSchema),
            total: z.number().int(),
            limit: z.number().int(),
            offset: z.number().int(),
          })
          .openapi("PaginaTransferencias"),
      ),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/{id}/aprobar",
    tags,
    security,
    summary: "Aprobar una transferencia (US-17)",
    description:
      `${propietariaConfirma} Solo una transferencia PENDIENTE (si no, 409). Registra quién y cuándo, y si ` +
      `es el primer pago da el alta definitiva. ${montoDistinto}`,
    request: { params: pagoIdParamSchema, body: cuerpoJson(aprobarTransferenciaSchema) },
    responses: { 200: pago, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/{id}/rechazar",
    tags,
    security,
    summary: "Rechazar una transferencia (US-17)",
    description:
      `${propietariaConfirma} Solo una transferencia PENDIENTE (si no, 409), con motivo obligatorio. La ` +
      "cuota queda sin pago confirmado y el próximo pago la reusa.",
    request: {
      params: pagoIdParamSchema,
      body: cuerpoJson(
        rechazarTransferenciaSchema.openapi("RechazarTransferencia", {
          example: { motivo_rechazo: "No se encontró la transferencia en el extracto" },
        }),
      ),
    },
    responses: { 200: pago, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/pagos/{id}/comprobante",
    tags,
    security,
    summary: "Comprobante de un pago (US-15)",
    description:
      "Lo ven la propietaria, quien registró el pago y el alumno o su tutor (si no, 403). Solo de un pago " +
      "CONFIRMADO (si no, 409). El front lo arma para imprimir o guardar como PDF.",
    request: { params: pagoIdParamSchema },
    responses: {
      200: respuestaJson("Comprobante", comprobanteSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  const propietariaRinde =
    "Solo la propietaria: rol `PROPIETARIA` y el permiso `PAGOS_RENDICION_VER`. Se rinde el efectivo CONFIRMADO " +
    "que cobró una profesora; lo que cobra la propietaria nace rendido y no aparece.";

  registro.registerPath({
    method: "get",
    path: "/pagos/efectivo-pendiente",
    tags,
    security,
    summary: "Efectivo pendiente de rendición (US-19)",
    description:
      `${propietariaRinde} La cantidad y el total de cada profesora, también las dadas de baja, y en general, ` +
      "siempre completos; los cobros, paginados con `limit` (máximo 100) y `offset`, del más viejo al más nuevo, " +
      "con el alumno, el plan, la cuota y los días que llevan sin rendir. Filtros por profesora y por los días de " +
      "Argentina del cobro (`desde` y `hasta`, inclusive).",
    request: { query: efectivoPendienteQuerySchema },
    responses: {
      200: respuestaJson("Efectivo pendiente", efectivoPendienteSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/pagos/rendiciones",
    tags,
    security,
    summary: "Historial de lo rendido (US-19)",
    description:
      `${propietariaRinde} De la rendición más nueva a la más vieja, con los filtros del pendiente: \`desde\` y ` +
      "`hasta` se aplican a la fecha de la rendición. Paginado con `limit` (máximo 100) y `offset`.",
    request: { query: rendicionesQuerySchema },
    responses: {
      200: respuestaJson("Página de rendiciones", paginaRendicionesSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/{id}/rendir",
    tags,
    security,
    summary: "Rendir un cobro en efectivo (US-19)",
    description:
      `${propietariaRinde} Marca el cobro como rendido con la fecha de hoy. Ya rendido, o que no es efectivo ` +
      "de una profesora, responde 409. Quién rindió y las observaciones quedan en la auditoría.",
    request: {
      params: pagoIdParamSchema,
      body: cuerpoJson(
        rendirPagoSchema.openapi("RendirCobro", { example: { observaciones: "Entregó en mano" } }),
      ),
    },
    responses: {
      200: respuestaJson("Resultado de la rendición", resultadoRendicionSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/pagos/rendir",
    tags,
    security,
    summary: "Rendir varios cobros en efectivo (US-19)",
    description:
      `${propietariaRinde} Rinde todo lo pendiente de una profesora (\`id_profesora\`) o una lista de cobros ` +
      "(`ids_pagos`, hasta 100), en una sola operación. Los que no se pueden rendir se saltean y la respuesta " +
      "informa cuáles y por qué.",
    request: {
      body: cuerpoJson(rendirLoteSchema.openapi("RendirCobros", { example: { id_profesora: 3 } })),
    },
    responses: {
      200: respuestaJson("Resultado de la rendición", resultadoRendicionSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });
}
