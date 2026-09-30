import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";
import type { Actividad } from "../actividad.types.js";

const actividad: Actividad = {
  id_actividad: 1,
  codigo: "CROSSFIT",
  nombre: "Crossfit",
  descripcion: null,
  modalidad: "GRUPAL",
  cupo_maximo: 20,
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
      verificarToken: (token: string) => ({
        usuarioId: token === "propietaria" ? 1 : 2,
        roles: token === "propietaria" ? ["PROPIETARIA"] : ["PROFESORA"],
      }),
    } as unknown as IAutenticacion;

    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: {} as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: logica as unknown as ILogicaServicioEntrenamiento,
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
      .send({ codigo: "CROSSFIT", nombre: "Crossfit", modalidad: "GRUPAL" });

    expect(respuesta.status).toBe(201);
    expect(logica.crearActividad).toHaveBeenCalledWith({
      codigo: "CROSSFIT",
      nombre: "Crossfit",
      modalidad: "GRUPAL",
    });
  });

  it("rechaza el alta para otros roles aunque tengan el permiso", async () => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer profesora")
      .send({ codigo: "CROSSFIT", nombre: "Crossfit", modalidad: "GRUPAL" });

    expect(respuesta.status).toBe(403);
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  it("rechaza un cupo fuera del rango de SMALLINT", async () => {
    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set("Authorization", "Bearer propietaria")
      .send({ codigo: "CROSSFIT", nombre: "Crossfit", modalidad: "GRUPAL", cupo_maximo: 32768 });

    expect(respuesta.status).toBe(400);
    expect(logica.crearActividad).not.toHaveBeenCalled();
  });

  it("actualiza una actividad", async () => {
    logica.actualizarActividad.mockResolvedValue({ ...actividad, nombre: "Crossfit avanzado" });

    const respuesta = await request(app)
      .patch("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria")
      .send({ nombre: "Crossfit avanzado" });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarActividad).toHaveBeenCalledWith(1, { nombre: "Crossfit avanzado" });
  });

  it("da de baja una actividad sin eliminar su historial", async () => {
    logica.darDeBajaActividad.mockResolvedValue({
      actividad: { ...actividad, activo: false },
      advertencia: "Atención: La actividad puede tener horarios activos.",
    });

    const respuesta = await request(app)
      .delete("/api/v1/actividades/1")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.actividad.activo).toBe(false);
    expect(logica.darDeBajaActividad).toHaveBeenCalledWith(1);
  });
});
