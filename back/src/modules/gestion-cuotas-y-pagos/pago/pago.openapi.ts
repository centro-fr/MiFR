import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  aprobarTransferenciaSchema,
  informarTransferenciaSchema,
  listarTransferenciasQuerySchema,
  pagoIdParamSchema,
  rechazarTransferenciaSchema,
  registrarEfectivoSchema,
  registrarTransferenciaRecibidaSchema,
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

const transferenciaEnRevisionSchema = transferenciaSchema
  .extend({
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
    cuota: z.object({ numero: z.number().int(), vencimiento: fechaSchema }),
    registrado_por: nombreSchema,
    profesora_cobra: nombreSchema.nullable(),
  })
  .openapi("Comprobante");

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
      "Rol ALUMNO o TUTOR: el alumno informa las suyas y el tutor las de sus menores (si no, 403). Queda " +
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
      `${propietariaConfirma} Ordenadas por antigüedad, con las horas desde que se cargaron y la marca de las ` +
      "pendientes que pasaron las 24 horas. Filtros por estado y alumno.",
    request: { query: listarTransferenciasQuerySchema },
    responses: {
      200: respuestaJson("Transferencias", z.array(transferenciaEnRevisionSchema)),
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
}
