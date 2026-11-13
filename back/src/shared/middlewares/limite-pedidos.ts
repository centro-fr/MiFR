import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";

export interface LimiteDePedidos {
  ventanaMs: number;
  maximo: number;
}

export interface LimitesDePedidos {
  api: LimiteDePedidos;
  publico: LimiteDePedidos;
  inicioSesion: LimiteDePedidos;
}

const UN_MINUTO_MS = 60_000;

// Topes por IP. Varias personas pueden compartir la IP del wifi del centro, así que alcanzan para un
// grupo entero usando el sistema a la vez; lo que cortan es un script que manda pedidos sin parar.
export const LIMITES_DE_PEDIDOS: LimitesDePedidos = {
  api: { ventanaMs: UN_MINUTO_MS, maximo: 600 },
  // Una visita a la página pública hace un solo pedido.
  publico: { ventanaMs: UN_MINUTO_MS, maximo: 60 },
  // Cada intento verifica el token con Google y busca al usuario en la base, y una sesión dura horas.
  inicioSesion: { ventanaMs: 15 * UN_MINUTO_MS, maximo: 50 },
};

const RESPUESTA_DEMASIADOS_PEDIDOS = {
  error: { code: "DEMASIADOS_PEDIDOS", message: "Demasiados pedidos. Probá de nuevo en unos minutos" },
};

// Cuenta por req.ip: detrás de Netlify y Render es la IP del visitante solo si app.ts configuró
// "trust proxy" con la cantidad de proxies que hay adelante (PROXIES_DE_CONFIANZA).
export function crearLimiteDePedidos({ ventanaMs, maximo }: LimiteDePedidos): RequestHandler {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: RESPUESTA_DEMASIADOS_PEDIDOS,
  });
}
