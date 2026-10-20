import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, MontoDistintoError } from "../../../../shared/errors/app-error.js";
import { createApp } from "../../../../app.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import { registrarDocumentacionGestionCuotasYPagos } from "../../gestion-cuotas-y-pagos.openapi.js";
import type { ILogicaCuotasPagos } from "../../interface/i-logica-cuotas-pagos.js";

const pago = { id_pago: 7, monto: 30000, estado: "CONFIRMADO" };
const efectivo = { id_inscripcion: 12, monto: 30000 };
const transferencia = { ...efectivo, fecha_hora_transferencia: "2026-10-01T10:30:00-03:00" };
const ROLES: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
  alumna: { usuarioId: 30, roles: ["ALUMNO"] },
  tutora: { usuarioId: 31, roles: ["TUTOR"] },
};

function crearLogicaMock() {
  return {
    registrarCobroEfectivo: vi.fn().mockResolvedValue(pago),
    informarTransferencia: vi.fn().mockResolvedValue({ ...pago, estado: "PENDIENTE" }),
    registrarTransferenciaRecibida: vi.fn().mockResolvedValue(pago),
    aprobarTransferencia: vi.fn().mockResolvedValue(pago),
    rechazarTransferencia: vi.fn().mockResolvedValue({ ...pago, estado: "RECHAZADO" }),
    listarTransferencias: vi.fn().mockResolvedValue({ datos: [], total: 0, limit: 100, offset: 0 }),
    listarMisTransferencias: vi.fn().mockResolvedValue([]),
    obtenerComprobante: vi.fn().mockResolvedValue({ numero: 7 }),
    listarEfectivoPendiente: vi.fn().mockResolvedValue({ cantidad: 0, total: 0, profesoras: [] }),
    listarRendiciones: vi.fn().mockResolvedValue({ datos: [], total: 0, limit: 100, offset: 0 }),
    rendirCobro: vi.fn().mockResolvedValue({ rendidos: [7], cantidad: 1, total: 25000, salteados: [] }),
    rendirCobros: vi.fn().mockResolvedValue({ rendidos: [], cantidad: 0, total: 0, salteados: [] }),
  };
}

function crearApp(logica: ReturnType<typeof crearLogicaMock>, autorizacion: IAutorizacion) {
  const autenticacion = {
    validarSesion: async (token: string) => ROLES[token],
  } as unknown as IAutenticacion;
  return createApp({
    gestionUsuarios: {} as unknown as ILogicaUsuarios,
    gestionPersonas: {} as unknown as ILogicaPersonas,
    gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
    gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
    gestionCuotasYPagos: logica as unknown as ILogicaCuotasPagos,
    difusionPublica: logicaDifusionPublicaNoConfigurada,
    gestionNotificaciones: logicaNotificacionesNoConfigurada,
    reportes: logicaInformesNoConfigurada,
    gestionHonorarios: logicaHonorariosNoConfigurada,
    autenticacion,
    autorizacion,
  });
}

