import { create } from "zustand";

export type Tema = "claro" | "oscuro";

const CLAVE_TEMA = "mifr:tema";

/** Color de la barra del navegador en mobile: el mismo fondo de la app (tokens --background). */
const COLOR_BARRA: Record<Tema, string> = { claro: "#f8fafc", oscuro: "#0f131d" };

function temaInicial(): Tema {
  try {
    const guardado = window.localStorage.getItem(CLAVE_TEMA);
    if (guardado === "oscuro" || guardado === "claro") return guardado;
  } catch {
    // Sin almacenamiento: se usa el valor por defecto.
  }
  return "claro";
}

function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  document.documentElement.style.colorScheme = tema === "oscuro" ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR_BARRA[tema]);
  try {
    window.localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento (modo privado): el tema vive solo en memoria.
  }
}

function prefiereMenosMovimiento(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Punto de la pantalla (en px del viewport) desde donde se revela el tema nuevo. */
export interface OrigenTransicion {
  x: number;
  y: number;
}

// Un cambio de tema tiene que sentirse inmediato.
const DURACION_CIRCULO_MS = 250;
const DURACION_FADE_MS = 150;

let cacheSoftwareRenderer: boolean | null = null;

export function resetearDeteccionGpuParaTests(): void {
  cacheSoftwareRenderer = null;
}

/**
 * Detecta si el equipo carece de aceleración GPU por hardware o está usando un renderizador
 * por software (SwiftShader, llvmpipe, Microsoft Basic Render Driver). En estos equipos,
 * interpolar un clip-path: circle() vectorial sobre la pantalla completa a 60 fps satura la CPU
 * y genera una animación entrecortada ("a tirones").
 */
export function esRenderizadorPorSoftware(): boolean {
  if (cacheSoftwareRenderer !== null) return cacheSoftwareRenderer;
  if (typeof window === "undefined" || typeof document === "undefined") {
    cacheSoftwareRenderer = false;
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    // En jsdom (Vitest) sin paquete canvas nativo, getContext emite una advertencia a consola si no está mockeado
    if (typeof window !== "undefined" && window.navigator?.userAgent?.includes("jsdom")) {
      const fn = canvas.getContext as unknown as { _isMockFunction?: boolean };
      if (!fn._isMockFunction) {
        cacheSoftwareRenderer = false;
        return false;
      }
    }
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      cacheSoftwareRenderer = "WebGLRenderingContext" in window;
      return cacheSoftwareRenderer;
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      cacheSoftwareRenderer = false;
      return false;
    }

    const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | undefined)?.toLowerCase() ?? "";
    cacheSoftwareRenderer = /swiftshader|llvmpipe|basic render driver|software rasterizer|gallium/i.test(renderer);
    return cacheSoftwareRenderer;
  } catch {
    cacheSoftwareRenderer = false;
    return false;
  }
}

/** Revelado con fundido suave (fade), óptimo para CPU en equipos sin GPU. */
function animarFade(): void {
  document.documentElement.animate(
    { opacity: [0, 1] },
    { duration: DURACION_FADE_MS, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
  );
}

/** El tema nuevo crece en círculo desde el origen hasta cubrir la esquina más lejana. */
function revelarCirculoDesde({ x, y }: OrigenTransicion): void {
  const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
    { duration: DURACION_CIRCULO_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
  );
}

/**
 * Revela el tema nuevo. En equipos con aceleración GPU se expande un círculo desde el botón.
 * En equipos que renderizan por software (sin placa de video), se utiliza un fade liviano de opacidad.
 * Sin soporte de View Transitions o con reduced-motion, el cambio es instantáneo.
 */
function aplicarTemaConTransicion(tema: Tema, origen: OrigenTransicion): void {
  const reactivarTransiciones = pausarTransiciones();
  if (typeof document.startViewTransition !== "function" || prefiereMenosMovimiento()) {
    aplicarTema(tema);
    reactivarTransiciones();
    return;
  }
  const transicion = document.startViewTransition(() => aplicarTema(tema));
  transicion.ready
    .then(() => {
      if (esRenderizadorPorSoftware()) {
        animarFade();
      } else {
        revelarCirculoDesde(origen);
      }
    })
    .catch(() => {
      // El navegador salteó la animación (p. ej. otro cambio de tema en curso): el tema ya quedó aplicado.
    });
  void transicion.finished.finally(reactivarTransiciones);
}

// Ver la regla .cambiando-tema en index.css.
const CLASE_CAMBIANDO_TEMA = "cambiando-tema";

/**
 * Apaga las transiciones CSS mientras cambia el tema. Si no, cada elemento con transition-colors
 * (decenas por pantalla) anima su color desde el tema viejo: el navegador repinta en cada cuadro
 * mientras el círculo se expande y lo que se revela son colores a mitad de camino.
 * Devuelve la función que las vuelve a prender.
 */
function pausarTransiciones(): () => void {
  const raiz = document.documentElement;
  raiz.classList.add(CLASE_CAMBIANDO_TEMA);
  return () => {
    // Forzar el cálculo de estilos con el tema ya aplicado: si se quitara la clase antes, las
    // transiciones arrancarían igual desde los colores viejos.
    void window.getComputedStyle(raiz).color;
    raiz.classList.remove(CLASE_CAMBIANDO_TEMA);
  };
}

interface ThemeStore {
  tema: Tema;
  /** `origen`: centro del control que disparó el cambio; por defecto, la esquina superior derecha. */
  alternarTema: (origen?: OrigenTransicion) => void;
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  tema: temaInicial(),
  alternarTema: (origen = { x: window.innerWidth, y: 0 }) => {
    const siguiente: Tema = get().tema === "oscuro" ? "claro" : "oscuro";
    aplicarTemaConTransicion(siguiente, origen);
    set({ tema: siguiente });
  },
}));

// Aplica el tema guardado (o claro por defecto) antes del primer render
// para evitar un destello del tema contrario.
export function initTema(): void {
  aplicarTema(useThemeStore.getState().tema);
}
