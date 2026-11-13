import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies, type AppOpciones } from "../app.js";
import type { ILogicaDifusionPublica } from "../modules/difusion-publica/interface/i-logica-difusion-publica.js";

const SECRETO = "s".repeat(32);
const AMPLIO = { ventanaMs: 60_000, maximo: 100 };
const RUTA = "/api/v1/publico/actividades";

function firmaDeNetlify(): string {
  return jwt.sign({ iss: "netlify", site_url: "https://mifr.netlify.app" }, SECRETO, { expiresIn: "1m" });
}

function appCon(opciones: AppOpciones) {
  const difusionPublica = { consultarActividades: vi.fn().mockResolvedValue({ actividades: [] }) };
  const app = createApp(
    { difusionPublica: difusionPublica as unknown as ILogicaDifusionPublica } as AppDependencies,
    opciones,
  );
  return { app, difusionPublica };
}

describe("firma de Netlify", () => {
  it("createApp con la firma configurada rechaza con 403 un pedido que llegó directo, sin pasar por Netlify", async () => {
    const { app, difusionPublica } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get(RUTA);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.code).toBe("ORIGEN_NO_PERMITIDO");
    expect(difusionPublica.consultarActividades).not.toHaveBeenCalled();
  });

  it("createApp con la firma configurada atiende un pedido firmado por Netlify", async () => {
    const { app } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get(RUTA).set("x-nf-sign", firmaDeNetlify());

    expect(respuesta.status).toBe(200);
  });

  it("createApp no exige la firma en /health, que consultan Render y el monitor directo", async () => {
    const { app } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get("/health");

    expect(respuesta.status).toBe(200);
  });

  it("createApp sin la firma configurada no la exige", async () => {
    const { app } = appCon({});

    const respuesta = await request(app).get(RUTA);

    expect(respuesta.status).toBe(200);
  });

  it("createApp rechaza los pedidos sin firma antes de contarlos para el límite de pedidos", async () => {
    const unPedido = { ventanaMs: 60_000, maximo: 1 };
    const { app } = appCon({
      firmaProxyNetlify: SECRETO,
      limitesDePedidos: { api: unPedido, publico: AMPLIO, inicioSesion: AMPLIO },
    });

    await request(app).get(RUTA);
    await request(app).get(RUTA);
    const firmado = await request(app).get(RUTA).set("x-nf-sign", firmaDeNetlify());

    expect(firmado.status).toBe(200);
  });
});
