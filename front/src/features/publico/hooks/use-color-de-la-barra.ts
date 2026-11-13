import { useEffect } from "react";

// Pinta la barra del navegador del celular (meta theme-color) mientras la página está montada y al
// salir devuelve la que había, que es la del tema del sistema.
export function useColorDeLaBarra(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const anterior = meta.content;
    meta.content = color;
    return () => {
      meta.content = anterior;
    };
  }, [color]);
}
