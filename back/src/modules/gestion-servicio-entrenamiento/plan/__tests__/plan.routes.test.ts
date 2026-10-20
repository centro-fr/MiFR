import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";

const plan = { id_plan: 1, nombre: "Básico 2 días" };
const precio = {
  id_plan_precio: 7,
  id_plan: 1,
  precio: 28000,
  fecha_vigencia_desde: "2026-11-01T00:00:00.000Z",
};

function crearLogicaMock() {
  return {
    crearPlan: vi.fn(),
    listarPlanes: vi.fn(),
    obtenerPlanPorId: vi.fn(),
    actualizarPlan: vi.fn(),
    darDeBajaPlan: vi.fn(),
    listarPreciosPlan: vi.fn(),
    registrarPrecioPlan: vi.fn(),
  };
}

describe("rutas de planes", () => {
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
      gestionServicioEntrenamiento: logica as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  it("exige sesión", async () => {
    const respuesta = await request(app).get("/api/v1/planes");

    expect(respuesta.status).toBe(401);
  });

  it("lista los planes con los filtros convertidos", async () => {
    logica.listarPlanes.mockResolvedValue([plan]);

    const respuesta = await request(app)
      .get("/api/v1/planes?tipo=MENSUAL&incluirBajas=true")
      .set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(200);
    expect(logica.listarPlanes).toHaveBeenCalledWith({ tipo: "MENSUAL", incluirBajas: true });
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "PLANES_VER");
  });

  it("obtiene un plan y su historial de precios", async () => {
    logica.obtenerPlanPorId.mockResolvedValue(plan);
    logica.listarPreciosPlan.mockResolvedValue([precio]);

    const detalle = await request(app).get("/api/v1/planes/1").set("Authorization", "Bearer propietaria");
    const precios = await request(app)
      .get("/api/v1/planes/1/precios")
      .set("Authorization", "Bearer propietaria");

    expect(detalle.status).toBe(200);
    expect(precios.body).toEqual([precio]);
    expect(logica.listarPreciosPlan).toHaveBeenCalledWith(1);
  });

  it("crea un plan para la propietaria", async () => {
    logica.crearPlan.mockResolvedValue(plan);

    const respuesta = await request(app)
      .post("/api/v1/planes")
      .set("Authorization", "Bearer propietaria")
      .send({ tipo: "MENSUAL", nombre: "Básico 2 días", clases_por_semana: 2, precio: 25000 });

    expect(respuesta.status).toBe(201);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "PLANES_EDITAR");
  });

  it.each([
    ["post", "/api/v1/planes"],
    ["patch", "/api/v1/planes/1"],
    ["delete", "/api/v1/planes/1"],
    ["post", "/api/v1/planes/1/precios"],
  ] as const)("rechaza %s %s a quien no es propietaria", async (metodo, ruta) => {
    const respuesta = await request(app)[metodo](ruta).set("Authorization", "Bearer profesora").send({});

    expect(respuesta.status).toBe(403);
  });

  it("rechaza un plan sin precio con 400", async () => {
    const respuesta = await request(app)
      .post("/api/v1/planes")
      .set("Authorization", "Bearer propietaria")
      .send({ tipo: "MENSUAL", nombre: "Básico" });

    expect(respuesta.status).toBe(400);
    expect(logica.crearPlan).not.toHaveBeenCalled();
  });

  it("modifica y da de baja un plan", async () => {
    logica.actualizarPlan.mockResolvedValue(plan);
    logica.darDeBajaPlan.mockResolvedValue(plan);

    const modificado = await request(app)
      .patch("/api/v1/planes/1")
      .set("Authorization", "Bearer propietaria")
      .send({ clases_por_semana: 3 });
    const baja = await request(app).delete("/api/v1/planes/1").set("Authorization", "Bearer propietaria");

    expect(modificado.status).toBe(200);
    expect(logica.actualizarPlan).toHaveBeenCalledWith(1, { clases_por_semana: 3 });
    expect(baja.status).toBe(200);
  });

  it("registra un precio y lo audita con quien lo cargó", async () => {
    logica.registrarPrecioPlan.mockResolvedValue(precio);

    const respuesta = await request(app)
      .post("/api/v1/planes/1/precios")
      .set("Authorization", "Bearer propietaria")
      .send({ precio: 28000, fecha_vigencia_desde: "2026-11-01" });

    expect(respuesta.status).toBe(201);
    expect(logica.registrarPrecioPlan).toHaveBeenCalledWith(1, {
      precio: 28000,
      fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"auditoria":"PRECIO_PLAN_REGISTRADO"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"por":1'));
  });

  it("devuelve 409 si el plan ya tiene un precio que empezó hoy", async () => {
    logica.registrarPrecioPlan.mockRejectedValue(
      new ConflictError("El plan ya tiene un precio que empezó a regir hoy"),
    );

    const respuesta = await request(app)
      .post("/api/v1/planes/1/precios")
      .set("Authorization", "Bearer propietaria")
      .send({ precio: 28000, fecha_vigencia_desde: "2026-10-08" });

    expect(respuesta.status).toBe(409);
  });
});