describe("rutas de pagos", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof crearApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn(async () => true) } as unknown as IAutorizacion;
    app = crearApp(logica, autorizacion);
  });

  function como(quien: string, metodo: "get" | "post", ruta: string) {
    return request(app)[metodo](`/api/v1/pagos${ruta}`).set("Authorization", `Bearer ${quien}`);
  }

  it("exige sesión", async () => {
    expect((await request(app).post("/api/v1/pagos/efectivo").send(efectivo)).status).toBe(401);
  });

  describe("cobro en efectivo (US-15)", () => {
    it("la profesora registra con PAGOS_REGISTRAR y responde 201", async () => {
      const respuesta = await como("profesora", "post", "/efectivo").send(efectivo);

      expect(respuesta.status).toBe(201);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "PAGOS_REGISTRAR");
      expect(logica.registrarCobroEfectivo).toHaveBeenCalledWith(
        { ...efectivo, confirmar_monto_distinto: false },
        { idUsuario: 2, esPropietaria: false },
      );
    });

    it("sin el permiso responde 403", async () => {
      vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

      expect((await como("profesora", "post", "/efectivo").send(efectivo)).status).toBe(403);
      expect(logica.registrarCobroEfectivo).not.toHaveBeenCalled();
    });

    it("sin monto responde 400 y un monto distinto, 409 MONTO_DISTINTO", async () => {
      expect((await como("propietaria", "post", "/efectivo").send({ id_inscripcion: 12 })).status).toBe(400);

      logica.registrarCobroEfectivo.mockRejectedValue(new MontoDistintoError(30000));
      const distinto = await como("propietaria", "post", "/efectivo").send({ ...efectivo, monto: 25000 });
      expect(distinto.status).toBe(409);
      expect(distinto.body.error.code).toBe("MONTO_DISTINTO");
    });
  });

  describe("transferencias (US-16)", () => {
    it.each([
      ["profesora", false],
      ["propietaria", true],
    ] as const)("la %s informa una transferencia con PAGOS_REGISTRAR", async (quien, esPropietaria) => {
      const respuesta = await como(quien, "post", "/transferencia").send(transferencia);

      expect(respuesta.status).toBe(201);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ROLES[quien].usuarioId, "PAGOS_REGISTRAR");
      expect(logica.informarTransferencia).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_hora_transferencia: new Date("2026-10-01T13:30:00Z") }),
        { idUsuario: ROLES[quien].usuarioId, esPropietaria },
      );
    });

    it.each(["alumna", "tutora"])("la %s, sin PAGOS_REGISTRAR, recibe 403 al informar", async (quien) => {
      vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

      expect((await como(quien, "post", "/transferencia").send(transferencia)).status).toBe(403);
      expect(logica.informarTransferencia).not.toHaveBeenCalled();
    });

    it("la alumna ve sus transferencias", async () => {
      expect((await como("alumna", "get", "/mis-transferencias")).status).toBe(200);
      expect(logica.listarMisTransferencias).toHaveBeenCalledWith({ idUsuario: 30, esPropietaria: false });
      expect((await como("profesora", "get", "/mis-transferencias")).status).toBe(403);
    });
  });

  describe("lo que hace solo la propietaria (US-17)", () => {
    it.each([
      ["post", "/transferencia-recibida", transferencia],
      ["get", "/transferencias", undefined],
      ["post", "/7/aprobar", {}],
      ["post", "/7/rechazar", { motivo_rechazo: "No figura" }],
    ] as const)("%s %s exige rol PROPIETARIA y PAGOS_CONFIRMAR", async (metodo, ruta, cuerpo) => {
      expect((await como("profesora", metodo, ruta).send(cuerpo)).status).toBe(403);

      const respuesta = await como("propietaria", metodo, ruta).send(cuerpo);
      expect(respuesta.status).toBeLessThan(300);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "PAGOS_CONFIRMAR");
    });

    it("lista con los filtros convertidos y aprueba con la confirmación del monto", async () => {
      await como("propietaria", "get", "/transferencias?estado=PENDIENTE&id_alumno=5");
      await como("propietaria", "post", "/7/aprobar").send({ confirmar_monto_distinto: true });

      expect(logica.listarTransferencias).toHaveBeenCalledWith({
        estado: "PENDIENTE",
        id_alumno: 5,
        orden: "asc",
        limit: 100,
        offset: 0,
      });
      expect(logica.aprobarTransferencia).toHaveBeenCalledWith(
        7,
        { confirmar_monto_distinto: true },
        { idUsuario: 1, esPropietaria: true },
      );
    });

    it("lista por tipo, orden y días de carga, y rechaza un rango invertido con 400", async () => {
      const respuesta = await como(
        "propietaria",
        "get",
        "/transferencias?tipo=RENOVACION&orden=desc&desde=2026-10-01&hasta=2026-10-10",
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ datos: [], total: 0, limit: 100, offset: 0 });
      expect(logica.listarTransferencias).toHaveBeenCalledWith({
        tipo: "RENOVACION",
        orden: "desc",
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-10T00:00:00Z"),
        limit: 100,
        offset: 0,
      });

      const invertido = await como("propietaria", "get", "/transferencias?desde=2026-10-10&hasta=2026-10-01");
      expect(invertido.status).toBe(400);
    });

    it("aprueba un pedido sin cuerpo, como lo manda el front en el caso normal", async () => {
      const respuesta = await como("propietaria", "post", "/7/aprobar");

      expect(respuesta.status).toBe(200);
      expect(logica.aprobarTransferencia).toHaveBeenCalledWith(
        7,
        { confirmar_monto_distinto: false },
        { idUsuario: 1, esPropietaria: true },
      );
    });

    it("rechazar sin motivo responde 400; una ya resuelta, 409", async () => {
      expect((await como("propietaria", "post", "/7/rechazar").send({})).status).toBe(400);

      logica.rechazarTransferencia.mockRejectedValue(new ConflictError("La transferencia ya fue resuelta"));
      expect(
        (await como("propietaria", "post", "/7/rechazar").send({ motivo_rechazo: "No figura" })).status,
      ).toBe(409);
    });
  });

  it("el comprobante lo pide cualquiera con sesión: decide la lógica quién lo ve", async () => {
    const respuesta = await como("alumna", "get", "/7/comprobante");

    expect(respuesta.status).toBe(200);
    expect(logica.obtenerComprobante).toHaveBeenCalledWith(7, { idUsuario: 30, esPropietaria: false });
    expect((await como("alumna", "get", "/abc/comprobante")).status).toBe(400);
  });

  describe("rendición del efectivo (US-19)", () => {
    it.each([
      ["get", "/efectivo-pendiente"],
      ["get", "/rendiciones"],
      ["post", "/7/rendir"],
      ["post", "/rendir"],
    ] as const)("%s %s es solo de la propietaria con PAGOS_RENDICION_VER", async (metodo, ruta) => {
      const deLaProfesora = await como("profesora", metodo, ruta).send({ id_profesora: 3 });
      vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);
      const sinElPermiso = await como("propietaria", metodo, ruta).send({ id_profesora: 3 });

      expect(deLaProfesora.status).toBe(403);
      expect(sinElPermiso.status).toBe(403);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "PAGOS_RENDICION_VER");
      expect(logica.listarEfectivoPendiente).not.toHaveBeenCalled();
      expect(logica.listarRendiciones).not.toHaveBeenCalled();
      expect(logica.rendirCobro).not.toHaveBeenCalled();
      expect(logica.rendirCobros).not.toHaveBeenCalled();
    });

    it("el pendiente y el historial llegan a la lógica con los filtros convertidos", async () => {
      const pendiente = await como(
        "propietaria",
        "get",
        "/efectivo-pendiente?id_profesora=3&desde=2026-10-01",
      );
      const historial = await como("propietaria", "get", "/rendiciones?hasta=2026-10-31&limit=10");

      expect(pendiente.status).toBe(200);
      expect(logica.listarEfectivoPendiente).toHaveBeenCalledWith(
        { id_profesora: 3, desde: new Date("2026-10-01T00:00:00Z") },
        { limit: 100, offset: 0 },
      );
      expect((await como("propietaria", "get", "/efectivo-pendiente?limit=101")).status).toBe(400);
      expect(historial.status).toBe(200);
      expect(logica.listarRendiciones).toHaveBeenCalledWith(
        { hasta: new Date("2026-10-31T00:00:00Z") },
        { limit: 10, offset: 0 },
      );
      expect((await como("propietaria", "get", "/efectivo-pendiente?desde=hoy")).status).toBe(400);
    });

    it("rendir uno y un lote dejan en la auditoría quién rindió y las observaciones", async () => {
      const advertencias = vi.mocked(console.warn);
      logica.rendirCobros.mockResolvedValue({ rendidos: [7, 9], cantidad: 2, total: 55000, salteados: [] });

      const uno = await como("propietaria", "post", "/7/rendir").send({ observaciones: "Entregó en mano" });
      const lote = await como("propietaria", "post", "/rendir").send({ id_profesora: 3 });

      expect(uno.status).toBe(200);
      expect(logica.rendirCobro).toHaveBeenCalledWith(7);
      expect(lote.status).toBe(200);
      expect(logica.rendirCobros).toHaveBeenCalledWith({ id_profesora: 3 });
      const auditados = advertencias.mock.calls.map(([linea]) => JSON.parse(String(linea)));
      expect(auditados).toEqual([
        expect.objectContaining({
          auditoria: "EFECTIVO_RENDIDO",
          por: 1,
          ids_pagos: [7],
          total: 25000,
          observaciones: "Entregó en mano",
        }),
        expect.objectContaining({ auditoria: "EFECTIVO_RENDIDO", ids_pagos: [7, 9], observaciones: null }),
      ]);
    });

    it("un lote sin nada que rendir no deja auditoría, y uno inválido responde 400", async () => {
      const lote = await como("propietaria", "post", "/rendir").send({ ids_pagos: [8] });
      const invalido = await como("propietaria", "post", "/rendir").send({ id_profesora: 3, ids_pagos: [7] });

      expect(lote.status).toBe(200);
      expect(vi.mocked(console.warn)).not.toHaveBeenCalled();
      expect(invalido.status).toBe(400);
    });

    it("rendir uno ya rendido responde 409", async () => {
      logica.rendirCobro.mockRejectedValue(new ConflictError("El cobro ya se rindió"));

      expect((await como("propietaria", "post", "/7/rendir")).status).toBe(409);
    });
  });

  it("documenta en Swagger todas las operaciones del subsistema", () => {
    const registro = new OpenAPIRegistry();
    registrarDocumentacionGestionCuotasYPagos(registro);

    const operaciones = registro.definitions.flatMap((definicion) =>
      definicion.type === "route" ? [`${definicion.route.method} ${definicion.route.path}`] : [],
    );
    expect(operaciones.sort()).toEqual(
      [
        "post /pagos/efectivo",
        "post /pagos/transferencia",
        "post /pagos/transferencia-recibida",
        "get /pagos/mis-transferencias",
        "get /pagos/transferencias",
        "post /pagos/{id}/aprobar",
        "post /pagos/{id}/rechazar",
        "get /pagos/{id}/comprobante",
        "get /pagos/efectivo-pendiente",
        "get /pagos/rendiciones",
        "post /pagos/{id}/rendir",
        "post /pagos/rendir",
      ].sort(),
    );
  });
});
