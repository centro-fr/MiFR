import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebPushServicio, type EnviarNotificacion } from "../web-push-servicio.js";

const VAPID = { clavePublica: "publica", clavePrivada: "privada", contacto: "mailto:centro@example.com" };
const SUSCRIPCION = { endpoint: "https://fcm.googleapis.com/fcm/send/a", keys: { p256dh: "p", auth: "a" } };

function errorDelServicio(statusCode: number) {
  return Object.assign(new Error("Received unexpected response code"), {
    statusCode,
    endpoint: SUSCRIPCION.endpoint,
  });
}

describe("WebPushServicio", () => {
  let enviarNotificacion: ReturnType<typeof vi.fn>;
  let servicio: WebPushServicio;

  beforeEach(() => {
    enviarNotificacion = vi.fn().mockResolvedValue({ statusCode: 201 });
    servicio = new WebPushServicio(enviarNotificacion as unknown as EnviarNotificacion, VAPID);
  });

  it("enviar firma con las claves VAPID, deja el aviso guardado tres días y espera como mucho 10 segundos", async () => {
    await expect(servicio.enviar(SUSCRIPCION, "contenido")).resolves.toBe("ENTREGADO");

    expect(enviarNotificacion).toHaveBeenCalledWith(SUSCRIPCION, "contenido", {
      vapidDetails: { subject: "mailto:centro@example.com", publicKey: "publica", privateKey: "privada" },
      TTL: 259_200,
      timeout: 10_000,
    });
  });

  it.each([404, 410])("enviar da por vencido el dispositivo si el servicio responde %i", async (codigo) => {
    enviarNotificacion.mockRejectedValue(errorDelServicio(codigo));

    await expect(servicio.enviar(SUSCRIPCION, "contenido")).resolves.toBe("VENCIDA");
  });

  it("enviar lanza otro error con solo el código, sin el endpoint del dispositivo", async () => {
    enviarNotificacion.mockRejectedValue(errorDelServicio(429));

    const error = await servicio.enviar(SUSCRIPCION, "contenido").catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("El servicio de push rechazó el aviso (429)");
    expect(JSON.stringify(error)).not.toContain(SUSCRIPCION.endpoint);
  });

  it.each([
    ["sin respuesta del servicio", new Error("ECONNRESET")],
    ["con un código que no es número", Object.assign(new Error("raro"), { statusCode: "500" })],
    ["con algo que no es un error", "falló"],
  ])("enviar lanza un error sin código %s", async (_caso, falla) => {
    enviarNotificacion.mockRejectedValue(falla);

    await expect(servicio.enviar(SUSCRIPCION, "contenido")).rejects.toThrow(
      "El servicio de push rechazó el aviso (sin respuesta)",
    );
  });
});
