import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../../../../app.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaNotificaciones } from "../../interface/i-logica-notificaciones.js";

const SUSCRIPCION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/c1KrmpTuRm0",
  keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
};

describe("rutas de las suscripciones push", () => {
  let logica: Record<
    "obtenerClavePushPublica" | "suscribirDispositivo" | "desuscribirDispositivo",
    ReturnType<typeof vi.fn>
  >;
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    logica = {
      obtenerClavePushPublica: vi.fn().mockReturnValue("clave-publica"),
      suscribirDispositivo: vi.fn().mockResolvedValue(undefined),
      desuscribirDispositivo: vi.fn().mockResolvedValue(undefined),
    };
    const autenticacion = {
      validarSesion: async (token: string) =>
        token === "alumno" ? { usuarioId: 7, roles: ["ALUMNO"] } : undefined,
    } as unknown as IAutenticacion;
    autorizacion = { tienePermiso: vi.fn(async () => false) };
    app = createApp({
      gestionNotificaciones: logica as unknown as ILogicaNotificaciones,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    } as AppDependencies);
  });

  function como(metodo: "get" | "post", ruta: string) {
    return request(app)[metodo](`/api/v1/notificaciones/push${ruta}`).set("Authorization", "Bearer alumno");
  }

  it("GET /notificaciones/push/clave-publica devuelve la clave VAPID sin pedir permisos", async () => {
    const respuesta = await como("get", "/clave-publica");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ clave_publica: "clave-publica" });
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });

  it("POST /notificaciones/push/suscripciones suscribe el dispositivo a nombre de quien pide, no del cuerpo", async () => {
    const respuesta = await como("post", "/suscripciones").send({ ...SUSCRIPCION, id_usuario: 99 });

    expect(respuesta.status).toBe(204);
    expect(logica.suscribirDispositivo).toHaveBeenCalledWith(7, SUSCRIPCION);
  });

  it("POST /notificaciones/push/suscripciones responde 400 con un endpoint que no es de un servicio de push", async () => {
    const respuesta = await como("post", "/suscripciones").send({
      ...SUSCRIPCION,
      endpoint: "https://127.0.0.1/admin",
    });

    expect(respuesta.status).toBe(400);
    expect(logica.suscribirDispositivo).not.toHaveBeenCalled();
  });

  it("POST /notificaciones/push/suscripciones/baja da de baja el dispositivo de quien pide", async () => {
    const respuesta = await como("post", "/suscripciones/baja").send({ endpoint: SUSCRIPCION.endpoint });

    expect(respuesta.status).toBe(204);
    expect(logica.desuscribirDispositivo).toHaveBeenCalledWith(7, SUSCRIPCION.endpoint);
  });

  it("sin sesión responde 401 y no toca nada", async () => {
    const respuesta = await request(app).post("/api/v1/notificaciones/push/suscripciones").send(SUSCRIPCION);

    expect(respuesta.status).toBe(401);
    expect(logica.suscribirDispositivo).not.toHaveBeenCalled();
  });
});
