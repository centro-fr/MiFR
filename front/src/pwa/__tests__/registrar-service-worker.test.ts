import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarServiceWorker } from "../registrar-service-worker";

function conServiceWorker(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
}

describe("registrarServiceWorker", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.restoreAllMocks();
  });

  it("en el build publicado registra /sw.js cuando termina de cargar la página", () => {
    const register = vi.fn().mockResolvedValue({});
    conServiceWorker(register);

    registrarServiceWorker({ PROD: true });
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("en desarrollo no registra nada: el service worker de MSW ocupa el mismo alcance", () => {
    const register = vi.fn();
    conServiceWorker(register);

    registrarServiceWorker({ PROD: false });
    window.dispatchEvent(new Event("load"));

    expect(register).not.toHaveBeenCalled();
  });

  it("sin soporte de service worker no hace nada", () => {
    expect(() => registrarServiceWorker({ PROD: true })).not.toThrow();
  });

  it("si el registro falla deja un aviso en la consola y el sistema sigue", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    conServiceWorker(vi.fn().mockRejectedValue(new Error("sin HTTPS")));

    registrarServiceWorker({ PROD: true });
    window.dispatchEvent(new Event("load"));

    await vi.waitFor(() => expect(aviso).toHaveBeenCalledWith(expect.stringContaining("service worker"), expect.any(Error)));
  });
});
