import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInsigniasNoConfigurada } from "../../../../__tests__/fakes/logica-insignias-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import { logicaRutinasNoConfigurada } from "../../../../__tests__/fakes/logica-rutinas-no-configurada.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { AlumnoExistenteError, ForbiddenError } from "../../../../shared/errors/app-error.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaPersonas } from "../../interface/i-logica-personas.js";

const alumno = { id_alumno: 1, estado: "INACTIVO" };
const alta = {
  nombre: "Ana",
  apellido: "López",
  email: "ana@example.com",
  fecha_nacimiento: "1995-04-20",
  dni: "40111222",
  cont_emerg_nombre: "Jorge López",
  cont_emerg_telefono: "3794 401122",
};

const ROLES_POR_TOKEN: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  alumno: { usuarioId: 3, roles: ["ALUMNO"] },
  tutor: { usuarioId: 4, roles: ["TUTOR"] },
};

function crearLogicaMock() {
  return {
    crearAlumno: vi.fn(),
    listarAlumnos: vi.fn(),
    obtenerAlumnoPorId: vi.fn(),
    actualizarAlumno: vi.fn(),
    listarAlumnosConsultables: vi.fn(),
    obtenerPanelAlumno: vi.fn(),
  };
}

describe("rutas de alumnos", () => {
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
        usuarioId: ROLES_POR_TOKEN[token]?.usuarioId ?? 2,
        roles: ROLES_POR_TOKEN[token]?.roles ?? ["PROFESORA"],
      }),
    } as unknown as IAutenticacion;

    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: logica as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      gestionHonorarios: logicaHonorariosNoConfigurada,
      gestionRutinasYProgreso: logicaRutinasNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  it("la profesora da de alta un alumno con ALUMNOS_EDITAR", async () => {
    logica.crearAlumno.mockResolvedValue(alumno);

    const respuesta = await request(app)
      .post("/api/v1/alumnos")
      .set("Authorization", "Bearer profesora")
      .send(alta);

    expect(respuesta.status).toBe(201);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "ALUMNOS_EDITAR");
    expect(logica.crearAlumno).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@example.com", fecha_nacimiento: new Date("1995-04-20") }),
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("responde 409 ALUMNO_EXISTENTE si el DNI ya es de un alumno", async () => {
    logica.crearAlumno.mockRejectedValue(new AlumnoExistenteError(7));

    const respuesta = await request(app)
      .post("/api/v1/alumnos")
      .set("Authorization", "Bearer propietaria")
      .send({ ...alta, dni: "40111222" });

    expect(respuesta.status).toBe(409);
    expect(JSON.stringify(respuesta.body)).toContain("ALUMNO_EXISTENTE");
  });

  it("lista alumnos con la paginación por defecto", async () => {
    logica.listarAlumnos.mockResolvedValue({ datos: [], total: 0, limit: 20, offset: 0 });

    const respuesta = await request(app)
      .get("/api/v1/alumnos?busqueda=lopez")
      .set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.listarAlumnos).toHaveBeenCalledWith(
      { busqueda: "lopez", limit: 20, offset: 0 },
      { idUsuario: 1, esPropietaria: true },
    );
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "ALUMNOS_VER");
  });

  it.each([
    ["el alumno", "alumno", 3],
    ["el tutor", "tutor", 4],
  ])("%s lista los alumnos que puede consultar sin pedir permisos", async (_quien, token, idUsuario) => {
    const consultables = [{ id_alumno: 3, nombre: "Ana", apellido: "López", estado: "ACTIVO", propio: true }];
    logica.listarAlumnosConsultables.mockResolvedValue(consultables);

    const respuesta = await request(app).get("/api/v1/alumnos/mios").set("Authorization", `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(consultables);
    expect(logica.listarAlumnosConsultables).toHaveBeenCalledWith({ idUsuario, esPropietaria: false });
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });

  it("GET /alumnos/mios responde 403 a quien no es alumno ni tutor", async () => {
    const respuesta = await request(app).get("/api/v1/alumnos/mios").set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(403);
    expect(logica.listarAlumnosConsultables).not.toHaveBeenCalled();
  });

  it("GET /alumnos/mi-panel devuelve el panel de quien pide, sin id y sin pedir permisos", async () => {
    logica.obtenerPanelAlumno.mockResolvedValue({ id_alumno: 4 });

    const respuesta = await request(app)
      .get("/api/v1/alumnos/mi-panel")
      .set("Authorization", "Bearer alumno");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id_alumno: 4 });
    expect(logica.obtenerPanelAlumno).toHaveBeenCalledWith(
      { idUsuario: ROLES_POR_TOKEN.alumno!.usuarioId, esPropietaria: false },
      undefined,
    );
    expect(logica.obtenerAlumnoPorId).not.toHaveBeenCalled();
  });

  it("GET /alumnos/mi-panel pasa el menor que elige el tutor y rechaza un id inválido", async () => {
    logica.obtenerPanelAlumno.mockResolvedValue({ id_alumno: 6 });

    const elegido = await request(app)
      .get("/api/v1/alumnos/mi-panel?id_alumno=6")
      .set("Authorization", "Bearer tutor");
    const invalido = await request(app)
      .get("/api/v1/alumnos/mi-panel?id_alumno=-1")
      .set("Authorization", "Bearer tutor");

    expect(elegido.status).toBe(200);
    expect(logica.obtenerPanelAlumno).toHaveBeenCalledWith(expect.anything(), 6);
    expect(invalido.status).toBe(400);
  });

  it("GET /alumnos/mi-panel responde 403 a quien no es alumno ni tutor", async () => {
    const respuesta = await request(app)
      .get("/api/v1/alumnos/mi-panel")
      .set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(403);
    expect(logica.obtenerPanelAlumno).not.toHaveBeenCalled();
  });

  it("devuelve la ficha de un alumno", async () => {
    logica.obtenerAlumnoPorId.mockResolvedValue(alumno);

    const respuesta = await request(app).get("/api/v1/alumnos/1").set("Authorization", "Bearer propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.obtenerAlumnoPorId).toHaveBeenCalledWith(1, { idUsuario: 1, esPropietaria: true });
  });

  it("modifica un alumno y deja registrado quién lo hizo y qué campos cambió", async () => {
    logica.actualizarAlumno.mockResolvedValue(alumno);

    const respuesta = await request(app)
      .patch("/api/v1/alumnos/1")
      .set("Authorization", "Bearer propietaria")
      .send({ telefono: "3794 445566" });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarAlumno).toHaveBeenCalledWith(
      1,
      { telefono: "3794 445566" },
      { idUsuario: 1, esPropietaria: true },
    );
    const auditoria = JSON.parse(warn.mock.calls.at(-1)?.[0] as string);
    expect(auditoria).toMatchObject({
      auditoria: "ALUMNO_MODIFICADO",
      por: 1,
      id_alumno: 1,
      campos: ["telefono"],
    });
  });

  it("le pasa a la lógica que pide una profesora, que decide qué alumnos tiene a cargo", async () => {
    logica.listarAlumnos.mockResolvedValue({ datos: [], total: 0, limit: 20, offset: 0 });

    const respuesta = await request(app)
      .get("/api/v1/alumnos?id_plan=3&id_actividad=4")
      .set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(200);
    expect(logica.listarAlumnos).toHaveBeenCalledWith(
      { id_plan: 3, id_actividad: 4, limit: 20, offset: 0 },
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("le pasa a la lógica el filtro por estado de cuota y rechaza un estado que no existe", async () => {
    logica.listarAlumnos.mockResolvedValue({ datos: [], total: 0, limit: 20, offset: 0 });

    const valido = await request(app)
      .get("/api/v1/alumnos?estado_cuota=VENCIDA")
      .set("Authorization", "Bearer propietaria");
    const invalido = await request(app)
      .get("/api/v1/alumnos?estado_cuota=MOROSO")
      .set("Authorization", "Bearer propietaria");

    expect(valido.status).toBe(200);
    expect(logica.listarAlumnos).toHaveBeenCalledWith(
      { estado_cuota: "VENCIDA", limit: 20, offset: 0 },
      expect.objectContaining({ esPropietaria: true }),
    );
    expect(invalido.status).toBe(400);
    expect(logica.listarAlumnos).toHaveBeenCalledTimes(1);
  });

  it("responde 403 si la profesora pide un alumno que no tiene a cargo", async () => {
    logica.obtenerAlumnoPorId.mockRejectedValue(
      new ForbiddenError("Solo puede ver y editar a los alumnos que tiene a cargo"),
    );

    const respuesta = await request(app).get("/api/v1/alumnos/1").set("Authorization", "Bearer profesora");

    expect(respuesta.status).toBe(403);
  });

  it("rechaza un alta sin nombre con 400", async () => {
    const respuesta = await request(app)
      .post("/api/v1/alumnos")
      .set("Authorization", "Bearer propietaria")
      .send({ ...alta, nombre: "" });

    expect(respuesta.status).toBe(400);
    expect(logica.crearAlumno).not.toHaveBeenCalled();
  });
});
