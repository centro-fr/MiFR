import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaInformes } from "../../interface/i-logica-informes.js";

const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
  alumno: { usuarioId: 3, roles: ["ALUMNO"] },
};

describe("rutas de reportes analíticos (/api/v1/reportes)", () => {
  let logica: Record<keyof ILogicaInformes, ReturnType<typeof vi.fn>>;
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      listarAlumnosInactivos: vi.fn(),
      registrarSeguimientoInactividad: vi.fn(),
      quitarSeguimientoInactividad: vi.fn(),
      informeCuotasVencidas: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
      informeCobranza: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
      estadisticasPlanes: vi.fn().mockResolvedValue({ planes: [] }),
      estadisticasInscripciones: vi.fn().mockResolvedValue({ meses: [] }),
      informeAsistencia: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
      informeOcupacion: vi.fn().mockResolvedValue({ datos: [] }),
    };
    const autenticacion = {
      validarSesion: async (token: string) => ROLES[token],
    } as unknown as IAutenticacion;
    autorizacion = { tienePermiso: vi.fn(async () => true) };
    app = createApp({
      reportes: logica as unknown as ILogicaInformes,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    } as AppDependencies);
  });

  function como(token: string, ruta: string) {
    return request(app).get(`/api/v1/reportes${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  describe("seguridad y permisos transversales", () => {
    it("responde 401 si no se envía token de autenticación", async () => {
      const respuesta = await request(app).get("/api/v1/reportes/cuotas-vencidas");
      expect(respuesta.status).toBe(401);
    });

    it("responde 403 a roles no autorizados (profesora, alumno)", async () => {
      const resProf = await como("profesora", "/cuotas-vencidas");
      expect(resProf.status).toBe(403);

      const resAlum = await como("alumno", "/planes");
      expect(resAlum.status).toBe(403);
    });

    it("responde 403 a la propietaria si no posee el permiso REPORTES_COBRANZA_VER", async () => {
      autorizacion.tienePermiso.mockResolvedValue(false);

      const respuesta = await como("propietaria", "/cuotas-vencidas");
      expect(respuesta.status).toBe(403);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "REPORTES_COBRANZA_VER");
    });
  });

  describe("GET /reportes/cuotas-vencidas (US-34)", () => {
    it("permite a la propietaria consultar el informe de cuotas vencidas", async () => {
      const respuesta = await como(
        "propietaria",
        "/cuotas-vencidas?desde=2026-09-01&hasta=2026-09-30&id_profesora=2&limit=25",
      );

      expect(respuesta.status).toBe(200);
      expect(logica.informeCuotasVencidas).toHaveBeenCalledWith({
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-30T00:00:00Z"),
        id_profesora: 2,
        limit: 25,
        offset: 0,
      });
    });

    it("responde 400 si desde es posterior a hasta", async () => {
      const respuesta = await como("propietaria", "/cuotas-vencidas?desde=2026-10-15&hasta=2026-10-10");
      expect(respuesta.status).toBe(400);
    });
  });

  describe("GET /reportes/cobranza", () => {
    it("permite a la propietaria consultar el informe de cobranza", async () => {
      const respuesta = await como(
        "propietaria",
        "/cobranza?desde=2026-10-01&hasta=2026-10-19&forma_pago=TRANSFERENCIA",
      );

      expect(respuesta.status).toBe(200);
      expect(logica.informeCobranza).toHaveBeenCalledWith({
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-19T00:00:00Z"),
        forma_pago: "TRANSFERENCIA",
        limit: 50,
        offset: 0,
      });
    });

    it("responde 400 si la forma de pago es inválida", async () => {
      const respuesta = await como("propietaria", "/cobranza?forma_pago=BITCOIN");
      expect(respuesta.status).toBe(400);
    });
  });

  describe("GET /reportes/planes (US-36)", () => {
    it("permite consultar estadísticas de planes filtradas", async () => {
      const respuesta = await como("propietaria", "/planes?id_actividad=4&id_profesora=2");

      expect(respuesta.status).toBe(200);
      expect(logica.estadisticasPlanes).toHaveBeenCalledWith({
        id_actividad: 4,
        id_profesora: 2,
      });
    });

    it("responde 400 con ID no numérico", async () => {
      const respuesta = await como("propietaria", "/planes?id_actividad=invalido");
      expect(respuesta.status).toBe(400);
    });
  });

  describe("GET /reportes/inscripciones (US-35)", () => {
    it("permite consultar estadísticas de inscripciones por año", async () => {
      const respuesta = await como("propietaria", "/inscripciones?anio=2026&id_plan=3");

      expect(respuesta.status).toBe(200);
      expect(logica.estadisticasInscripciones).toHaveBeenCalledWith({
        anio: 2026,
        id_plan: 3,
      });
    });

    it("responde 400 con año fuera de rango", async () => {
      const respuesta = await como("propietaria", "/inscripciones?anio=1990");
      expect(respuesta.status).toBe(400);
    });
  });

  describe("GET /reportes/asistencia (US-33)", () => {
    it("pasa los filtros combinados al informe", async () => {
      const respuesta = await como(
        "propietaria",
        "/asistencia?desde=2026-10-01&hasta=2026-10-31&id_alumno=5&id_profesora=2&id_actividad=3",
      );

      expect(respuesta.status).toBe(200);
      expect(logica.informeAsistencia).toHaveBeenCalledWith({
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-31T00:00:00Z"),
        id_alumno: 5,
        id_profesora: 2,
        id_actividad: 3,
        incluir_bajas: false,
        limit: 50,
        offset: 0,
      });
    });

    it("solo la propietaria: profesora y alumno reciben 403 sin llegar al informe", async () => {
      expect((await como("profesora", "/asistencia")).status).toBe(403);
      expect((await como("alumno", "/asistencia")).status).toBe(403);
      expect(logica.informeAsistencia).not.toHaveBeenCalled();
    });

    it("responde 400 con fechas invertidas", async () => {
      const respuesta = await como("propietaria", "/asistencia?desde=2026-10-31&hasta=2026-10-01");
      expect(respuesta.status).toBe(400);
    });
  });

  describe("GET /reportes/ocupacion (US-37)", () => {
    it("pasa los filtros al informe", async () => {
      const respuesta = await como("propietaria", "/ocupacion?id_actividad=3&modalidad=GRUPAL");

      expect(respuesta.status).toBe(200);
      expect(logica.informeOcupacion).toHaveBeenCalledWith({ id_actividad: 3, modalidad: "GRUPAL" });
    });

    it("solo la propietaria: una profesora recibe 403", async () => {
      expect((await como("profesora", "/ocupacion")).status).toBe(403);
      expect(logica.informeOcupacion).not.toHaveBeenCalled();
    });

    it("responde 400 con una modalidad desconocida", async () => {
      expect((await como("propietaria", "/ocupacion?modalidad=OTRA")).status).toBe(400);
    });
  });
});
