import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { generarAvisosDeCuota } from "@/mocks/avisos";
import { db } from "@/mocks/db";
import type { UsuarioSemilla } from "@/mocks/data/semilla";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de GET/PATCH /parametros (parametros-sistema.routes.ts) y de las notificaciones propias
// (notificacion.routes.ts), con las respuestas de sus .openapi.ts.

// Lo que en el back hacen el intervalo de index.ts y la consulta de la campana.
function generarAvisosDelDia(): void {
  generarAvisosDeCuota();
}

// La sesión del mock es de `usuarios` y los avisos de cuota van a `usuariosPersonas` (los alumnos y
// tutores del DER): se reconoce a la persona por el email, como en mis-transferencias.
function idsDeLaPersona(usuario: UsuarioSemilla): number[] {
  const persona = db.usuariosPersonas.find((u) => u.email !== null && u.email === usuario.email);
  return persona ? [usuario.id_usuario, persona.id_usuario] : [usuario.id_usuario];
}

function notificacionesDe(usuario: UsuarioSemilla) {
  const ids = idsDeLaPersona(usuario);
  return db.notificaciones.filter((n) => ids.includes(n.id_usuario));
}

// NotificacionPropia: sin el destinatario.
function propia({ id_notificacion, tipo, id_cuota, id_alumno, mensaje, fecha_generacion, leida }: (typeof db.notificaciones)[number]) {
  return { id_notificacion, tipo, id_cuota, id_alumno: id_alumno ?? null, mensaje, fecha_generacion, leida };
}

// paginacionSchema(20) del back: limit de 1 a 100 y offset, los dos solo dígitos.
function paginacionDe(url: URL): { limit: number; offset: number } | null {
  const limit = url.searchParams.get("limit") ?? "20";
  const offset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,3}$/.test(limit) || !/^\d{1,9}$/.test(offset)) return null;
  const cantidad = Number(limit);
  return cantidad >= 1 && cantidad <= 100 ? { limit: cantidad, offset: Number(offset) } : null;
}

// Las no leídas primero y, en cada grupo, de la más nueva a la más vieja.
function enOrdenDeBandeja(a: (typeof db.notificaciones)[number], b: (typeof db.notificaciones)[number]): number {
  if (a.leida !== b.leida) return a.leida ? 1 : -1;
  return b.fecha_generacion.localeCompare(a.fecha_generacion) || b.id_notificacion - a.id_notificacion;
}

// VALOR_POR_CLAVE de parametros-sistema.schemas.ts: qué valor admite cada parámetro.
const entero = (minimo: number, maximo: number) => z.number().int().min(minimo).max(maximo);
const VALOR_POR_CLAVE: Record<string, z.ZodTypeAny> = {
  DATOS_BANCARIOS_CBU: z.string().trim().max(100),
  DATOS_BANCARIOS_ALIAS: z.string().trim().max(100),
  DATOS_BANCARIOS_TITULAR: z.string().trim().max(100),
  VENCIDOS_PUEDEN_ASISTIR: z.boolean(),
  MINUTOS_CIERRE_ASISTENCIA: entero(0, 1440),
  DIAS_RESERVA_PREINSCRIPCION: entero(0, 365),
  INASISTENCIAS_CONSECUTIVAS_INACTIVO: entero(1, 30),
  DIA_CIERRE_HONORARIOS: entero(1, 28),
};

const EDITAR_PARAMETROS = { rol: "PROPIETARIA", permiso: "PARAMETROS_EDITAR" } as const;

export const notificacionesHandlers = [
  // Push (suscripcion-push.routes.ts). Sin claves VAPID, como el back en desarrollo: en el modo con mocks
  // tampoco hay service worker propio (lo ocupa MSW), así que la tarjeta del perfil dice que no está disponible.
  http.get("*/api/v1/notificaciones/push/clave-publica", async ({ request }) => {
    await delay(150);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    return HttpResponse.json({ clave_publica: null });
  }),

  http.post("*/api/v1/notificaciones/push/suscripciones", async ({ request }) => {
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/notificaciones/push/suscripciones/baja", async ({ request }) => {
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("*/api/v1/notificaciones/mias", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const paginacion = paginacionDe(new URL(request.url));
    if (!paginacion) return idInvalido();
    generarAvisosDelDia();
    const propias = notificacionesDe(usuario).sort(enOrdenDeBandeja);
    return HttpResponse.json({
      datos: propias.slice(paginacion.offset, paginacion.offset + paginacion.limit).map(propia),
      total: propias.length,
      no_leidas: propias.filter((n) => !n.leida).length,
      ...paginacion,
    });
  }),

  http.post("*/api/v1/notificaciones/leidas", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const sinLeer = notificacionesDe(usuario).filter((n) => !n.leida);
    for (const notificacion of sinLeer) notificacion.leida = true;
    return HttpResponse.json({ marcadas: sinLeer.length });
  }),

  http.post("*/api/v1/notificaciones/:id/leida", async ({ request, params }) => {
    await delay(200);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    // Una de otra persona responde 404, igual que una que no existe.
    const notificacion = notificacionesDe(usuario).find((n) => n.id_notificacion === id);
    if (!notificacion) return errorApi(404, "NOT_FOUND", "Notificación no encontrada");
    notificacion.leida = true;
    return HttpResponse.json(propia(notificacion));
  }),

  http.get("*/api/v1/parametros", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, EDITAR_PARAMETROS);
    if (denegado) return denegado;
    return HttpResponse.json(db.parametros);
  }),

  http.patch("*/api/v1/parametros/:clave", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, EDITAR_PARAMETROS);
    if (denegado) return denegado;
    const parametro = db.parametros.find((p) => p.clave === params.clave);
    const esquema = typeof params.clave === "string" ? VALOR_POR_CLAVE[params.clave] : undefined;
    if (!parametro || !esquema) return errorApi(400, "VALIDATION_ERROR", "El parámetro no existe");
    const cuerpo = z.object({ valor: esquema }).safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "El valor no es válido para este parámetro");
    parametro.valor = cuerpo.data.valor as string | number | boolean;
    parametro.fecha_actualizacion = new Date().toISOString();
    return HttpResponse.json(parametro);
  }),
];
