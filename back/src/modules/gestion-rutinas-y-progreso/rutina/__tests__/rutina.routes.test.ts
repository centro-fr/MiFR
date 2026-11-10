import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaRutinasYProgreso } from "../../interface/i-logica-rutinas-y-progreso.js";

// La profesora (usuario 2) tiene RUTINAS_VER y RUTINAS_EDITAR; el alumno (usuario 7), solo RUTINAS_VER_PROPIAS.
const SESIONES: Record<string, { usuarioId: number; roles: string[] }> = {
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
  alumno: { usuarioId: 7, roles: ["ALUMNO"] },
  invitado: { usuarioId: 9, roles: [] },
};
const PERMISOS: Record<number, string[]> = {
  2: ["RUTINAS_VER", "RUTINAS_EDITAR"],
  7: ["RUTINAS_VER_PROPIAS"],
};

const RUTINA = {
  id_alumno: 5,
  nombre: "Adaptación Fuerza",
  fecha_desde: "2026-11-01",
  contenido: {
    dias: [{ nombre: "Día 1", ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10" }] }],
  },
};

describe("rutas de rutinas", () => {
  let logica: Record<string, ReturnType<typeof vi.fn>>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      crearRutina: vi.fn().mockResolvedValue({ id_rutina: 1 }),
      actualizarRutina: vi.fn().mockResolvedValue({ id_rutina: 1 }),
      listarRutinasDeAlumno: vi.fn().mockResolvedValue([{ id_rutina: 1 }]),
      obtenerRutinaVigente: vi.fn().mockResolvedValue(null),
      obtenerMiRutina: vi.fn().mockResolvedValue({ id_rutina: 1 }),
      listarMiRutinas: vi.fn().mockResolvedValue([]),
    };
    const autenticacion = {
      validarSesion: async (token: string) => SESIONES[token],
    } as unknown as IAutenticacion;
    const autorizacion = {
      tienePermiso: vi.fn(
        async (idUsuario: number, codigo: string) => PERMISOS[idUsuario]?.includes(codigo) ?? false,
      ),
    };
    app = createApp({
      gestionRutinasYProgreso: logica as unknown as ILogicaRutinasYProgreso,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    } as AppDependencies);
  });

  function como(token: string, metodo: "get" | "post", ruta: string) {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  it("POST /rutinas carga la rutina con RUTINAS_EDITAR y responde 201", async () => {
    const respuesta = await como("profesora", "post", "/rutinas").send(RUTINA);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ id_rutina: 1 });
    expect(logica.crearRutina).toHaveBeenCalledWith(
      expect.objectContaining({ id_alumno: 5, nombre: "Adaptación Fuerza" }),
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("POST /rutinas responde 403 sin RUTINAS_EDITAR", async () => {
    expect((await como("alumno", "post", "/rutinas").send(RUTINA)).status).toBe(403);
    expect(logica.crearRutina).not.toHaveBeenCalled();
  });

  it("PUT /rutinas/:id actualiza la rutina con RUTINAS_EDITAR y responde 200", async () => {
    const respuesta = await request(app)
      .put("/api/v1/rutinas/1")
      .set("Authorization", "Bearer profesora")
      .send({ nombre: "Rutina Editada" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id_rutina: 1 });
    expect(logica.actualizarRutina).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nombre: "Rutina Editada" }),
      { idUsuario: 2, esPropietaria: false },
    );
  });

  it("PUT /rutinas/:id responde 403 sin RUTINAS_EDITAR", async () => {
    const respuesta = await request(app)
      .put("/api/v1/rutinas/1")
      .set("Authorization", "Bearer alumno")
      .send({ nombre: "Rutina Editada" });

    expect(respuesta.status).toBe(403);
    expect(logica.actualizarRutina).not.toHaveBeenCalled();
  });

  it.each([
    ["con RUTINAS_VER", "profesora", 2],
    ["con RUTINAS_VER_PROPIAS", "alumno", 7],
  ])("GET /alumnos/:id/rutinas lista el historial %s", async (_permiso, token, idUsuario) => {
    const respuesta = await como(token, "get", "/alumnos/5/rutinas");

    expect(respuesta.status).toBe(200);
    expect(logica.listarRutinasDeAlumno).toHaveBeenCalledWith(5, { idUsuario, esPropietaria: false });
  });

  it("GET /alumnos/:id/rutinas/vigente responde 200 con null si no hay rutina", async () => {
    const respuesta = await como("alumno", "get", "/alumnos/5/rutinas/vigente");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toBeNull();
    expect(logica.obtenerRutinaVigente).toHaveBeenCalledWith(5, { idUsuario: 7, esPropietaria: false });
  });

  it("GET /alumnos/:id/rutinas responde 400 con un id inválido", async () => {
    expect((await como("profesora", "get", "/alumnos/01/rutinas")).status).toBe(400);
    expect(logica.listarRutinasDeAlumno).not.toHaveBeenCalled();
  });

  it("GET /rutinas/mi-rutina y /rutinas/mis-rutinas resuelven el alumno con la sesión", async () => {
    const vigente = await como("alumno", "get", "/rutinas/mi-rutina");
    const historial = await como("alumno", "get", "/rutinas/mis-rutinas");

    expect(vigente.body).toEqual({ id_rutina: 1 });
    expect(historial.body).toEqual([]);
    expect(logica.obtenerMiRutina).toHaveBeenCalledWith({ idUsuario: 7, esPropietaria: false });
    expect(logica.listarMiRutinas).toHaveBeenCalledWith({ idUsuario: 7, esPropietaria: false });
  });

  it("responde 403 sin ninguno de los dos permisos de lectura", async () => {
    expect((await como("invitado", "get", "/rutinas/mi-rutina")).status).toBe(403);
    expect(logica.obtenerMiRutina).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    expect((await request(app).get("/api/v1/alumnos/5/rutinas")).status).toBe(401);
  });
});
