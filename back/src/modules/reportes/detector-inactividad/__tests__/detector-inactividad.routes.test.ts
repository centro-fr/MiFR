import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaInformes } from "../../interface/i-logica-informes.js";

const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
};
const RUTA = "/api/v1/informes/alumnos-inactivos";

describe("rutas de alumnos inactivos", () => {
  let logica: Record<keyof ILogicaInformes, ReturnType<typeof vi.fn>>;
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      listarAlumnosInactivos: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
      registrarSeguimientoInactividad: vi
        .fn()
        .mockResolvedValue({ id_inscripcion: 12, estado: "CONTACTADO" }),
      quitarSeguimientoInactividad: vi.fn().mockResolvedValue(undefined),
      informeCuotasVencidas: vi.fn(),
      informeCobranza: vi.fn(),
      estadisticasPlanes: vi.fn(),
      estadisticasInscripciones: vi.fn(),
      informeAsistencia: vi.fn(),
      informeOcupacion: vi.fn(),
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

  function como(token: string, metodo: "get" | "put" | "delete", ruta = "") {
    return request(app)[metodo](`${RUTA}${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  it("GET responde el listado a la propietaria con REPORTES_COBRANZA_VER y los filtros convertidos", async () => {
    const respuesta = await como("propietaria", "get", "?id_profesora=3&minimo_inasistencias=4");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ datos: [], total: 0 });
    expect(logica.listarAlumnosInactivos).toHaveBeenCalledWith({
      id_profesora: 3,
      minimo_inasistencias: 4,
      limit: 50,
      offset: 0,
    });
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "REPORTES_COBRANZA_VER");
  });

  it("GET responde 400 con un filtro inválido", async () => {
    expect((await como("propietaria", "get", "?estado_gestion=OTRO")).status).toBe(400);
    expect(logica.listarAlumnosInactivos).not.toHaveBeenCalled();
  });

  it("PUT guarda la marca con quien la registra", async () => {
    const respuesta = await como("propietaria", "put", "/12/seguimiento").send({ estado: "CONTACTADO" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id_inscripcion: 12, estado: "CONTACTADO" });
    expect(logica.registrarSeguimientoInactividad).toHaveBeenCalledWith(12, { estado: "CONTACTADO" }, 1);
  });

  it("PUT responde 400 con un estado inválido o un id inválido", async () => {
    expect((await como("propietaria", "put", "/12/seguimiento").send({ estado: "PENDIENTE" })).status).toBe(
      400,
    );
    expect((await como("propietaria", "put", "/0/seguimiento").send({ estado: "IGNORADO" })).status).toBe(
      400,
    );
    expect(logica.registrarSeguimientoInactividad).not.toHaveBeenCalled();
  });

  it("DELETE quita la marca y responde 204", async () => {
    const respuesta = await como("propietaria", "delete", "/12/seguimiento");

    expect(respuesta.status).toBe(204);
    expect(logica.quitarSeguimientoInactividad).toHaveBeenCalledWith(12);
  });

  it.each([
    ["get", ""],
    ["put", "/12/seguimiento"],
    ["delete", "/12/seguimiento"],
  ] as const)(
    "%s responde 403 a una profesora aunque tenga el permiso, y 401 sin sesión",
    async (metodo, ruta) => {
      expect((await como("profesora", metodo, ruta).send({ estado: "IGNORADO" })).status).toBe(403);
      expect((await request(app)[metodo](`${RUTA}${ruta}`)).status).toBe(401);
      expect(logica.listarAlumnosInactivos).not.toHaveBeenCalled();
      expect(logica.registrarSeguimientoInactividad).not.toHaveBeenCalled();
      expect(logica.quitarSeguimientoInactividad).not.toHaveBeenCalled();
    },
  );

  it("responde 403 a la propietaria si le quitaron REPORTES_COBRANZA_VER", async () => {
    autorizacion.tienePermiso.mockResolvedValue(false);

    expect((await como("propietaria", "get")).status).toBe(403);
    expect(logica.listarAlumnosInactivos).not.toHaveBeenCalled();
  });
});
