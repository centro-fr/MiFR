import { useEffect } from "react";

// Título de la pestaña (y del resultado en buscadores) de cada página. index.html trae el de la
// página pública, que es la que indexan los buscadores; al navegar dentro de la SPA cada página
// pone el suyo.
export function useTituloDelDocumento(titulo: string) {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
