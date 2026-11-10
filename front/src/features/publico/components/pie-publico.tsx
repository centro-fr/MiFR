import { LogoFr } from "@/components/marca/logo-fr";
import { CONTENEDOR_PUBLICO } from "./estilos-publicos";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

export function PiePublico() {
  return (
    <footer className="bg-publico-tinta">
      <div
        className={`${CONTENEDOR_PUBLICO} flex flex-col items-start gap-4 py-8 text-sm text-[#8b92a3] md:flex-row md:items-center md:justify-between md:gap-6`}
      >
        <span className="flex items-center gap-2.5 font-extrabold text-white">
          <LogoFr className="size-7" />
          {NOMBRE_DEL_CENTRO}
        </span>
        <span>© {new Date().getFullYear()} · Entrená con energía</span>
      </div>
    </footer>
  );
}
