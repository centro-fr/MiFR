import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "../theme-store";

function metaThemeColor(): HTMLMetaElement {
  return document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
}

describe("theme-store", () => {
  beforeEach(() => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#f8fafc";
    document.head.appendChild(meta);
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ tema: "claro" });
  });

  afterEach(() => {
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

  it("con View Transitions aplica el tema dentro de la transición y lo revela en círculo desde el origen", async () => {
    const startViewTransition = vi.fn((actualizar: () => void) => {
      expect(document.documentElement).not.toHaveClass("dark"); // la captura vieja se toma antes del cambio
      actualizar();
      return { ready: Promise.resolve() };
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
