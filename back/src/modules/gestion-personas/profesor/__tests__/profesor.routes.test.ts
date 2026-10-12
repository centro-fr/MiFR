import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { ILogicaPersonas } from "../../interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";

function crearLogicaMock() {
  return {
    crearProfesora: vi.fn(),
    listarProfesoras: vi.fn(),
    darDeBajaProfesora: vi.fn(),
  };
}

describe("rutas de profesoras", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn().mockResolvedValue(true) } as unknown as IAutorizacion;
    const autenticacion = {
      validarSesion: async (token: string) => ({
        usuarioId: token === "propietaria" ? 1 : 2,
        roles: token === "propietaria" ? ["PROPIETARIA"] : ["PROFESORA"],
      }),
    } as unknown as IAutenticacion;

    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: logica as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  it("lista profesoras con permiso de lectura", async () => {
    logica.listarProfesoras.mockResolvedValue([]);

    const respuesta = await request(app).get("/api/v1/profesoras").set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "HORARIOS_VER");
  });

  it("crea el perfil para la propietaria", async () => {
    logica.crearProfesora.mockResolvedValue({ id_profesora: 1, id_usuario: 5 });

    const respuesta = await request(app)
      .post("/api/v1/profesoras")
      .set("Authorization", "Bearer propietaria")
      .send({ id_usuario: 5, especialidad: "Funcional" });

    expect(respuesta.status).toBe(201);
    expect(logica.crearProfesora).toHaveBeenCalledWith({ id_usuario: 5, especialidad: "Funcional" });
  });

  it("rechaza el alta para otros roles aunque tengan el permiso", async () => {
    const respuesta = await request(app)
      .post("/api/v1/profesoras")
      .set("Authorization", "Bearer profesora")
      .send({ id_usuario: 5 });

    expect(respuesta.status).toBe(403);
    expect(logica.crearProfesora).not.toHaveBeenCalled();
  });

  it("bloquea la baja para otros roles aunque tengan el permiso", async () => {
    const respuesta = await request(app)
      .delete("/api/v1/profesoras/3")
      .set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(403);
    expect(logica.darDeBajaProfesora).not.toHaveBeenCalled();
  });

  it("da de baja una profesora para la propietaria", async () => {
    logica.darDeBajaProfesora.mockResolvedValue({ id_profesora: 3, fecha_baja: "2026-10-04" });

    const respuesta = await request(app)
      .delete("/api/v1/profesoras/3")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.darDeBajaProfesora).toHaveBeenCalledWith(3);
  });

  it("responde 409 si la profesora todavía tiene horarios activos", async () => {
    logica.darDeBajaProfesora.mockRejectedValue(
      new ConflictError("Debe dar de baja los horarios activos antes que a la profesora"),
    );

    const respuesta = await request(app)
      .delete("/api/v1/profesoras/3")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(409);
  });

  it("responde 400 si el alta no trae un id_usuario válido", async () => {
    const respuesta = await request(app)
      .post("/api/v1/profesoras")
      .set("Authorization", "Bearer propietaria")
      .send({ id_usuario: "cinco" });

    expect(respuesta.status).toBe(400);
    expect(logica.crearProfesora).not.toHaveBeenCalled();
  });
});
