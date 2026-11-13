import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../app.js";
import type { ILogicaDifusionPublica } from "../modules/difusion-publica/interface/i-logica-difusion-publica.js";
import type { LimitesDePedidos } from "../shared/middlewares/limite-pedidos.js";

const AMPLIO = { ventanaMs: 60_000, maximo: 100 };

function appCon(limites: Partial<LimitesDePedidos>, proxiesDeConfianza?: number) {
  const difusionPublica = { consultarActividades: vi.fn().mockResolvedValue({ actividades: [] }) };
  const app = createApp(
    { difusionPublica: difusionPublica as unknown as ILogicaDifusionPublica } as AppDependencies,
    {
      limitesDePedidos: { api: AMPLIO, publico: AMPLIO, inicioSesion: AMPLIO, ...limites },
      proxiesDeConfianza,
    },
  );
  return { app, difusionPublica };
}

const unPedido = { ventanaMs: 60_000, maximo: 1 };

describe("límite de pedidos", () => {
  it("createApp corta con 429 los pedidos a la página pública que exceden su tope, sin llegar a la base", async () => {
    const { app, difusionPublica } = appCon({ publico: unPedido });

    await request(app).get("/api/v1/publico/actividades");
    const excedido = await request(app).get("/api/v1/publico/actividades");

    expect(excedido.status).toBe(429);
    expect(excedido.body.error.code).toBe("DEMASIADOS_PEDIDOS");
    expect(difusionPublica.consultarActividades).toHaveBeenCalledTimes(1);
  });

  it.each(["/api/v1/auth/google", "/api/v1/auth/desarrollo"])(
    "createApp aplica el tope de inicio de sesión a %s",
    async (ruta) => {
      const { app } = appCon({ inicioSesion: unPedido });

      await request(app).post(ruta).send({});
      const excedido = await request(app).post(ruta).send({});

      expect(excedido.status).toBe(429);
    },
  );

  it("createApp no aplica el tope de inicio de sesión al resto de /auth", async () => {
    const { app } = appCon({ inicioSesion: unPedido });

    await request(app).post("/api/v1/auth/google").send({});
    const me = await request(app).get("/api/v1/auth/me");

    expect(me.status).toBe(401);
  });

  it("createApp aplica el tope general a cualquier ruta de la API", async () => {
    const { app } = appCon({ api: unPedido });

    await request(app).get("/api/v1/auth/me");
    const otraRuta = await request(app).get("/api/v1/publico/actividades");

    expect(otraRuta.status).toBe(429);
  });

  it("createApp no limita /health, que consulta el monitor que mantiene despierta la API", async () => {
    const { app } = appCon({ api: unPedido });

    await request(app).get("/health");
    const segundo = await request(app).get("/health");

    expect(segundo.status).toBe(200);
  });

  it("createApp sin límites no corta ningún pedido", async () => {
    const app = createApp({} as AppDependencies);

    for (let i = 0; i < 3; i++) await request(app).get("/api/v1/auth/me");
    const respuesta = await request(app).get("/api/v1/auth/me");

    expect(respuesta.status).toBe(401);
    expect(respuesta.headers["ratelimit-policy"]).toBeUndefined();
  });

  it("createApp sin proxies de confianza no deja elegir la IP con X-Forwarded-For", async () => {
    const { app } = appCon({ publico: unPedido });

    await request(app).get("/api/v1/publico/actividades").set("X-Forwarded-For", "203.0.113.1");
    const otraIpFalsa = await request(app)
      .get("/api/v1/publico/actividades")
      .set("X-Forwarded-For", "203.0.113.2");

    expect(otraIpFalsa.status).toBe(429);
  });

  it("createApp con un proxy de confianza cuenta por la IP que informa ese proxy", async () => {
    const { app } = appCon({ publico: unPedido }, 1);

    await request(app).get("/api/v1/publico/actividades").set("X-Forwarded-For", "203.0.113.1");
    const otroVisitante = await request(app)
      .get("/api/v1/publico/actividades")
      .set("X-Forwarded-For", "203.0.113.2");

    expect(otroVisitante.status).toBe(200);
  });
});
