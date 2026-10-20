import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaNotificaciones } from "../../interface/i-logica-notificaciones.js";

const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  alumno: { usuarioId: 7, roles: ["ALUMNO"] },
};

describe("rutas de notificaciones", () => {
  let logica: Record<
    "listarNotificacionesPropias" | "marcarNotificacionLeida" | "marcarNotificacionesLeidas",
    ReturnType<typeof vi.fn>
  >;
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      listarNotificacionesPropias: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
      marcarNotificacionLeida: vi.fn().mockResolvedValue({ id_notificacion: 3, leida: true }),
      marcarNotificacionesLeidas: vi.fn().mockResolvedValue({ marcadas: 2 }),
    };
    const autenticacion = {
      validarSesion: async (token: string) => ROLES[token],
    } as unknown as IAutenticacion;
    autorizacion = { tienePermiso: vi.fn(async () => false) };
    app = createApp({
      gestionNotificaciones: logica as unknown as ILogicaNotificaciones,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    } as AppDependencies);
  });

  function como(metodo: "get" | "post", ruta: string) {
    return request(app)[metodo](`/api/v1/notificaciones${ruta}`).set("Authorization", "Bearer alumno");
  }

  it("GET /notificaciones/mias lista las de quien pide, con la paginación por defecto y sin pedir permisos", async () => {
    const respuesta = await como("get", "/mias");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ datos: [], total: 0 });
    expect(logica.listarNotificacionesPropias).toHaveBeenCalledWith(7, { limit: 20, offset: 0 });
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });

  it("GET /notificaciones/mias responde 400 con una paginación inválida", async () => {
    expect((await como("get", "/mias?limit=500")).status).toBe(400);
    expect(logica.listarNotificacionesPropias).not.toHaveBeenCalled();
  });

  it("POST /notificaciones/:id/leida marca la notificación de quien pide", async () => {
    const respuesta = await como("post", "/3/leida");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id_notificacion: 3, leida: true });
    expect(logica.marcarNotificacionLeida).toHaveBeenCalledWith(3, 7);
  });

  it("POST /notificaciones/:id/leida responde 400 con un id inválido", async () => {
    expect((await como("post", "/0/leida")).status).toBe(400);
    expect(logica.marcarNotificacionLeida).not.toHaveBeenCalled();
  });

  it("POST /notificaciones/leidas marca todas las de quien pide", async () => {
    const respuesta = await como("post", "/leidas");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ marcadas: 2 });
    expect(logica.marcarNotificacionesLeidas).toHaveBeenCalledWith(7);
  });

  it.each([
    ["get", "/mias"],
    ["post", "/3/leida"],
    ["post", "/leidas"],
  ] as const)("%s %s responde 401 sin sesión", async (metodo, ruta) => {
    expect((await request(app)[metodo](`/api/v1/notificaciones${ruta}`)).status).toBe(401);
  });
});
