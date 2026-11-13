import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { listarNotificacionesQuerySchema, notificacionParamSchema } from "./notificacion.schemas.js";

const notificacionSchema = z
  .object({
    id_notificacion: z.number().int(),
    tipo: z.enum(["CUOTA_POR_VENCER", "CUOTA_VENCIDA", "RESUMEN_DIARIO", "BIENVENIDA", "CLASE_CANCELADA"]),
    id_cuota: z.number().int().nullable().openapi({ description: "Solo en los avisos de cuota" }),
    mensaje: z.string(),
    fecha_generacion: fechaSchema,
    leida: z.boolean(),
  })
  .openapi("Notificacion");

const paginaNotificacionesSchema = z
  .object({
    datos: z.array(notificacionSchema),
    total: z.number().int(),
    no_leidas: z.number().int().openapi({ description: "De todas las del usuario, no solo de esta página" }),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("PaginaNotificaciones");

export function registrarDocumentacionNotificaciones(registro: OpenAPIRegistry): void {
  const tags = ["Notificaciones"];
  const security = SEGURIDAD_BEARER;
  const soloSesion = "Requiere sesión, con cualquier rol: cada persona ve y marca solo las suyas.";

  registro.registerPath({
    method: "get",
    path: "/notificaciones/mias",
    tags,
    security,
    summary: "Mis notificaciones (US-25)",
    description:
      `${soloSesion} Primero las no leídas y, dentro de cada grupo, de la más nueva a la más vieja. ` +
      "Antes de responder se generan los avisos de cuota del día, si todavía no se generaron: el alumno, o su " +
      "tutor si tiene, recibe `CUOTA_POR_VENCER` al entrar en los `DIAS_AVISO_VENCIMIENTO` previos y " +
      "`CUOTA_VENCIDA` al vencer, una sola vez por cuota.",
    request: { query: listarNotificacionesQuerySchema },
    responses: {
      200: respuestaJson("Las notificaciones de quien pide", paginaNotificacionesSchema),
      ...respuestasDeError(400, 401),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/notificaciones/{id}/leida",
    tags,
    security,
    summary: "Marcar una notificación como leída",
    description: `${soloSesion} Una notificación de otra persona responde 404, igual que una que no existe.`,
    request: { params: notificacionParamSchema },
    responses: {
      200: respuestaJson("La notificación, leída", notificacionSchema),
      ...respuestasDeError(400, 401, 404),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/notificaciones/leidas",
    tags,
    security,
    summary: "Marcar todas mis notificaciones como leídas",
    description: soloSesion,
    responses: {
      200: respuestaJson(
        "Cuántas se marcaron",
        z.object({ marcadas: z.number().int() }).openapi("NotificacionesMarcadas"),
      ),
      ...respuestasDeError(401),
    },
  });
}
