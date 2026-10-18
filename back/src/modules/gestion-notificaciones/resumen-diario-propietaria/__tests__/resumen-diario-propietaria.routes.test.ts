import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaNotificaciones } from "../../interface/i-logica-notificaciones.js";

const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
};

describe("rutas del resumen diario", () => {
  let logica: { obtenerResumenDiario: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = { obtenerResumenDiario: vi.fn().mockResolvedValue({ sin_novedades: true }) };
    const autenticacion = {
      validarSesion: async (token: string) => ROLES[token],
    } as unknown as IAutenticacion;
    // Aunque tenga cualquier permiso, el resumen es solo de la propietaria.
    const autorizacion = { tienePermiso: vi.fn(async () => true) } as unknown as IAutorizacion;
    app = createApp({
      gestionNotificaciones: logica as unknown as ILogicaNotificaciones,
      autenticacion,
      autorizacion,
    } as AppDependencies);
  });

  function como(token: string) {
    return request(app).get("/api/v1/resumen-diario").set("Authorization", `Bearer ${token}`);
  }

  it("GET /resumen-diario responde el resumen a la propietaria", async () => {
    const respuesta = await como("propietaria");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ sin_novedades: true });
    expect(logica.obtenerResumenDiario).toHaveBeenCalledTimes(1);
  });

  it("GET /resumen-diario responde 403 a una profesora y 401 sin sesión", async () => {
    expect((await como("profesora")).status).toBe(403);
    expect((await request(app).get("/api/v1/resumen-diario")).status).toBe(401);
    expect(logica.obtenerResumenDiario).not.toHaveBeenCalled();
  });
});
