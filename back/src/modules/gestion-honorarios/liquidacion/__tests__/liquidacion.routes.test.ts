import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import { logicaRutinasNoConfigurada } from "../../../../__tests__/fakes/logica-rutinas-no-configurada.js";
import { logicaInsigniasNoConfigurada } from "../../../../__tests__/fakes/logica-insignias-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";

const liquidacion = {
  id_liquidacion: 3,
  id_profesora: 8,
  monto_total: 5000,
  estado: "BORRADOR",
  detalles: [],
};
const generacion = {
  periodo: "2026-10",
  total_general: 5000,
  liquidaciones: [liquidacion],
  advertencias: [{ id_profesora: 8, motivo: "SIN_TARIFA" }],
  sin_recalcular: [9],
};
const resumen = { periodo: "2026-10", total_general: 5000, liquidaciones: [liquidacion] };
const octubre = {
  periodo: "2026-10",
  desde: new Date("2026-10-01T00:00:00Z"),
  hasta: new Date("2026-10-31T00:00:00Z"),
};

function crearLogicaMock() {
  return {
    generarLiquidaciones: vi.fn().mockResolvedValue(generacion),
    listarLiquidaciones: vi.fn().mockResolvedValue(resumen),
    obtenerLiquidacion: vi.fn().mockResolvedValue(liquidacion),
    cerrarLiquidacion: vi.fn().mockResolvedValue({ ...liquidacion, estado: "CERRADA" }),
    pagarLiquidacion: vi.fn().mockResolvedValue({ ...liquidacion, estado: "PAGADA" }),
  };
}

