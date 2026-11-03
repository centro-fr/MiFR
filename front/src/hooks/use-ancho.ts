import { useLayoutEffect, useRef, useState } from "react";

/** Ancho en px del elemento (0 hasta medirlo): los gráficos SVG se dibujan con el ancho disponible. */
export function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [ref, ancho] as const;
}
