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

/** El tema nuevo crece en círculo desde el origen hasta cubrir la esquina más lejana. */
function revelarDesde({ x, y }: OrigenTransicion): void {
  const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
    { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
  );
}

/**
 * Revela el tema nuevo con un círculo sobre una captura del viejo. Ni animar el color de cada
 * elemento ni fundir capturas sirve: en ambos casos hay un instante en que fondo y texto quedan
 * en el mismo gris y el contenido desaparece. Con el círculo cada píxel es del tema viejo o del
 * nuevo, nunca una mezcla. Sin View Transitions (o con reduced-motion) el cambio es instantáneo.
 */
function aplicarTemaConTransicion(tema: Tema, origen: OrigenTransicion): void {
  if (typeof document.startViewTransition !== "function" || prefiereMenosMovimiento()) {
    aplicarTema(tema);
    return;
  }
  const transicion = document.startViewTransition(() => aplicarTema(tema));
  transicion.ready
    .then(() => revelarDesde(origen))
    .catch(() => {
      // El navegador salteó la animación (p. ej. otro cambio de tema en curso): el tema ya quedó aplicado.
    });
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
