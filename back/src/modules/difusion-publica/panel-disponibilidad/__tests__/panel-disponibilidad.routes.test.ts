import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaDifusionPublica } from "../../interface/i-logica-difusion-publica.js";

describe("rutas del panel público", () => {
  let logica: { consultarActividades: ReturnType<typeof vi.fn> };
  let autenticacion: { validarSesion: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = { consultarActividades: vi.fn().mockResolvedValue({ actividades: [] }) };
    autenticacion = { validarSesion: vi.fn() };
    app = createApp({
      difusionPublica: logica as unknown as ILogicaDifusionPublica,
      autenticacion: autenticacion as unknown as IAutenticacion,
    } as AppDependencies);
  });

  it("GET /publico/actividades responde sin sesión y no valida ningún token (US-32)", async () => {
    const respuesta = await request(app).get("/api/v1/publico/actividades");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ actividades: [] });
    expect(autenticacion.validarSesion).not.toHaveBeenCalled();
  });

  it("GET /publico/actividades deja reusar la respuesta un minuto", async () => {
    const respuesta = await request(app).get("/api/v1/publico/actividades");

    expect(respuesta.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("GET /publico/actividades no tiene operaciones de escritura", async () => {
    const respuesta = await request(app).post("/api/v1/publico/actividades").send({});

    expect(respuesta.status).toBe(404);
    expect(logica.consultarActividades).not.toHaveBeenCalled();
  });
});
