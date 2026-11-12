import { useMediaQuery } from "@/hooks/use-media-query";

const MOBILE_BREAKPOINT = 768;

/** Distingue mobile (drawer) de desktop (barra lateral colapsable): mismo corte que `md` de Tailwind. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/**
 * Hay lugar para una tabla ancha al lado del sidebar (desde 1280 px). Por debajo, en tablet y notebooks
 * chicas, la tabla no entra y se usa la lista del celular.
 */
export function useVistaAmplia(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}
