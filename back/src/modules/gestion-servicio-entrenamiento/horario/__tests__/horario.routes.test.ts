import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError } from "../../../../shared/errors/app-error.js";
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

  it("obtiene un horario por id y pasa el id como número", async () => {
    logica.obtenerHorarioPorId.mockResolvedValue({ id_horario: 4 });

    const respuesta = await request(app).get("/api/v1/horarios/4").set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(200);
    expect(logica.obtenerHorarioPorId).toHaveBeenCalledWith(4);
  });

  it.each(["abc", "0", "-3", "99999999999"])(
    "responde 400 con el id %j sin llamar a la lógica",
    async (id) => {
      const respuesta = await request(app)
        .get(`/api/v1/horarios/${id}`)
        .set("Authorization", "Bearer propietaria");

      expect(respuesta.status).toBe(400);
      expect(logica.obtenerHorarioPorId).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["empieza antes de la apertura", { hora_inicio: "06:30", hora_fin: "08:00" }],
    ["termina después del cierre", { hora_inicio: "19:00", hora_fin: "20:30" }],
  ])("rechaza un horario que %s", async (_caso, horas) => {
    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer propietaria")
      .send({ id_actividad: 3, id_profesora: 8, dia_semana: 1, ...horas });

    expect(respuesta.status).toBe(400);
    expect(logica.crearHorario).not.toHaveBeenCalled();
  });

  it("acepta un horario que ocupa exactamente de la apertura al cierre", async () => {
    logica.crearHorario.mockResolvedValue({ id_horario: 9 });

    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer propietaria")
      .send({ id_actividad: 3, id_profesora: 8, dia_semana: 1, hora_inicio: "07:00", hora_fin: "20:00" });

    expect(respuesta.status).toBe(201);
  });

  it("rechaza un PATCH que deja una hora fuera del horario del centro", async () => {
    const respuesta = await request(app)
      .patch("/api/v1/horarios/4")
      .set("Authorization", "Bearer propietaria")
      .send({ hora_fin: "21:00" });

    expect(respuesta.status).toBe(400);
    expect(logica.actualizarHorario).not.toHaveBeenCalled();
  });

  it("actualiza un horario de la propietaria", async () => {
    logica.actualizarHorario.mockResolvedValue({ id_horario: 4 });

    const respuesta = await request(app)
      .patch("/api/v1/horarios/4")
      .set("Authorization", "Bearer propietaria")
      .send({ hora_fin: "19:30", cupo_maximo: null });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarHorario).toHaveBeenCalledWith(4, { hora_fin: "19:30", cupo_maximo: null });
  });

  it("responde 400 si el PATCH no trae campos", async () => {
    const respuesta = await request(app)
      .patch("/api/v1/horarios/4")
      .set("Authorization", "Bearer propietaria")
      .send({});

    expect(respuesta.status).toBe(400);
    expect(logica.actualizarHorario).not.toHaveBeenCalled();
  });

  it("responde 409 si el horario queda superpuesto", async () => {
    logica.crearHorario.mockRejectedValue(
      new ConflictError("La profesora ya tiene un horario superpuesto ese día"),
    );

    const respuesta = await request(app)
      .post("/api/v1/horarios")
      .set("Authorization", "Bearer propietaria")
      .send({ id_actividad: 1, id_profesora: 2, dia_semana: 1, hora_inicio: "18:30", hora_fin: "19:30" });

    expect(respuesta.status).toBe(409);
  });

  it("da de baja un horario de la propietaria", async () => {
    logica.darDeBajaHorario.mockResolvedValue({ horario: { id_horario: 4 }, advertencia: "..." });

    const respuesta = await request(app)
      .delete("/api/v1/horarios/4")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.darDeBajaHorario).toHaveBeenCalledWith(4);
  });

  it.each([
    ["patch", { hora_fin: "19:30" }],
    ["delete", undefined],
  ] as const)("responde 403 a una profesora en %s", async (metodo, cuerpo) => {
    const respuesta = await request(app)
      [metodo]("/api/v1/horarios/4")
      .set("Authorization", "Bearer profesora")
      .send(cuerpo);

    expect(respuesta.status).toBe(403);
    expect(logica.actualizarHorario).not.toHaveBeenCalled();
    expect(logica.darDeBajaHorario).not.toHaveBeenCalled();
  });
});
