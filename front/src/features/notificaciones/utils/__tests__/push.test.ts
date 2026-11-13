import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { darDeBajaDispositivo } from "@/features/notificaciones/api/push-api";
import { claveEnBytes, darDeBajaEsteDispositivo, esIphone, navegadorSoportaPush } from "../push";

vi.mock("@/features/notificaciones/api/push-api", () => ({ darDeBajaDispositivo: vi.fn() }));

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/a";

function conServiceWorker(suscripcion: { endpoint: string; unsubscribe: ReturnType<typeof vi.fn> } | null) {
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { permission: "default" });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: async () => suscripcion } }) },
  });
}

describe("push", () => {
  beforeEach(() => vi.mocked(darDeBajaDispositivo).mockReset().mockResolvedValue());

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("claveEnBytes convierte la clave VAPID de base64url a bytes, con o sin relleno", () => {
    expect([...claveEnBytes("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
    expect([...claveEnBytes("AQI")]).toEqual([1, 2]);
  });

  it("esIphone reconoce iPhone y iPad, no Android", () => {
    expect(esIphone("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(esIphone("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
    expect(esIphone("Mozilla/5.0 (Linux; Android 14; SM-A546E)")).toBe(false);
  });

  it("navegadorSoportaPush necesita service worker, PushManager y Notification", () => {
    expect(navegadorSoportaPush()).toBe(false);
    conServiceWorker(null);
    expect(navegadorSoportaPush()).toBe(true);
  });

  it("darDeBajaEsteDispositivo da de baja en el back y después en el navegador", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    conServiceWorker({ endpoint: ENDPOINT, unsubscribe });

    await darDeBajaEsteDispositivo();

    expect(darDeBajaDispositivo).toHaveBeenCalledWith(ENDPOINT);
    expect(unsubscribe).toHaveBeenCalled();
    expect(vi.mocked(darDeBajaDispositivo).mock.invocationCallOrder[0]).toBeLessThan(
      unsubscribe.mock.invocationCallOrder[0],
    );
  });

  it("darDeBajaEsteDispositivo no hace nada si el dispositivo no está suscripto o no soporta push", async () => {
    await darDeBajaEsteDispositivo();
    conServiceWorker(null);
    await darDeBajaEsteDispositivo();

    expect(darDeBajaDispositivo).not.toHaveBeenCalled();
  });
});
