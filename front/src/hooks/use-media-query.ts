import { useCallback, useSyncExternalStore } from "react";

/**
 * Si la media query se cumple, siguiendo sus cambios. Para cuando el layout cambia de componente
 * (no solo de estilo) según el ancho: por ejemplo, un panel fijo en escritorio y un drawer en mobile.
 */
export function useMediaQuery(query: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const lista = window.matchMedia(query);
      lista.addEventListener("change", avisar);
      return () => lista.removeEventListener("change", avisar);
    },
    [query],
  );
  return useSyncExternalStore(suscribir, () => window.matchMedia(query).matches, () => false);
}
