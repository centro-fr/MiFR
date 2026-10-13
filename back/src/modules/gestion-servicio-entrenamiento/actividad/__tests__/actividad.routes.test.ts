import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { Actividad } from "../actividad.types.js";

const actividad: Actividad = {
  id_actividad: 1,
  codigo: "HIIT",
  nombre: "HIIT",
  descripcion: null,
  modalidad: "GRUPAL",
  cupo_maximo: 20,
  requiere_medidas: false,
  activo: true,
};

function crearLogicaMock() {
  return {
    crearActividad: vi.fn(),
    listarActividades: vi.fn(),
    obtenerActividadPorId: vi.fn(),
    actualizarActividad: vi.fn(),
    darDeBajaActividad: vi.fn(),
  };
}

describe("rutas de actividades", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = {
      tienePermiso: vi.fn(async () => true),
    } as unknown as IAutorizacion;

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
      autenticacion,
      autorizacion,
    });
  });

  it("lista actividades y aplica el filtro de búsqueda", async () => {
    logica.listarActividades.mockResolvedValue([actividad]);

    const respuesta = await request(app)
      .get("/api/v1/actividades?busqueda=cross")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.listarActividades).toHaveBeenCalledWith({ busqueda: "cross" });
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "ACTIVIDADES_VER");
  });

  it("crea una actividad para la propietaria", async () => {
    logica.crearActividad.mockResolvedValue(actividad);

    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "HIIT", nombre: "HIIT", modalidad: "GRUPAL" });

    expect(respuesta.status).toBe(201);
    expect(logica.crearActividad).toHaveBeenCalledWith({
      codigo: "HIIT",
      nombre: "HIIT",
      modalidad: "GRUPAL",
    });
  });

  it("rechaza el alta para otros roles aunque tengan el permiso", async () => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer profesora")
      .send({ codigo: "HIIT", nombre: "HIIT", modalidad: "GRUPAL" });

    expect(respuesta.status).toBe(403);
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  it("rechaza un cupo fuera del rango de SMALLINT", async () => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "HIIT", nombre: "HIIT", modalidad: "GRUPAL", cupo_maximo: 32768 });

    expect(respuesta.status).toBe(400);
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  // Sin validación, el carácter nulo llegaba a Postgres, que lo rechaza, y la API respondía 500.
  it.each([
    ["un nombre sin letras", { nombre: "-0" }],
    ["un carácter nulo", { nombre: "Cross\u0000fit" }],
    ["un cupo negativo", { cupo_maximo: -1 }],
    ["un cupo de -0", { cupo_maximo: -0 }],
  ])("responde 400 y no llega al service con %s", async (_caso, cambio) => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "HIIT", nombre: "HIIT", modalidad: "GRUPAL", ...cambio });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  it("actualiza una actividad", async () => {
    logica.actualizarActividad.mockResolvedValue({ ...actividad, nombre: "HIIT avanzado" });

    const respuesta = await request(app)
      .patch("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria")
      .send({ nombre: "HIIT avanzado" });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarActividad).toHaveBeenCalledWith(1, { nombre: "HIIT avanzado" });
  });

  it("permite quitar el cupo al pasar a GRUPAL", async () => {
    logica.actualizarActividad.mockResolvedValue({ ...actividad, modalidad: "GRUPAL", cupo_maximo: null });

    const respuesta = await request(app)
      .patch("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria")
      .send({ modalidad: "GRUPAL", cupo_maximo: null });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarActividad).toHaveBeenCalledWith(1, { modalidad: "GRUPAL", cupo_maximo: null });
  });

  it("da de baja una actividad sin eliminar su historial", async () => {
    logica.darDeBajaActividad.mockResolvedValue({ ...actividad, activo: false });

    const respuesta = await request(app)
      .delete("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.activo).toBe(false);
    expect(logica.darDeBajaActividad).toHaveBeenCalledWith(1);
  });

  it("responde 409 si la actividad todavía tiene horarios activos", async () => {
    logica.darDeBajaActividad.mockRejectedValue(
      new ConflictError("La actividad tiene horarios activos: hay que darlos de baja antes que la actividad"),
    );

    const respuesta = await request(app)
      .delete("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.message).toContain("horarios activos");
  });

  it("obtiene una actividad por id con permiso de lectura", async () => {
    logica.obtenerActividadPorId.mockResolvedValue(actividad);

    const respuesta = await request(app)
      .get("/api/v1/actividades/1")
      .set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(200);
    expect(logica.obtenerActividadPorId).toHaveBeenCalledWith(1);
  });

  it("CA-02 responde 400 al crear una PERSONALIZADA sin cupo", async () => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "PERS", nombre: "Personalizada", modalidad: "PERSONALIZADA" });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.details.fieldErrors.cupo_maximo).toBeDefined();
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  it("CA-01 crea una GRUPAL sin cupo", async () => {
    logica.crearActividad.mockResolvedValue({ ...actividad, cupo_maximo: null });

    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "GRUP", nombre: "Grupal", modalidad: "GRUPAL" });

    expect(respuesta.status).toBe(201);
  });
});
