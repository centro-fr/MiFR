import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { AlumnoExistenteError, ForbiddenError } from "../../../../shared/errors/app-error.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaPersonas } from "../../interface/i-logica-personas.js";

const alumno = { id_alumno: 1, estado: "INACTIVO" };
const alta = { nombre: "Ana", apellido: "López", email: "ana@example.com", fecha_nacimiento: "1995-04-20" };

function crearLogicaMock() {
  return {
    crearAlumno: vi.fn(),
    listarAlumnos: vi.fn(),
    obtenerAlumnoPorId: vi.fn(),
    actualizarAlumno: vi.fn(),
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
