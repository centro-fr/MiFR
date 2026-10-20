import { AlertCircle } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
        <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
        <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mensajeDeErrorApi(error, "No se pudo cargar la configuración de los avisos.")}
        </p>
        <Button type="button" onClick={() => void refetch()} disabled={isFetching} className="min-h-11 rounded-xl bg-primary font-bold text-white hover:bg-primary-dark">
          Reintentar
        </Button>
      </Card>
    );
  }
  return <FormularioAvisos parametros={parametros} />;
}

// US-25 y US-26: configuración de los avisos automáticos. La bandeja de notificaciones (la campana)
// llega en otra entrega. Solo la propietaria con PARAMETROS_EDITAR (lo exige el back).
export function NotificacionesPage() {
  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-dark xl:text-3xl dark:text-white">Notificaciones</h1>
          <p className="mt-1 text-sm leading-relaxed font-medium text-muted-foreground">
            Los avisos que MiFR genera solo. Por ahora llegan dentro del sistema, sin email ni WhatsApp.
          </p>
        </header>
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
