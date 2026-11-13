import { z } from "zod";

// GET /notificaciones/mias, POST /notificaciones/:id/leida y POST /notificaciones/leidas
// (notificacion.openapi.ts del back). Solo piden sesión: el back toma el destinatario de ella.

export const TIPOS_NOTIFICACION = [
  "CUOTA_POR_VENCER",
  "CUOTA_VENCIDA",
  "BIENVENIDA",
] as const;

// Un tipo que el back sume más adelante no deja a la persona sin su bandeja: se muestra como aviso genérico.
const tipoNotificacionSchema = z.union([z.enum(TIPOS_NOTIFICACION), z.string().transform((): "OTRO" => "OTRO")]);

export const notificacionSchema = z.object({
  id_notificacion: z.number().int().positive(),
  tipo: tipoNotificacionSchema,
  // Solo en los avisos de cuota.
  id_cuota: z.number().int().positive().nullable(),
  id_alumno: z.number().int().positive().nullable().optional(),
  mensaje: z.string(),
  fecha_generacion: z.string().datetime({ offset: true }),
  leida: z.boolean(),
});

export const paginaNotificacionesSchema = z.object({
  datos: z.array(notificacionSchema),
  total: z.number().int().nonnegative(),
  no_leidas: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const notificacionesMarcadasSchema = z.object({ marcadas: z.number().int().nonnegative() });

export type Notificacion = z.infer<typeof notificacionSchema>;
export type TipoNotificacion = Notificacion["tipo"];
export type PaginaNotificaciones = z.infer<typeof paginaNotificacionesSchema>;
