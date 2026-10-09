import { create } from "zustand";

export type Tema = "claro" | "oscuro";

const CLAVE_TEMA = "mifr:tema";
/** Clase temporal en <html> que activa la transición de colores (ver index.css). */
const CLASE_TRANSICION = "cambiando-tema";
const DURACION_TRANSICION_MS = 350;
let temporizadorTransicion: number | undefined;

function temaInicial(): Tema {
  try {
    const guardado = window.localStorage.getItem(CLAVE_TEMA);
    if (guardado === "oscuro" || guardado === "claro") return guardado;
  } catch {
    // Sin almacenamiento: se usa el valor por defecto.
  }
  return "claro";
}

/** Solo durante el cambio: así la carga inicial no anima y las transiciones propias de cada componente no se pisan el resto del tiempo. */
function habilitarTransicionTemporal(): void {
  const raiz = document.documentElement;
  raiz.classList.add(CLASE_TRANSICION);
  window.clearTimeout(temporizadorTransicion);
  temporizadorTransicion = window.setTimeout(() => raiz.classList.remove(CLASE_TRANSICION), DURACION_TRANSICION_MS);
}

function aplicarTema(tema: Tema, animar = false): void {
  if (animar) habilitarTransicionTemporal();
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  document.documentElement.style.colorScheme = tema === "oscuro" ? "dark" : "light";
  try {
    window.localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento (modo privado): el tema vive solo en memoria.
  }
}

interface ThemeStore {
  tema: Tema;
  alternarTema: () => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  tema: temaInicial(),
  alternarTema: () =>
    set((estado) => {
      const siguiente: Tema = estado.tema === "oscuro" ? "claro" : "oscuro";
      aplicarTema(siguiente, true);
      return { tema: siguiente };
    }),
}));

// Aplica el tema guardado (o claro por defecto) antes del primer render
// para evitar un destello del tema contrario.
export function initTema(): void {
  aplicarTema(useThemeStore.getState().tema);
}
