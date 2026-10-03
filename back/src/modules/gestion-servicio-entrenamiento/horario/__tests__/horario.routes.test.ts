import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";

function crearLogicaMock() {
  return {
    crearHorario: vi.fn(),
    listarHorarios: vi.fn(),
    obtenerHorarioPorId: vi.fn(),
    actualizarHorario: vi.fn(),
    darDeBajaHorario: vi.fn(),
  };
}

describe("rutas de horarios", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn().mockResolvedValue(true) } as unknown as IAutorizacion;
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

  it("filtra horarios por actividad y profesora", async () => {
    logica.listarHorarios.mockResolvedValue([]);

    const respuesta = await request(app)
      .get("/api/v1/horarios?id_actividad=3&id_profesora=8")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.listarHorarios).toHaveBeenCalledWith({ id_actividad: 3, id_profesora: 8 });
  });

  it("crea un horario válido para la propietaria", async () => {
    logica.crearHorario.mockResolvedValue({ id_horario: 1 });

    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer propietaria")
      .send({
        id_actividad: 3,
        id_profesora: 8,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      });

    expect(respuesta.status).toBe(201);
    expect(logica.crearHorario).toHaveBeenCalledWith({
      id_actividad: 3,
      id_profesora: 8,
      dia_semana: 1,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    });
  });

  it("rechaza una hora de fin anterior al inicio", async () => {
    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer propietaria")
      .send({
        id_actividad: 3,
        id_profesora: 8,
        dia_semana: 1,
        hora_inicio: "10:00",
        hora_fin: "09:00",
      });

    expect(respuesta.status).toBe(400);
    expect(logica.crearHorario).not.toHaveBeenCalled();
  });

  it("rechaza escrituras para roles distintos de propietaria", async () => {
    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer profesora")
      .send({
        id_actividad: 3,
        id_profesora: 8,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      });

    expect(respuesta.status).toBe(403);
    expect(logica.crearHorario).not.toHaveBeenCalled();
  });
});
