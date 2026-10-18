import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";

const profesora = { idUsuario: 2, esPropietaria: false };

function crearLogicaMock() {
  return {
    listarClasesDeHoy: vi.fn().mockResolvedValue([]),
    obtenerAsistenciaDeClase: vi.fn().mockResolvedValue({ clase: { id_clase: 20 }, inscriptos: [] }),
    marcarAsistencia: vi.fn().mockResolvedValue(undefined),
    marcarTodosPresentes: vi.fn().mockResolvedValue(undefined),
    cerrarAsistencia: vi.fn().mockResolvedValue({ id_clase: 20, estado: "DICTADA" }),
    listarClasesDeFecha: vi.fn().mockResolvedValue([]),
    cancelarClase: vi.fn().mockResolvedValue({ id_clase: 20, estado: "CANCELADA" }),
  };
}

describe("rutas de clases y asistencia", () => {
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
      gestionInscripcionesYClases: { ...logicaInscripcionesNoConfigurada, ...logica },
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  function como(metodo: "get" | "put" | "post", ruta: string, token = "profesora") {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  it("GET /clases/hoy pasa quién pide a la lógica", async () => {
    const respuesta = await como("get", "/clases/hoy", "propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.listarClasesDeHoy).toHaveBeenCalledWith({ idUsuario: 1, esPropietaria: true });
  });

  it("exige sesión antes de exponer las clases", async () => {
    const respuesta = await request(app).get("/api/v1/clases/hoy");

    expect(respuesta.status).toBe(401);
    expect(logica.listarClasesDeHoy).not.toHaveBeenCalled();
  });

  it.each([
    ["get", "/clases/hoy"],
    ["get", "/clases/20/asistencia"],
    ["put", "/clases/20/asistencia/5"],
    ["post", "/clases/20/asistencia/todos-presentes"],
    ["post", "/clases/20/cerrar"],
    ["get", "/clases?fecha=2026-10-01"],
    ["post", "/clases/20/cancelar"],
  ] as const)("%s %s responde 403 sin ASISTENCIAS_MARCAR", async (metodo, ruta) => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

    const respuesta = await como(metodo, ruta).send({ asistio: true });

    expect(respuesta.status).toBe(403);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "ASISTENCIAS_MARCAR");
    expect(Object.values(logica).every((operacion) => operacion.mock.calls.length === 0)).toBe(true);
  });

  it.each([
    ["get", "/clases/01/asistencia", undefined],
    ["put", "/clases/20/asistencia/-0", { asistio: true }],
    ["put", "/clases/20/asistencia/5", { asistio: "true" }],
    ["put", "/clases/20/asistencia/5", {}],
    ["post", "/clases/0/asistencia/todos-presentes", undefined],
    ["post", "/clases/1e1/cerrar", undefined],
  ] as const)(
    "%s %s con entrada inválida responde 400 sin llegar a la lógica",
    async (metodo, ruta, body) => {
      const respuesta = await como(metodo, ruta).send(body);

      expect(respuesta.status).toBe(400);
      expect(Object.values(logica).every((operacion) => operacion.mock.calls.length === 0)).toBe(true);
    },
  );

  it("GET /clases/:id/asistencia devuelve la clase y su lista", async () => {
    const respuesta = await como("get", "/clases/20/asistencia");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ clase: { id_clase: 20 }, inscriptos: [] });
    expect(logica.obtenerAsistenciaDeClase).toHaveBeenCalledWith(20, profesora);
  });

  it("PUT /clases/:id/asistencia/:idAlumno guarda la marca y descarta los campos de más", async () => {
    const respuesta = await como("put", "/clases/20/asistencia/5").send({
      asistio: false,
      id_usuario_registra: 99,
    });

    expect(respuesta.status).toBe(200);
    expect(logica.marcarAsistencia).toHaveBeenCalledWith(20, 5, { asistio: false }, profesora);
  });

  it("POST todos-presentes y cerrar llegan a la lógica con la clase y quién pide", async () => {
    const todos = await como("post", "/clases/20/asistencia/todos-presentes");
    const cierre = await como("post", "/clases/20/cerrar");

    expect(todos.status).toBe(200);
    expect(logica.marcarTodosPresentes).toHaveBeenCalledWith(20, profesora);
    expect(cierre.status).toBe(200);
    expect(cierre.body).toMatchObject({ estado: "DICTADA" });
    expect(logica.cerrarAsistencia).toHaveBeenCalledWith(20, profesora);
  });

  it("GET /clases?fecha= lleva a la lógica la fecha convertida y quién pide", async () => {
    const respuesta = await como("get", "/clases?fecha=2026-10-01", "propietaria");

    expect(respuesta.status).toBe(200);
    expect(logica.listarClasesDeFecha).toHaveBeenCalledWith(new Date("2026-10-01T00:00:00Z"), {
      idUsuario: 1,
      esPropietaria: true,
    });
  });

  it.each(["", "?fecha=2026-02-30", "?fecha=2999-01-01"])(
    "GET /clases%s responde 400 sin llegar a la lógica",
    async (consulta) => {
      const respuesta = await como("get", `/clases${consulta}`, "propietaria");

      expect(respuesta.status).toBe(400);
      expect(logica.listarClasesDeFecha).not.toHaveBeenCalled();
    },
  );

  it("POST /clases/:id/cancelar cancela la clase de la propietaria", async () => {
    const respuesta = await como("post", "/clases/20/cancelar", "propietaria");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ estado: "CANCELADA" });
    expect(logica.cancelarClase).toHaveBeenCalledWith(20, { idUsuario: 1, esPropietaria: true });
  });

  it.each([
    ["get", "/clases?fecha=2026-10-01"],
    ["post", "/clases/20/cancelar"],
  ] as const)("%s %s es solo de la propietaria: la profesora recibe 403", async (metodo, ruta) => {
    const respuesta = await como(metodo, ruta);

    expect(respuesta.status).toBe(403);
    expect(logica.listarClasesDeFecha).not.toHaveBeenCalled();
    expect(logica.cancelarClase).not.toHaveBeenCalled();
  });

  it("PUT /clases/:id/asistencia/:idAlumno lleva las observaciones", async () => {
    const respuesta = await como("put", "/clases/20/asistencia/5").send({
      asistio: true,
      observaciones: "Llegó tarde",
    });

    expect(respuesta.status).toBe(200);
    expect(logica.marcarAsistencia).toHaveBeenCalledWith(
      20,
      5,
      { asistio: true, observaciones: "Llegó tarde" },
      profesora,
    );
  });

  it("traduce los errores de negocio a 404 y 409", async () => {
    logica.obtenerAsistenciaDeClase.mockRejectedValue(new NotFoundError("Clase no encontrada"));
    logica.marcarAsistencia.mockRejectedValue(new ConflictError("La asistencia de la clase está cerrada"));

    const ajena = await como("get", "/clases/20/asistencia");
    const cerrada = await como("put", "/clases/20/asistencia/5").send({ asistio: true });

    expect(ajena.status).toBe(404);
    expect(cerrada.status).toBe(409);
  });
});
