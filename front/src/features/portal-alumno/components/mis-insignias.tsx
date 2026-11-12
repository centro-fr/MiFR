import { InsigniaMedalla } from "@/components/insignias/insignia-medalla";
import { mensajeDeErrorApi } from "@/api/errores";
import { Badge } from "@/components/ui/badge";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { usePanelAlumno } from "../hooks/use-panel-alumno";
import { useInsignias } from "../hooks/use-insignias";
import type { FichaInsignias } from "../schemas/insignias";

// US-31: las insignias del alumno en su perfil, las obtenidas y las que le faltan con su progreso.

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${fecha.slice(0, 10)}T12:00:00`));
}

function Insignia({ insignia }: { insignia: FichaInsignias["insignias"][number] }) {
  return (
    <li
      className={cn(
        "rounded-2xl border p-5",
        insignia.obtenida
          ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          : "border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40",
      )}
    >
      <div className="flex items-start gap-3">
        {/* La misma medalla que en la ficha y el ranking; en gris mientras no la obtiene. */}
        <InsigniaMedalla tipo={insignia.tipo} tamano={48} bloqueada={!insignia.obtenida} umbral={insignia.valor_umbral} />
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{insignia.nombre}</h3>
          <Badge variant={insignia.obtenida ? "default" : "outline"} className="mt-1 rounded-full text-[11px] font-bold">
            {insignia.obtenida ? "Obtenida" : "Bloqueada"}
          </Badge>
          {insignia.descripcion && (
            <p className="mt-1.5 text-xs leading-relaxed font-medium text-slate-500 dark:text-slate-400">{insignia.descripcion}</p>
          )}
          {insignia.obtenida ? (
            <p className="mt-2 text-xs font-bold text-primary">Conseguida el {formatearFecha(insignia.fecha_obtencion)}</p>
          ) : insignia.progreso ? (
            <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              Progreso: {insignia.progreso.actual} de {insignia.progreso.umbral}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const GRILLA = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function MisInsignias() {
  const panel = usePanelAlumno();
  const consulta = useInsignias(panel.data?.id_alumno);
  const error = panel.error ?? consulta.error;

  function contenido() {
    if (error) {
      return (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(error, "No se pudieron cargar tus insignias.")}
          reintentando={panel.isFetching || consulta.isFetching}
          onReintentar={() => void (panel.isError ? panel.refetch() : consulta.refetch())}
        />
      );
    }
    if (!consulta.data) {
      return (
        <div aria-busy="true" aria-label="Cargando tus insignias" className={GRILLA}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      );
    }
    return (
      <ul className={GRILLA}>
        {consulta.data.insignias.map((insignia) => (
          <Insignia key={insignia.codigo} insignia={insignia} />
        ))}
      </ul>
    );
  }

  const insignias = consulta.data?.insignias;
  return (
    <section aria-labelledby="titulo-mis-insignias" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-mis-insignias" className="text-lg font-bold tracking-tight text-slate-900 md:text-xl dark:text-white">
            Mis insignias
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Desbloqueá nuevos logros con tu asistencia.</p>
        </div>
        {insignias && (
          <Badge className="rounded-full bg-primary px-3 py-1 font-black text-white">
            {insignias.filter((item) => item.obtenida).length}/{insignias.length}
            <span className="sr-only"> obtenidas</span>
          </Badge>
        )}
      </div>
      {contenido()}
    </section>
  );
}
