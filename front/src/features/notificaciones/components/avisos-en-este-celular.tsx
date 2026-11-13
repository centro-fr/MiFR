import { BellOff, BellRing, Loader2, Smartphone } from "lucide-react";
import { TarjetaDeDatos } from "@/components/ficha/piezas-ficha";
import { Button } from "@/components/ui/button";
import {
  useAvisosEnEsteCelular,
  type EstadoAvisosPush,
} from "@/features/notificaciones/hooks/use-avisos-en-este-celular";

// Lo que se le explica a la persona en cada estado. Los avisos igual están en la campana: el push es
// solo para enterarse sin entrar a MiFR.
const EXPLICACION: Record<EstadoAvisosPush, string> = {
  cargando: "Revisando si este celular recibe avisos…",
  "no-soportado": "Este navegador no puede recibir avisos. Los vas a ver igual en la campana de MiFR.",
  "instalar-primero":
    "En iPhone, agregá MiFR a la pantalla de inicio (Compartir → Agregar a inicio) y abrilo desde ahí para activar los avisos.",
  "no-disponible": "Los avisos en el celular no están disponibles por ahora. Los vas a ver en la campana de MiFR.",
  bloqueado:
    "Bloqueaste las notificaciones de MiFR. Para activarlas, permitilas desde la configuración del navegador.",
  activos: "Te avisamos en este celular cuando tu cuota esté por vencer o se venza.",
  inactivos: "Activalos para enterarte en este celular cuando tu cuota esté por vencer o se venza.",
};

export function AvisosEnEsteCelular() {
  const { estado, activar, desactivar, procesando, error } = useAvisosEnEsteCelular();
  const puedeCambiar = estado === "activos" || estado === "inactivos";

  return (
    <TarjetaDeDatos titulo="Avisos en este celular">
      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          {estado === "activos" ? (
            <BellRing aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : estado === "inactivos" ? (
            <BellOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Smartphone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{EXPLICACION[estado]}</span>
        </p>
        {puedeCambiar && (
          <Button
            type="button"
            variant={estado === "activos" ? "outline" : "default"}
            onClick={estado === "activos" ? desactivar : activar}
            disabled={procesando}
            className="h-11 shrink-0 rounded-xl font-bold"
          >
            {procesando && <Loader2 aria-hidden="true" className="animate-spin" />}
            {estado === "activos" ? "Desactivar avisos" : "Activar avisos"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="pt-3 text-sm font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </TarjetaDeDatos>
  );
}
