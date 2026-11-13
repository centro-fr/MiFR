import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { crearLimiteDePedidos, LIMITES_DE_PEDIDOS } from "../limite-pedidos.js";

function appConLimite(maximo: number) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(crearLimiteDePedidos({ ventanaMs: 60_000, maximo }));
  app.get("/", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("crearLimiteDePedidos", () => {
  it("crearLimiteDePedidos deja pasar hasta el máximo y responde 429 con el error de la API después", async () => {
    const app = appConLimite(2);

    const primero = await request(app).get("/");
    await request(app).get("/");
    const excedido = await request(app).get("/");

    expect(primero.status).toBe(200);
    expect(primero.headers["ratelimit-policy"]).toContain("q=2");
    expect(excedido.status).toBe(429);
    expect(excedido.body).toEqual({
      error: { code: "DEMASIADOS_PEDIDOS", message: "Demasiados pedidos. Probá de nuevo en unos minutos" },
    });
    expect(excedido.headers["retry-after"]).toBeDefined();
  });

  it("crearLimiteDePedidos cuenta por IP: otra IP tiene su propio cupo", async () => {
    const app = appConLimite(1);

    await request(app).get("/").set("X-Forwarded-For", "203.0.113.1");
    const mismaIp = await request(app).get("/").set("X-Forwarded-For", "203.0.113.1");
    const otraIp = await request(app).get("/").set("X-Forwarded-For", "203.0.113.2");

    expect(mismaIp.status).toBe(429);
    expect(otraIp.status).toBe(200);
  });

  it("crearLimiteDePedidos no manda las cabeceras X-RateLimit viejas", async () => {
    const respuesta = await request(appConLimite(5)).get("/");

    expect(respuesta.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("LIMITES_DE_PEDIDOS es más estricto con el inicio de sesión que con el resto de la API", () => {
    const porMinuto = ({ ventanaMs, maximo }: { ventanaMs: number; maximo: number }) =>
      (maximo * 60_000) / ventanaMs;

    expect(porMinuto(LIMITES_DE_PEDIDOS.inicioSesion)).toBeLessThan(porMinuto(LIMITES_DE_PEDIDOS.api));
  });
});
