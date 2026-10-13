import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// El login se abre desde la página pública: este acceso permite volver sin usar el botón del navegador.
// Lleva fondo propio para leerse sobre cualquiera de las variantes del login (claro, oscuro o desarrollo).
export function VolverAlInicio() {
  return (
    <Link
      to="/"
      className="fixed right-4 top-3 z-50 flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-white/10 dark:text-slate-100 dark:ring-white/15"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Volver al inicio
    </Link>
  );
}
