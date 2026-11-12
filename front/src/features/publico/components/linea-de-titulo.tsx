import type { ReactNode } from "react";

// Un renglón de un titular. El recorte (overflow hidden) deja que la animación de entrada lo haga
// subir desde abajo sin que se vea fuera de su renglón; el padding evita cortar las descendentes.
export function LineaDeTitulo({ children }: { children: ReactNode }) {
  return (
    <span data-linea="" className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
      <span className="block">{children}</span>
    </span>
  );
}
