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
};
const PERMISOS: Record<number, string[]> = {
  2: ["RUTINAS_VER", "RUTINAS_EDITAR"],
  7: ["RUTINAS_VER_PROPIAS"],
};
const PROFESORA = { idUsuario: 2, esPropietaria: false };

describe("rutas de progreso", () => {
  let logica: Record<string, ReturnType<typeof vi.fn>>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      registrarProgreso: vi.fn().mockResolvedValue({ id_registro: 1 }),
      listarProgresoDeAlumno: vi.fn().mockResolvedValue([]),
      actualizarProgreso: vi.fn().mockResolvedValue({ id_registro: 1 }),
      eliminarProgreso: vi.fn().mockResolvedValue(undefined),
      listarMiProgreso: vi.fn().mockResolvedValue([{ id_registro: 1 }]),
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

  function como(token: string, metodo: "get" | "post" | "patch" | "delete", ruta: string) {
    return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  }

  it("POST /progreso registra la medición con RUTINAS_EDITAR y responde 201", async () => {
    const respuesta = await como("profesora", "post", "/progreso").send({
      id_alumno: 5,
      medidas: [{ codigo: "PESO", valor: 62.5 }],
    });

    expect(respuesta.status).toBe(201);
    expect(logica.registrarProgreso).toHaveBeenCalledWith(
      expect.objectContaining({ id_alumno: 5, medidas: [{ codigo: "PESO", valor: 62.5 }] }),
      PROFESORA,
    );
  });

  it("PATCH /progreso/:id corrige la medición", async () => {
    const respuesta = await como("profesora", "patch", "/progreso/1").send({ observaciones: "Corregida" });

    expect(respuesta.status).toBe(200);
    expect(logica.actualizarProgreso).toHaveBeenCalledWith(1, { observaciones: "Corregida" }, PROFESORA);
  });

  it("PATCH /progreso/:id responde 400 sin ningún cambio", async () => {
    expect((await como("profesora", "patch", "/progreso/1").send({})).status).toBe(400);
    expect(logica.actualizarProgreso).not.toHaveBeenCalled();
  });

  it("DELETE /progreso/:id da de baja la medición y responde 204", async () => {
    const respuesta = await como("profesora", "delete", "/progreso/1");

    expect(respuesta.status).toBe(204);
    expect(logica.eliminarProgreso).toHaveBeenCalledWith(1, PROFESORA);
  });

  it.each([
    ["post", "/progreso"],
    ["patch", "/progreso/1"],
    ["delete", "/progreso/1"],
  ] as const)("%s %s responde 403 sin RUTINAS_EDITAR", async (metodo, ruta) => {
    expect((await como("alumno", metodo, ruta).send({ observaciones: "x" })).status).toBe(403);
  });

  it("GET /alumnos/:id/progreso lista las mediciones con RUTINAS_VER_PROPIAS", async () => {
    const respuesta = await como("alumno", "get", "/alumnos/5/progreso");

    expect(respuesta.status).toBe(200);
    expect(logica.listarProgresoDeAlumno).toHaveBeenCalledWith(5, { idUsuario: 7, esPropietaria: false });
  });

  it("GET /progreso/mi-progreso resuelve el alumno con la sesión", async () => {
    const respuesta = await como("alumno", "get", "/progreso/mi-progreso");

    expect(respuesta.body).toEqual([{ id_registro: 1 }]);
    expect(logica.listarMiProgreso).toHaveBeenCalledWith({ idUsuario: 7, esPropietaria: false });
  });

  it("responde 401 sin sesión", async () => {
    expect((await request(app).get("/api/v1/alumnos/5/progreso")).status).toBe(401);
  });
});
