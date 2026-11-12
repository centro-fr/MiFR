import { Flame } from "lucide-react";
import { InsigniaMedalla } from "@/components/insignias/insignia-medalla";
import { mensajeDeErrorApi } from "@/api/errores";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { usePanelAlumno } from "../hooks/use-panel-alumno";
import { useInsignias } from "../hooks/use-insignias";
import type { FichaInsignias } from "../schemas/insignias";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${fecha}T12:00:00`));
}

function TarjetaRacha({ ficha }: { ficha: FichaInsignias }) {
  const { racha } = ficha;
  return (
    <Card className="rounded-3xl border-0 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
      <div className="flex items-center gap-2 text-pink-200">
        <Flame aria-hidden="true" className="size-5" />
        <h2 className="text-sm font-extrabold uppercase tracking-wider">Mi racha</h2>
      </div>
      <p className="mt-3 text-4xl font-black tracking-tight">{racha.actual} clases</p>
      <p className="mt-1 text-sm font-medium text-slate-300">
        {racha.actual > 0 ? "seguidas sin faltar" : "Tu próxima clase puede iniciar una nueva racha"}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-slate-300">Mejor racha</p>
          <p className="mt-1 text-xl font-black">{racha.mejor}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-slate-300">Clases asistidas</p>
          <p className="mt-1 text-xl font-black">{ficha.clases_asistidas}</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-300">
        {racha.fecha_inicio ? `Racha iniciada el ${formatearFecha(racha.fecha_inicio)}` : "Todavía no hay una racha activa"}
      </p>
    </Card>
  );
}

function Hitos({ ficha }: { ficha: FichaInsignias }) {
  return (
    <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-slate-800 sm:p-6">
      <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Próximos hitos</h2>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Racha</p>
            <Badge variant="outline" className="rounded-full font-bold">
              {ficha.racha.proximo_hito ? `${ficha.racha.proximo_hito.faltantes} faltantes` : "Completada"}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {ficha.racha.proximo_hito ? `Llegá a ${ficha.racha.proximo_hito.umbral} clases seguidas` : "Alcanzaste todos los hitos de racha"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Clases asistidas</p>
            <Badge variant="outline" className="rounded-full font-bold">
              {ficha.proximo_hito_clases ? `${ficha.proximo_hito_clases.faltantes} faltantes` : "Completada"}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {ficha.proximo_hito_clases ? `Llegá a ${ficha.proximo_hito_clases.umbral} clases asistidas` : "Alcanzaste todos los hitos de asistencia"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Insignia({ insignia }: { insignia: FichaInsignias["insignias"][number] }) {
  return (
    <li className={`rounded-3xl border p-5 ${insignia.obtenida ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" : "border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40"}`}>
      <div className="flex items-start gap-3">
        {/* La misma medalla que en la ficha y el ranking; en gris mientras no la obtiene. */}
        <InsigniaMedalla tipo={insignia.tipo} tamano={48} bloqueada={!insignia.obtenida} umbral={insignia.valor_umbral} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{insignia.nombre}</h3>
            <Badge variant={insignia.obtenida ? "default" : "outline"} className="rounded-full text-[11px] font-bold">
              {insignia.obtenida ? "Obtenida" : "Bloqueada"}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{insignia.descripcion}</p>
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

export function InsigniasContenido() {
  const panel = usePanelAlumno();
  const consulta = useInsignias(panel.data?.id_alumno);

  if (panel.isPending || consulta.isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando tus logros" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const error = panel.error ?? consulta.error;
  if (error) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(error, "No se pudieron cargar tus logros.")}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }

  const ficha = consulta.data;
  if (!ficha) {
    return <Card className="rounded-3xl border-slate-200 p-8 text-center text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">Todavía no hay logros para mostrar.</Card>;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Mis logros</h2>
        <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">Mantené tu constancia y celebrá cada avance.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TarjetaRacha ficha={ficha} />
        <Hitos ficha={ficha} />
      </div>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Mis insignias</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Desbloqueá nuevos logros con tu asistencia.</p>
          </div>
          <Badge className="rounded-full bg-primary px-3 py-1 font-black text-white">{ficha.insignias.filter((item) => item.obtenida).length}/{ficha.insignias.length}</Badge>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ficha.insignias.map((insignia) => <Insignia key={insignia.codigo} insignia={insignia} />)}
        </ul>
      </section>
    </div>
  );
}
