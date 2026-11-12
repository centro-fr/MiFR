import { CONTENEDOR_PUBLICO } from "./estilos-publicos";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

export function PiePublico() {
  return (
    <footer className={`${CONTENEDOR_PUBLICO} pb-8 pt-6 text-[13px] text-publico-texto-tenue`}>
      {NOMBRE_DEL_CENTRO} · © {new Date().getFullYear()}
    </footer>
  );
}