describe("rutas de liquidaciones", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn(async () => true) } as unknown as IAutorizacion;
    const autenticacion = {
      validarSesion: async (token: string) => ({
        usuarioId: token === "propietaria" ? 1 : 2,
        roles: token === "propietaria" ? ["PROPIETARIA"] : ["PROFESORA"],
      }),
    } as unknown as IAutenticacion;
    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: {} as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      gestionHonorarios: { ...logicaHonorariosNoConfigurada, ...logica },
      gestionRutinasYProgreso: logicaRutinasNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  afterEach(() => warn.mockRestore());

  function como(metodo: "get" | "post", ruta: string, token = "propietaria") {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  function auditados(): unknown[] {
    return warn.mock.calls.map((argumentos: unknown[]) => JSON.parse(String(argumentos[0])));
  }

  it("POST /liquidaciones genera el mes, pide HONORARIOS_LIQUIDAR y lo deja en la auditoría", async () => {
    const respuesta = await como("post", "/liquidaciones").send({ periodo: "2026-10" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(generacion);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_LIQUIDAR");
    expect(logica.generarLiquidaciones).toHaveBeenCalledWith(octubre);
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "LIQUIDACION_GENERADA",
        por: 1,
        periodo: "2026-10",
        liquidaciones: 1,
        sin_recalcular: [9],
        advertencias: 1,
      }),
    );
  });

  it("GET /liquidaciones convierte el período y pide HONORARIOS_VER_TODOS", async () => {
    const respuesta = await como("get", "/liquidaciones?periodo=2026-10");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(resumen);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_VER_TODOS");
    expect(logica.listarLiquidaciones).toHaveBeenCalledWith(octubre);
  });

  it("GET /liquidaciones/:id devuelve el detalle y pasa el id como número", async () => {
    const respuesta = await como("get", "/liquidaciones/3");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(liquidacion);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_VER_TODOS");
    expect(logica.obtenerLiquidacion).toHaveBeenCalledWith(3);
  });

  it("GET /liquidaciones/:id responde 404 si no existe", async () => {
    logica.obtenerLiquidacion.mockRejectedValue(new NotFoundError("Liquidación no encontrada"));

    const respuesta = await como("get", "/liquidaciones/99");

    expect(respuesta.status).toBe(404);
  });

  it("POST /liquidaciones/:id/cerrar cierra y lo deja en la auditoría", async () => {
    const respuesta = await como("post", "/liquidaciones/3/cerrar");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe("CERRADA");
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_LIQUIDAR");
    expect(logica.cerrarLiquidacion).toHaveBeenCalledWith(3);
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "LIQUIDACION_CERRADA",
        por: 1,
        id_liquidacion: 3,
        id_profesora: 8,
        monto_total: 5000,
      }),
    );
  });

  it("POST /liquidaciones/:id/cerrar responde 409 si no estaba en borrador", async () => {
    logica.cerrarLiquidacion.mockRejectedValue(new ConflictError("Solo se puede cerrar un borrador"));

    const respuesta = await como("post", "/liquidaciones/3/cerrar");

    expect(respuesta.status).toBe(409);
    expect(auditados()).not.toContainEqual(expect.objectContaining({ auditoria: "LIQUIDACION_CERRADA" }));
  });

  it("POST /liquidaciones/:id/pagar paga y lo deja en la auditoría", async () => {
    const respuesta = await como("post", "/liquidaciones/3/pagar");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe("PAGADA");
    expect(logica.pagarLiquidacion).toHaveBeenCalledWith(3);
    expect(auditados()).toContainEqual(
      expect.objectContaining({ auditoria: "LIQUIDACION_PAGADA", por: 1, id_liquidacion: 3 }),
    );
  });

  it.each<[string, "get" | "post", string, object?]>([
    ["POST sin período", "post", "/liquidaciones", {}],
    ["POST con un período mal escrito", "post", "/liquidaciones", { periodo: "2026-13" }],
    ["GET sin período", "get", "/liquidaciones"],
    ["GET con un período mal escrito", "get", "/liquidaciones?periodo=octubre"],
    ["GET con un id inválido", "get", "/liquidaciones/abc"],
    ["cerrar con un id inválido", "post", "/liquidaciones/0/cerrar"],
    ["pagar con un id inválido", "post", "/liquidaciones/-1/pagar"],
  ])("responde 400 y no llega a la lógica: %s", async (_caso, metodo, ruta, cuerpo) => {
    const respuesta = await (cuerpo === undefined ? como(metodo, ruta) : como(metodo, ruta).send(cuerpo));

    expect(respuesta.status).toBe(400);
    expect(logica.generarLiquidaciones).not.toHaveBeenCalled();
    expect(logica.listarLiquidaciones).not.toHaveBeenCalled();
    expect(logica.obtenerLiquidacion).not.toHaveBeenCalled();
    expect(logica.cerrarLiquidacion).not.toHaveBeenCalled();
    expect(logica.pagarLiquidacion).not.toHaveBeenCalled();
  });

  it.each<["get" | "post", string]>([
    ["post", "/liquidaciones"],
    ["get", "/liquidaciones?periodo=2026-10"],
    ["get", "/liquidaciones/3"],
    ["post", "/liquidaciones/3/cerrar"],
    ["post", "/liquidaciones/3/pagar"],
  ])("%s %s es solo de la propietaria: la profesora recibe 403", async (metodo, ruta) => {
    const respuesta = await como(metodo, ruta, "profesora").send({ periodo: "2026-10" });

    expect(respuesta.status).toBe(403);
    expect(logica.generarLiquidaciones).not.toHaveBeenCalled();
    expect(logica.cerrarLiquidacion).not.toHaveBeenCalled();
  });

  it("responde 403 a la propietaria si le falta el permiso", async () => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

    const respuesta = await como("post", "/liquidaciones/3/pagar");

    expect(respuesta.status).toBe(403);
    expect(logica.pagarLiquidacion).not.toHaveBeenCalled();
  });

  it("exige sesión", async () => {
    const respuesta = await request(app).get("/api/v1/liquidaciones?periodo=2026-10");

    expect(respuesta.status).toBe(401);
    expect(logica.listarLiquidaciones).not.toHaveBeenCalled();
  });
});
