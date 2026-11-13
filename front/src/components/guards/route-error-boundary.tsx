import { isRouteErrorResponse, useRouteError, useNavigate } from "react-router-dom";
import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let titulo = "Ocurrió un error inesperado";
  let mensaje = "No pudimos procesar la vista solicitada. Podés intentar recargar o volver al inicio.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      titulo = "Página no encontrada";
      mensaje = "La dirección solicitada no existe o fue movida.";
    } else if (error.status === 403) {
      titulo = "Acceso restringido";
      mensaje = "No tenés los permisos necesarios para ingresar a esta sección.";
    } else {
      titulo = `Error ${error.status}`;
      mensaje = error.statusText || mensaje;
    }
  } else if (error instanceof Error) {
    console.error("Error en ruta:", error);
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-bg-light px-6 py-12 text-center text-foreground dark:bg-canvas">
      <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">{titulo}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{mensaje}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </Button>
        <Button
          onClick={() => navigate("/")}
          className="bg-primary text-white hover:bg-primary-dark"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
