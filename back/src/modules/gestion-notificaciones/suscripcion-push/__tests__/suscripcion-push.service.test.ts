import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IServicioWebPush } from "../interface/i-servicio-web-push.js";
import type { SuscripcionPushRepository } from "../suscripcion-push.repository.js";
import { SuscripcionPushService } from "../suscripcion-push.service.js";

const ENDPOINT_A = "https://fcm.googleapis.com/fcm/send/a";
const ENDPOINT_B = "https://web.push.apple.com/b";
const DATOS = { endpoint: ENDPOINT_A, keys: { p256dh: "clave-p256dh", auth: "clave-auth" } };
const AVISO = { titulo: "Cuota vencida", cuerpo: "Tu cuota venció", url: "/app/inicio", etiqueta: "cuota-1" };

function fila(endpoint: string) {
  return {
    id_suscripcion: 1,
    id_usuario: 7,
    endpoint,
    clave_p256dh: "p",
    clave_auth: "a",
    fecha_alta: new Date(),
  };
}

function crearRepositorioMock() {
  return {
    guardar: vi.fn().mockResolvedValue(fila(ENDPOINT_A)),
    borrarDeUsuario: vi.fn().mockResolvedValue(undefined),
    listarDeUsuario: vi.fn().mockResolvedValue([fila(ENDPOINT_A), fila(ENDPOINT_B)]),
    borrar: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SuscripcionPushService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let servicioWebPush: { enviar: ReturnType<typeof vi.fn> };
  let servicio: SuscripcionPushService;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    servicioWebPush = { enviar: vi.fn().mockResolvedValue("ENTREGADO") };
    servicio = new SuscripcionPushService(
      repositorio as unknown as SuscripcionPushRepository,
      servicioWebPush as unknown as IServicioWebPush,
      "clave-publica",
    );
    log = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => log.mockRestore());

  it("clavePublica devuelve la clave VAPID para el navegador", () => {
    expect(servicio.clavePublica()).toBe("clave-publica");
  });

  it("suscribir guarda el dispositivo a nombre de quien pide", async () => {
    await servicio.suscribir(7, DATOS);
    expect(repositorio.guardar).toHaveBeenCalledWith(7, DATOS);
  });

  it("desuscribir borra solo el dispositivo de ese usuario", async () => {
    await servicio.desuscribir(7, ENDPOINT_A);
    expect(repositorio.borrarDeUsuario).toHaveBeenCalledWith(7, ENDPOINT_A);
  });

  it("enviarAUsuario manda el aviso a cada dispositivo del usuario, con sus claves", async () => {
    await servicio.enviarAUsuario(7, AVISO);

    expect(repositorio.listarDeUsuario).toHaveBeenCalledWith(7);
    expect(servicioWebPush.enviar).toHaveBeenCalledTimes(2);
    expect(servicioWebPush.enviar).toHaveBeenCalledWith(
      { endpoint: ENDPOINT_A, keys: { p256dh: "p", auth: "a" } },
      JSON.stringify(AVISO),
    );
  });

  it("enviarAUsuario borra el dispositivo que el servicio de push da por vencido", async () => {
    servicioWebPush.enviar.mockResolvedValueOnce("VENCIDA");

    await servicio.enviarAUsuario(7, AVISO);

    expect(repositorio.borrar).toHaveBeenCalledTimes(1);
    expect(repositorio.borrar).toHaveBeenCalledWith(ENDPOINT_A);
  });

  it("enviarAUsuario no falla si un dispositivo falla: deja el error en el log y sigue con los demás", async () => {
    servicioWebPush.enviar.mockRejectedValueOnce(new Error("El servicio de push rechazó el aviso (500)"));

    await expect(servicio.enviarAUsuario(7, AVISO)).resolves.toBeUndefined();

    expect(servicioWebPush.enviar).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("AVISO_PUSH"), expect.any(Error));
  });

  it("enviarAUsuario no falla si no puede leer las suscripciones", async () => {
    repositorio.listarDeUsuario.mockRejectedValue(new Error("base caída"));

    await expect(servicio.enviarAUsuario(7, AVISO)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("AVISO_PUSH"), expect.any(Error));
  });

  it("sin claves VAPID no manda nada ni consulta la base, y no hay clave pública", async () => {
    const sinPush = new SuscripcionPushService(
      repositorio as unknown as SuscripcionPushRepository,
      null,
      null,
    );

    await sinPush.enviarAUsuario(7, AVISO);

    expect(sinPush.clavePublica()).toBeNull();
    expect(repositorio.listarDeUsuario).not.toHaveBeenCalled();
  });
});
