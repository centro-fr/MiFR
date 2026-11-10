import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { FormularioAvisos } from "@/features/notificaciones/components/formulario-avisos";
import { useParametros } from "@/features/notificaciones/hooks/use-notificaciones";

function Contenido() {
  const { data: parametros, isPending, isError, error, refetch, isFetching } = useParametros();
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando la configuración" className="space-y-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(error, "No se pudo cargar la configuración de los avisos.")}
        reintentando={isFetching}
        onReintentar={() => void refetch()}
      />
    );
  }
  return <FormularioAvisos parametros={parametros} />;
}

// US-25 y US-26: cuándo se generan los avisos automáticos. Solo la propietaria con PARAMETROS_EDITAR
// (lo exige el back); los avisos en sí los ve cada persona en su bandeja.
export function ConfiguracionAvisosPage() {
  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <Link
            to="/app/notificaciones"
            className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-pink-300"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Notificaciones
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-dark xl:text-3xl dark:text-white">Configurar avisos</h1>
          <p className="mt-1 text-sm leading-relaxed font-medium text-muted-foreground">
            Cuándo MiFR avisa de las cuotas por vencer y a qué hora te arma el resumen del día.
          </p>
        </header>
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
