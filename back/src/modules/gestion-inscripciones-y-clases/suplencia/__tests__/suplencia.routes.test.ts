import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInsigniasNoConfigurada } from "../../../../__tests__/fakes/logica-insignias-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";

const suplencia = { id_clase: 20, id_prof_ausente: 8, clase: { id_prof_dictante: 9 } };
const cuerpo = { id_horario: 4, fecha_clase: "2026-10-12", id_profesora_suplente: 9 };

function crearLogicaMock() {
  return {
    listarSuplencias: vi.fn().mockResolvedValue([suplencia]),
    registrarSuplencia: vi.fn().mockResolvedValue({ suplencia, advertencia: null }),
    cambiarSuplencia: vi.fn().mockResolvedValue(suplencia),
    eliminarSuplencia: vi.fn().mockResolvedValue(suplencia),
  };
}

describe("rutas de suplencias", () => {
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
      gestionInscripcionesYClases: { ...logicaInscripcionesNoConfigurada, ...logica },
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      gestionHonorarios: logicaHonorariosNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  afterEach(() => warn.mockRestore());

  function como(metodo: "get" | "post" | "patch" | "delete", ruta: string, token = "propietaria") {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  function auditados(): unknown[] {
    return warn.mock.calls.map((argumentos: unknown[]) => JSON.parse(String(argumentos[0])));
  }

  it("GET /suplencias pasa los filtros convertidos y pide HONORARIOS_VER_TODOS", async () => {
    const respuesta = await como("get", "/suplencias?desde=2026-10-01&id_profesora=8");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([suplencia]);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_VER_TODOS");
    expect(logica.listarSuplencias).toHaveBeenCalledWith({
      desde: new Date("2026-10-01T00:00:00Z"),
      id_profesora: 8,
      limit: 50,
      offset: 0,
    });
  });

  it("POST /suplencias responde 201, pasa quién registra y lo deja en la auditoría", async () => {
    const respuesta = await como("post", "/suplencias").send({ ...cuerpo, motivo: "Enfermedad" });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ suplencia, advertencia: null });
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_LIQUIDAR");
    expect(logica.registrarSuplencia).toHaveBeenCalledWith(
      { ...cuerpo, fecha_clase: new Date("2026-10-12T00:00:00Z"), motivo: "Enfermedad" },
      1,
    );
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "SUPLENCIA_REGISTRADA",
        por: 1,
        id_clase: 20,
        id_prof_ausente: 8,
        id_prof_suplente: 9,
      }),
    );
  });

  it("PATCH /suplencias/:idClase cambia la suplente y lo deja en la auditoría", async () => {
    const respuesta = await como("patch", "/suplencias/20").send({ id_profesora_suplente: 10 });

    expect(respuesta.status).toBe(200);
    expect(logica.cambiarSuplencia).toHaveBeenCalledWith(20, { id_profesora_suplente: 10 }, 1);
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "SUPLENCIA_MODIFICADA",
        por: 1,
        id_clase: 20,
        id_prof_suplente: 9,
      }),
    );
  });

  it("DELETE /suplencias/:idClase responde 204 y deja la suplencia borrada en la auditoría", async () => {
    const respuesta = await como("delete", "/suplencias/20");

    expect(respuesta.status).toBe(204);
    expect(logica.eliminarSuplencia).toHaveBeenCalledWith(20);
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "SUPLENCIA_ELIMINADA",
        por: 1,
        id_clase: 20,
        id_prof_ausente: 8,
        id_prof_suplente: 9,
      }),
    );
  });

  it("exige sesión", async () => {
    const respuesta = await request(app).get("/api/v1/suplencias");

    expect(respuesta.status).toBe(401);
    expect(logica.listarSuplencias).not.toHaveBeenCalled();
  });

  it.each([
    ["get", "/suplencias"],
    ["post", "/suplencias"],
    ["patch", "/suplencias/20"],
    ["delete", "/suplencias/20"],
  ] as const)("%s %s responde 403 a una profesora aunque tenga el permiso", async (metodo, ruta) => {
    const respuesta = await como(metodo, ruta, "profesora").send(cuerpo);

    expect(respuesta.status).toBe(403);
    expect(Object.values(logica).every((operacion) => operacion.mock.calls.length === 0)).toBe(true);
  });

  it.each([
    ["get", "/suplencias", "HONORARIOS_VER_TODOS"],
    ["post", "/suplencias", "HONORARIOS_LIQUIDAR"],
    ["patch", "/suplencias/20", "HONORARIOS_LIQUIDAR"],
    ["delete", "/suplencias/20", "HONORARIOS_LIQUIDAR"],
  ] as const)("%s %s responde 403 a la propietaria sin %s", async (metodo, ruta, permiso) => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

    const respuesta = await como(metodo, ruta).send(cuerpo);

    expect(respuesta.status).toBe(403);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, permiso);
    expect(Object.values(logica).every((operacion) => operacion.mock.calls.length === 0)).toBe(true);
  });

  it.each([
    ["get", "/suplencias?desde=2026-10-31&hasta=2026-10-01", undefined],
    ["post", "/suplencias", { ...cuerpo, fecha_clase: "12/10/2026" }],
    ["post", "/suplencias", { ...cuerpo, id_profesora_suplente: "9" }],
    ["patch", "/suplencias/20", {}],
    ["patch", "/suplencias/020", { motivo: "Viaje" }],
    ["delete", "/suplencias/-0", undefined],
  ] as const)("%s %s rechaza la entrada inválida con 400", async (metodo, ruta, body) => {
    const respuesta = await como(metodo, ruta).send(body);

    expect(respuesta.status).toBe(400);
    expect(Object.values(logica).every((operacion) => operacion.mock.calls.length === 0)).toBe(true);
  });

  it("traduce los errores de la lógica a su código HTTP", async () => {
    logica.registrarSuplencia.mockRejectedValue(new ConflictError("La clase ya tiene una suplencia"));
    logica.eliminarSuplencia.mockRejectedValue(new NotFoundError("Suplencia no encontrada"));

    expect((await como("post", "/suplencias").send(cuerpo)).status).toBe(409);
    expect((await como("delete", "/suplencias/20")).status).toBe(404);
    expect(auditados()).not.toContainEqual(expect.objectContaining({ auditoria: "SUPLENCIA_ELIMINADA" }));
  });
});
