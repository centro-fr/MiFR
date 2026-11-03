import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
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

const tarifa = {
  id_tarifa: 5,
  id_profesora: 3,
  concepto: "ALUMNO_A_CARGO",
  id_plan: null,
  tipo_valor: "PORCENTAJE",
  valor: 50,
  fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
  fecha_vigencia_hasta: null,
};
const tarifaEnJson = JSON.parse(JSON.stringify(tarifa)) as unknown;

const cuerpo = {
  id_profesora: 3,
  concepto: "ALUMNO_A_CARGO",
  tipo_valor: "PORCENTAJE",
  valor: 50,
  fecha_vigencia_desde: "2026-11-01",
};

function crearLogicaMock() {
  return {
    listarTarifas: vi.fn().mockResolvedValue([tarifa]),
    registrarTarifa: vi.fn().mockResolvedValue(tarifa),
    cerrarTarifa: vi.fn().mockResolvedValue(tarifa),
  };
}

describe("rutas de tarifas de honorarios", () => {
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
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      gestionHonorarios: { ...logicaHonorariosNoConfigurada, ...logica },
      gestionRutinasYProgreso: logicaRutinasNoConfigurada,
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

  function sinLlamadas(): boolean {
    return Object.values(logica).every((operacion) => operacion.mock.calls.length === 0);
  }

  it("GET /tarifas-honorario sin filtros lista todo y pide HONORARIOS_VER_TODOS", async () => {
    const respuesta = await como("get", "/tarifas-honorario");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([tarifaEnJson]);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_VER_TODOS");
    expect(logica.listarTarifas).toHaveBeenCalledWith({ id_profesora: undefined, soloVigentes: undefined });
  });

  it.each([
    ["?id_profesora=3&vigentes=true", { id_profesora: 3, soloVigentes: true }],
    ["?vigentes=false", { id_profesora: undefined, soloVigentes: false }],
  ] as const)("GET /tarifas-honorario%s pasa los filtros convertidos", async (consulta, filtro) => {
    const respuesta = await como("get", `/tarifas-honorario${consulta}`);

    expect(respuesta.status).toBe(200);
    expect(logica.listarTarifas).toHaveBeenCalledWith(filtro);
  });

  it("POST /tarifas-honorario responde 201, deja el plan en null y lo deja en la auditoría", async () => {
    const respuesta = await como("post", "/tarifas-honorario").send(cuerpo);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(tarifaEnJson);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_LIQUIDAR");
    expect(logica.registrarTarifa).toHaveBeenCalledWith({
      ...cuerpo,
      id_plan: null,
      fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
    });
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "TARIFA_HONORARIO_REGISTRADA",
        por: 1,
        id_tarifa: 5,
        id_profesora: 3,
        concepto: "ALUMNO_A_CARGO",
        id_plan: null,
        tipo_valor: "PORCENTAJE",
        valor: 50,
        fecha_vigencia_desde: "2026-11-01T00:00:00.000Z",
        fecha_vigencia_hasta: null,
      }),
    );
  });

  it("POST /tarifas-honorario acepta una tarifa de HORA_SUPLENCIA en monto fijo y una por plan", async () => {
    const suplencia = { ...cuerpo, concepto: "HORA_SUPLENCIA", tipo_valor: "MONTO_FIJO", valor: 8000 };
    const porPlan = { ...cuerpo, id_plan: 2 };

    expect((await como("post", "/tarifas-honorario").send(suplencia)).status).toBe(201);
    expect((await como("post", "/tarifas-honorario").send(porPlan)).status).toBe(201);
    expect(logica.registrarTarifa).toHaveBeenCalledWith(expect.objectContaining({ id_plan: 2 }));
  });

  it("POST /tarifas-honorario/:id/cerrar responde 200 y deja el cierre en la auditoría", async () => {
    const respuesta = await como("post", "/tarifas-honorario/5/cerrar").send({ fecha_hasta: "2026-12-31" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(tarifaEnJson);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HONORARIOS_LIQUIDAR");
    expect(logica.cerrarTarifa).toHaveBeenCalledWith(5, new Date("2026-12-31T00:00:00Z"));
    expect(auditados()).toContainEqual(
      expect.objectContaining({
        auditoria: "TARIFA_HONORARIO_CERRADA",
        por: 1,
        id_tarifa: 5,
        id_profesora: 3,
      }),
    );
  });

  it("exige sesión", async () => {
    const respuesta = await request(app).get("/api/v1/tarifas-honorario");

    expect(respuesta.status).toBe(401);
    expect(sinLlamadas()).toBe(true);
  });

  it.each([
    ["get", "/tarifas-honorario"],
    ["post", "/tarifas-honorario"],
    ["post", "/tarifas-honorario/5/cerrar"],
  ] as const)("%s %s responde 403 a una profesora aunque tenga el permiso", async (metodo, ruta) => {
    const respuesta = await como(metodo, ruta, "profesora").send(cuerpo);

    expect(respuesta.status).toBe(403);
    expect(sinLlamadas()).toBe(true);
  });

  it.each([
    ["get", "/tarifas-honorario", "HONORARIOS_VER_TODOS"],
    ["post", "/tarifas-honorario", "HONORARIOS_LIQUIDAR"],
    ["post", "/tarifas-honorario/5/cerrar", "HONORARIOS_LIQUIDAR"],
  ] as const)("%s %s responde 403 a la propietaria sin %s", async (metodo, ruta, permiso) => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

    const respuesta = await como(metodo, ruta).send({ ...cuerpo, fecha_hasta: "2026-12-31" });

    expect(respuesta.status).toBe(403);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, permiso);
    expect(sinLlamadas()).toBe(true);
  });

  it.each([
    ["get", "/tarifas-honorario?id_profesora=abc", undefined],
    ["get", "/tarifas-honorario?id_profesora=03", undefined],
    ["get", "/tarifas-honorario?vigentes=si", undefined],
    ["post", "/tarifas-honorario", { ...cuerpo, valor: 0 }],
    ["post", "/tarifas-honorario", { ...cuerpo, valor: 10.555 }],
    ["post", "/tarifas-honorario", { ...cuerpo, valor: 150 }],
    ["post", "/tarifas-honorario", { ...cuerpo, concepto: "BONO" }],
    ["post", "/tarifas-honorario", { ...cuerpo, concepto: "HORA_SUPLENCIA", id_plan: 2 }],
    ["post", "/tarifas-honorario", { ...cuerpo, id_profesora: "3" }],
    ["post", "/tarifas-honorario", { ...cuerpo, fecha_vigencia_desde: "01/11/2026" }],
    ["post", "/tarifas-honorario", { ...cuerpo, fecha_vigencia_desde: undefined }],
    ["post", "/tarifas-honorario/05/cerrar", { fecha_hasta: "2026-12-31" }],
    ["post", "/tarifas-honorario/5/cerrar", {}],
    ["post", "/tarifas-honorario/5/cerrar", { fecha_hasta: "2026-02-30" }],
  ] as const)("%s %s rechaza la entrada inválida con 400", async (metodo, ruta, body) => {
    const respuesta = await como(metodo, ruta).send(body);

    expect(respuesta.status).toBe(400);
    expect(sinLlamadas()).toBe(true);
  });

  it("traduce los errores de la lógica a su código HTTP y no audita lo que no se hizo", async () => {
    logica.registrarTarifa.mockRejectedValue(new ConflictError("Hay una tarifa programada en uso"));
    logica.cerrarTarifa.mockRejectedValue(new NotFoundError("La tarifa no existe"));

    expect((await como("post", "/tarifas-honorario").send(cuerpo)).status).toBe(409);
    expect(
      (await como("post", "/tarifas-honorario/5/cerrar").send({ fecha_hasta: "2026-12-31" })).status,
    ).toBe(404);
    expect(auditados()).toEqual([]);
  });
});
