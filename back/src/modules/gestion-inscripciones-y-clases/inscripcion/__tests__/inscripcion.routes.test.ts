import request from "supertest";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaInscripcionesYClases } from "../../interface/i-logica-inscripciones-y-clases.js";

const inscripcion = { id_inscripcion: 12, id_alumno: 5 };
const planYHorarios = { id_plan: 1, id_profesora: 3, ids_horarios: [8] };
const PROPIETARIA = { idUsuario: 1, esPropietaria: true };

function crearLogicaMock() {
  return {
    crearInscripcion: vi.fn().mockResolvedValue(inscripcion),
    listarInscripciones: vi.fn().mockResolvedValue([inscripcion]),
    obtenerInscripcion: vi.fn().mockResolvedValue(inscripcion),
    darDeBajaAlumno: vi.fn().mockResolvedValue(undefined),
    reactivarAlumno: vi.fn().mockResolvedValue(inscripcion),
    cambiarPlan: vi.fn().mockResolvedValue(inscripcion),
    actualizarHorarios: vi.fn().mockResolvedValue(inscripcion),
  };
}

describe("rutas de inscripciones", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
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
      gestionInscripcionesYClases: logica as unknown as ILogicaInscripcionesYClases,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  function como(token: string, metodo: "get" | "post" | "patch", ruta: string) {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  it("exige sesión", async () => {
    const respuesta = await request(app).get("/api/v1/inscripciones");

    expect(respuesta.status).toBe(401);
  });

  it("lista con los filtros convertidos y le pasa a la lógica quién pide", async () => {
    const respuesta = await como("profesora", "get", "/inscripciones?id_plan=1&estado=ACTIVA");

    expect(respuesta.status).toBe(200);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "ALUMNOS_VER");
    expect(logica.listarInscripciones).toHaveBeenCalledWith(
      { id_plan: 1, estado: "ACTIVA", limit: 100, offset: 0 },
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("obtiene una inscripción por id", async () => {
    const respuesta = await como("propietaria", "get", "/inscripciones/12");

    expect(respuesta.status).toBe(200);
    expect(logica.obtenerInscripcion).toHaveBeenCalledWith(12, PROPIETARIA);
  });

  it("pre-inscribe con ALUMNOS_EDITAR y responde 201", async () => {
    const respuesta = await como("profesora", "post", "/inscripciones").send({
      id_alumno: 5,
      ...planYHorarios,
    });

    expect(respuesta.status).toBe(201);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "ALUMNOS_EDITAR");
    expect(logica.crearInscripcion).toHaveBeenCalledWith(
      { id_alumno: 5, ...planYHorarios, sin_cargo: false },
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("rechaza horarios repetidos con 400", async () => {
    const respuesta = await como("propietaria", "post", "/inscripciones").send({
      id_alumno: 5,
      ...planYHorarios,
      ids_horarios: [8, 8],
    });

    expect(respuesta.status).toBe(400);
    expect(logica.crearInscripcion).not.toHaveBeenCalled();
  });

  it("la activación no está en la API: la dispara el cobro (US-07)", async () => {
    const respuesta = await como("propietaria", "post", "/inscripciones/12/activar");

    expect(respuesta.status).toBe(404);
  });

  it("cambia el plan y los horarios solo la propietaria", async () => {
    const cambioPlan = await como("propietaria", "post", "/inscripciones/12/cambio-plan").send(planYHorarios);
    const horarios = await como("propietaria", "patch", "/inscripciones/12/horarios").send({
      ids_horarios: [9],
    });

    expect([cambioPlan.status, horarios.status]).toEqual([200, 200]);
    expect(logica.cambiarPlan).toHaveBeenCalledWith(12, { ...planYHorarios, sin_cargo: false });
    expect(logica.actualizarHorarios).toHaveBeenCalledWith(12, { ids_horarios: [9] });
  });

  it.each([
    ["post", "/inscripciones/12/cambio-plan", planYHorarios],
    ["patch", "/inscripciones/12/horarios", { ids_horarios: [9] }],
    ["post", "/alumnos/5/baja", { motivo_baja: "ABANDONO" }],
    ["post", "/alumnos/5/reactivar", planYHorarios],
  ] as const)("rechaza %s %s a la profesora aunque tenga el permiso", async (metodo, ruta, cuerpo) => {
    const respuesta = await como("profesora", metodo, ruta).send(cuerpo);

    expect(respuesta.status).toBe(403);
  });

  it("da de baja al alumno con su motivo", async () => {
    const respuesta = await como("propietaria", "post", "/alumnos/5/baja").send({ motivo_baja: "MUDANZA" });

    expect(respuesta.status).toBe(200);
    expect(logica.darDeBajaAlumno).toHaveBeenCalledWith(5, { motivo_baja: "MUDANZA" });
  });

  it("da de baja con el detalle del motivo OTRO", async () => {
    const cuerpo = { motivo_baja: "OTRO", detalle_baja: "Se pasó a un gimnasio más cerca" };
    const respuesta = await como("propietaria", "post", "/alumnos/5/baja").send(cuerpo);

    expect(respuesta.status).toBe(200);
    expect(logica.darDeBajaAlumno).toHaveBeenCalledWith(5, cuerpo);
  });

  it("responde 400 si el detalle acompaña a un motivo que no es OTRO", async () => {
    const respuesta = await como("propietaria", "post", "/alumnos/5/baja").send({
      motivo_baja: "ECONOMICO",
      detalle_baja: "No le alcanza",
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    expect(logica.darDeBajaAlumno).not.toHaveBeenCalled();
  });

  it("no acepta CAMBIO_PLAN como motivo de baja de un alumno", async () => {
    const respuesta = await como("propietaria", "post", "/alumnos/5/baja").send({
      motivo_baja: "CAMBIO_PLAN",
    });

    expect(respuesta.status).toBe(400);
    expect(logica.darDeBajaAlumno).not.toHaveBeenCalled();
  });

  it("reactiva al alumno con una inscripción nueva y responde 201", async () => {
    const respuesta = await como("propietaria", "post", "/alumnos/5/reactivar").send(planYHorarios);

    expect(respuesta.status).toBe(201);
    expect(logica.reactivarAlumno).toHaveBeenCalledWith(5, { ...planYHorarios, sin_cargo: false });
  });
});
