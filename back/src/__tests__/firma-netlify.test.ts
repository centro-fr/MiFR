import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies, type AppOpciones } from "../app.js";
import type { IAutenticacion } from "../modules/gestion-usuarios/sesion/interface/i-autenticacion.js";

const SECRETO = "s".repeat(32);
const AMPLIO = { ventanaMs: 60_000, maximo: 100 };
const ME = "/api/v1/auth/me";

function firmaDeNetlify(): string {
  return jwt.sign({ iss: "netlify", site_url: "https://mifr.netlify.app" }, SECRETO, { expiresIn: "1m" });
}

function appCon(opciones: AppOpciones) {
  const autenticacion = { validarSesion: vi.fn().mockResolvedValue({ usuarioId: 1, roles: [] }) };
  const app = createApp(
    { autenticacion: autenticacion as unknown as IAutenticacion } as AppDependencies,
    opciones,
  );
  return { app, autenticacion };
}

describe("firma de Netlify", () => {
  it("createApp con la firma configurada rechaza con 403 un pedido que llegó directo, sin pasar por Netlify", async () => {
    const { app, autenticacion } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get(ME).set("Authorization", "Bearer token");

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.code).toBe("ORIGEN_NO_PERMITIDO");
    expect(autenticacion.validarSesion).not.toHaveBeenCalled();
  });

  it("createApp con la firma configurada atiende un pedido firmado por Netlify", async () => {
    const { app } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get(ME).set("x-nf-sign", firmaDeNetlify());

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.code).toBe("UNAUTHORIZED");
  });

  it("createApp no exige la firma en /health, que consultan Render y el monitor directo", async () => {
    const { app } = appCon({ firmaProxyNetlify: SECRETO });

    const respuesta = await request(app).get("/health");

    expect(respuesta.status).toBe(200);
  });

  it("createApp sin la firma configurada no la exige", async () => {
    const { app } = appCon({});

    const respuesta = await request(app).get(ME);

    expect(respuesta.status).toBe(401);
  });

  it("createApp rechaza los pedidos sin firma antes de contarlos para el límite de pedidos", async () => {
    const unPedido = { ventanaMs: 60_000, maximo: 1 };
    const { app } = appCon({
      firmaProxyNetlify: SECRETO,
      limitesDePedidos: { api: unPedido, inicioSesion: AMPLIO },
    });

    await request(app).get(ME);
    await request(app).get(ME);
    const firmado = await request(app).get(ME).set("x-nf-sign", firmaDeNetlify());

    expect(firmado.status).toBe(401);
  });
});
