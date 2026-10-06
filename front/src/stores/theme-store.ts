import { create } from "zustand";

export type Tema = "claro" | "oscuro";

const CLAVE_TEMA = "mifr:tema";

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
      aplicarTema(siguiente);
      return { tema: siguiente };
    }),
}));

// Aplica el tema guardado (o claro por defecto) antes del primer render
// para evitar un destello del tema contrario.
export function initTema(): void {
  aplicarTema(useThemeStore.getState().tema);
}
