import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetearDeteccionGpuParaTests, useThemeStore } from "../theme-store";

function metaThemeColor(): HTMLMetaElement {
  return document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
}

describe("theme-store", () => {
  beforeEach(() => {
    resetearDeteccionGpuParaTests();
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#f8fafc";
    document.head.appendChild(meta);
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ tema: "claro" });
  });

  afterEach(() => {
    resetearDeteccionGpuParaTests();
    metaThemeColor()?.remove();
    // @ts-expect-error -- limpieza del stub de View Transitions de cada test
    delete document.startViewTransition;
    // @ts-expect-error -- idem para el stub de matchMedia
    delete window.matchMedia;
    // @ts-expect-error -- idem para el stub de animate
    delete document.documentElement.animate;
    vi.restoreAllMocks();
  });

  it("sin View Transitions cambia al instante: clase dark, barra del navegador y preferencia guardada", () => {
    useThemeStore.getState().alternarTema();

    expect(useThemeStore.getState().tema).toBe("oscuro");
    expect(document.documentElement).toHaveClass("dark");
    expect(metaThemeColor().content).toBe("#0f131d");
    expect(window.localStorage.getItem("mifr:tema")).toBe("oscuro");
  });

  it("con View Transitions y GPU aplica el tema y lo revela en círculo desde el origen", async () => {
    const startViewTransition = vi.fn((actualizar: () => void) => {
      expect(document.documentElement).not.toHaveClass("dark"); // la captura vieja se toma antes del cambio
      actualizar();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });
    const animate = vi.fn();
    Object.assign(document, { startViewTransition });
    Object.assign(document.documentElement, { animate });

    useThemeStore.getState().alternarTema({ x: 100, y: 20 });
    await Promise.resolve();

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveClass("dark");
    const [keyframes, opciones] = animate.mock.calls[0];
    expect(keyframes.clipPath[0]).toBe("circle(0px at 100px 20px)");
    expect(opciones.pseudoElement).toBe("::view-transition-new(root)");
  });

  it("con View Transitions pero en renderizador por software (sin GPU) aplica un fade liviano", async () => {
    const startViewTransition = vi.fn((actualizar: () => void) => {
      actualizar();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });
    const animate = vi.fn();
    Object.assign(document, { startViewTransition });
    Object.assign(document.documentElement, { animate });

    // Simulamos que el navegador reporta un renderizador por software (ej. SwiftShader o Basic Render Driver)
    const mockGl = {
      getExtension: vi.fn(() => ({ UNMASKED_RENDERER_WEBGL: 0x9246 })),
      getParameter: vi.fn(() => "Google SwiftShader"),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((tipo: string) => {
      if (tipo === "webgl" || tipo === "experimental-webgl") return mockGl as unknown as WebGLRenderingContext;
      return null;
    });

    useThemeStore.getState().alternarTema({ x: 100, y: 20 });
    await Promise.resolve();

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveClass("dark");
    const [keyframes, opciones] = animate.mock.calls[0];
    expect(keyframes.opacity).toEqual([0, 1]);
    expect(opciones.pseudoElement).toBe("::view-transition-new(root)");
  });

  it("con reduced-motion no anima aunque el navegador soporte View Transitions", () => {
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });
    // jsdom no implementa matchMedia: se simula una persona con "reducir movimiento" activado.
    Object.assign(window, { matchMedia: vi.fn(() => ({ matches: true })) });

    useThemeStore.getState().alternarTema();

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("vuelve a claro en el segundo cambio", () => {
    useThemeStore.getState().alternarTema();
    useThemeStore.getState().alternarTema();

    expect(document.documentElement).not.toHaveClass("dark");
    expect(metaThemeColor().content).toBe("#f8fafc");
  });
});
