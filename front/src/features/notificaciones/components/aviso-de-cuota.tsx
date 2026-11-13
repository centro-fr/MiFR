import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconoNotificacion, MomentoNotificacion } from "@/features/notificaciones/components/partes-notificacion";
import {
  NOTIFICACIONES_POR_PAGINA,
  useMarcarNotificacionLeida,
  useMisNotificaciones,
} from "@/features/notificaciones/hooks/use-notificaciones";
import type { Notificacion } from "@/features/notificaciones/schemas/notificaciones";
import { destinoDe, PRESENTACION_POR_TIPO } from "@/features/notificaciones/utils/presentacion";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { cn } from "@/utils/cn";

const ESTILO_POR_TIPO: Partial<Record<Notificacion["tipo"], string>> = {
  CUOTA_POR_VENCER:
    "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  CUOTA_VENCIDA: "border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100",
};

function esAvisoDeCuotaSinLeer(notificacion: Notificacion): boolean {
  return !notificacion.leida && notificacion.tipo in ESTILO_POR_TIPO;
}

/**
 * US-25: el aviso de cuota sin leer más reciente, destacado en el inicio del alumno o del tutor.
 * Cuándo avisar lo decide el back (días previos configurados, gracia, transferencia pendiente,
 * renovación, tutor): acá solo se muestra. Comparte la consulta con la campana, que ya muestra el
 * error si falla, así que sin datos el aviso simplemente no aparece.
 */
export function AvisoDeCuota() {
  const { data } = useMisNotificaciones(NOTIFICACIONES_POR_PAGINA);
  const marcarLeida = useMarcarNotificacionLeida();
  const { roles } = usePermissions();
  // El back manda primero las no leídas y, entre ellas, las más nuevas.
  const aviso = data?.datos.find(esAvisoDeCuotaSinLeer);
  if (!aviso) return null;

  const destino = destinoDe(aviso.tipo, roles);
  const tituloId = `aviso-cuota-${aviso.id_notificacion}`;
  return (
    <aside
      aria-labelledby={tituloId}
      className={cn("flex flex-col gap-4 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center", ESTILO_POR_TIPO[aviso.tipo])}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconoNotificacion tipo={aviso.tipo} />
        <div className="min-w-0">
          <h2 id={tituloId} className="text-sm font-extrabold">
            {PRESENTACION_POR_TIPO[aviso.tipo].etiqueta}
          </h2>
          <p className="mt-0.5 text-sm">{aviso.mensaje}</p>
          <MomentoNotificacion fecha={aviso.fecha_generacion} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        {destino && (
          <Button asChild className="min-h-11 rounded-xl font-extrabold">
            <Link to={destino.to}>{destino.etiqueta}</Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={marcarLeida.isPending}
          onClick={() => marcarLeida.mutate(aviso.id_notificacion)}
          className="min-h-11 rounded-xl bg-white/70 dark:bg-transparent"
        >
          Entendido
        </Button>
      </div>
    </aside>
  );
}
