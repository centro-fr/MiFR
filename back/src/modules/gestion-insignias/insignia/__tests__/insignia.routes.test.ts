import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaInsignias } from "../../interface/i-logica-insignias.js";

const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  alumno: { usuarioId: 7, roles: ["ALUMNO"] },
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
};

describe("rutas de insignias y ranking", () => {
  let logica: Record<keyof ILogicaInsignias, ReturnType<typeof vi.fn>>;
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      obtenerFichaInsignias: vi.fn().mockResolvedValue({ id_alumno: 5 }),
      consultarRankingAsistencia: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
    };
    const autenticacion = {
      validarSesion: async (token: string) => ROLES[token],
    } as unknown as IAutenticacion;
    autorizacion = { tienePermiso: vi.fn(async () => true) };
    app = createApp({
      gestionInsignias: logica as unknown as ILogicaInsignias,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    } as AppDependencies);
  });

  function como(token: string, ruta: string) {
    return request(app).get(`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  describe("GET /alumnos/:id/insignias (US-31)", () => {
    it("pasa el alumno y quién pide, con el permiso INSIGNIAS_VER_PROPIAS", async () => {
      const respuesta = await como("alumno", "/alumnos/5/insignias");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ id_alumno: 5 });
      expect(logica.obtenerFichaInsignias).toHaveBeenCalledWith(5, { idUsuario: 7, esPropietaria: false });
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "INSIGNIAS_VER_PROPIAS");
    });

    it("responde 403 sin el permiso, sin llegar a la ficha", async () => {
      autorizacion.tienePermiso.mockResolvedValue(false);

      expect((await como("alumno", "/alumnos/5/insignias")).status).toBe(403);
      expect(logica.obtenerFichaInsignias).not.toHaveBeenCalled();
    });

    it.each(["0", "01", "abc"])("responde 400 con el id %j", async (id) => {
      expect((await como("alumno", `/alumnos/${id}/insignias`)).status).toBe(400);
      expect(logica.obtenerFichaInsignias).not.toHaveBeenCalled();
    });

    it("responde 401 sin sesión", async () => {
      expect((await request(app).get("/api/v1/alumnos/5/insignias")).status).toBe(401);
    });
  });

  describe("GET /reportes/ranking-asistencia (US-30)", () => {
    it("lo ve cualquier rol con REPORTES_RANKING_VER, con la paginación por defecto", async () => {
      const respuesta = await como("alumno", "/reportes/ranking-asistencia");

      expect(respuesta.status).toBe(200);
      expect(logica.consultarRankingAsistencia).toHaveBeenCalledWith(
        { limit: 50, offset: 0 },
        { idUsuario: 7, esPropietaria: false },
      );
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "REPORTES_RANKING_VER");
    });

    it("pasa el período, la actividad y la paginación", async () => {
      await como(
        "propietaria",
        "/reportes/ranking-asistencia?desde=2026-10-01&hasta=2026-10-31&actividad=3&limit=10",
      );

      expect(logica.consultarRankingAsistencia).toHaveBeenCalledWith(
        {
          desde: new Date("2026-10-01T00:00:00Z"),
          hasta: new Date("2026-10-31T00:00:00Z"),
          actividad: 3,
          limit: 10,
          offset: 0,
        },
        { idUsuario: 1, esPropietaria: true },
      );
    });

    it("responde 403 sin el permiso", async () => {
      autorizacion.tienePermiso.mockResolvedValue(false);

      expect((await como("alumno", "/reportes/ranking-asistencia")).status).toBe(403);
      expect(logica.consultarRankingAsistencia).not.toHaveBeenCalled();
    });

    it("responde 400 con fechas invertidas", async () => {
      const respuesta = await como(
        "alumno",
        "/reportes/ranking-asistencia?desde=2026-10-31&hasta=2026-10-01",
      );
      expect(respuesta.status).toBe(400);
    });
  });
});
