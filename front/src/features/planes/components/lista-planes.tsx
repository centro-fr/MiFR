import type { ReactNode } from "react";
import { CalendarClock, History, Pencil, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { BadgeEstadoPlan, BadgeModalidad } from "@/features/planes/components/badges-plan";
import { estaVigente, textoDiasGracia, textoFrecuencia, textoProfesora } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { formatearPrecio } from "@/utils/moneda";
import { cn } from "@/utils/cn";

// US-11: el catálogo de planes. Son pocos (4 a 10), así que van como tarjetas: el precio se lee de
// un vistazo y las acciones quedan junto a lo que modifican. La grilla depende del ancho del
// contenido (container query) y no de la ventana: con el menú abierto, siete columnas no entraban.

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });

/** "2026-01-01..." → "1 ene 2026". Las fechas de vigencia son de calendario: se leen en UTC. */
function fechaCorta(fecha: string): string {
  return FORMATO_FECHA.format(new Date(`${fecha.slice(0, 10)}T00:00:00.000Z`));
}

interface AccionesDeLaTarjeta {
  onActualizarPrecio: (plan: Plan) => void;
  onVerHistorial: (plan: Plan) => void;
}

function Precio({ plan, onVerHistorial }: { plan: Plan; onVerHistorial: (plan: Plan) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black tracking-tight text-foreground tabular-nums">
          {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">{plan.tipo === "MENSUAL" ? "por mes" : "por clase"}</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {plan.precioVigenteDesde && <span>Vigente desde el {fechaCorta(plan.precioVigenteDesde)}</span>}
        <button
          type="button"
          onClick={() => onVerHistorial(plan)}
          className="inline-flex items-center gap-1 rounded font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-pink-300"
        >
          <History aria-hidden="true" className="size-3.5" />
          Ver historial<span className="sr-only"> de precios de {plan.nombre}</span>
        </button>
      </p>
      {plan.precioProgramado && (
        <p className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          Pasa a {formatearPrecio(plan.precioProgramado.precio)} el {fechaCorta(plan.precioProgramado.desde)}
        </p>
      )}
    </div>
  );
}

function Detalle({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{termino}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Los datos del listado que pide la US-11 (sección 5), con su nombre al lado. */
function DetallesPlan({ plan }: { plan: Plan }) {
  return (
    <dl className="flex flex-col gap-2.5 border-t border-border pt-4">
      <Detalle termino="Actividad">
        {plan.actividad ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {plan.actividad.nombre}
            <BadgeModalidad modalidad={plan.actividad.modalidad} />
          </span>
        ) : (
          "Cualquier actividad"
        )}
        {/* US-11: el aviso del cupo va en el plan al que aplica, no como nota al pie de todos. */}
        {plan.actividad?.modalidad === "PERSONALIZADA" && (
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Sujeto al cupo máximo de la actividad.</span>
        )}
      </Detalle>
      <Detalle termino="Frecuencia">{textoFrecuencia(plan.tipo, plan.clasesPorSemana)}</Detalle>
      {plan.tipo === "MENSUAL" && <Detalle termino="Gracia">{textoDiasGracia(plan.diasGracia)}</Detalle>}
      <Detalle termino="Profesora">{textoProfesora(plan.profesoraUnica)}</Detalle>
    </dl>
  );
}

function AccionesPlan({ plan, onActualizarPrecio }: { plan: Plan; onActualizarPrecio: (plan: Plan) => void }) {
  return (
    <Can permission="PLANES_EDITAR">
      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onActualizarPrecio(plan)}
          className="min-h-11 flex-1 rounded-xl border-primary/40 font-bold text-primary hover:bg-pink-50 hover:text-primary-dark pointer-fine:min-h-10 dark:text-pink-300 dark:hover:bg-primary/15"
        >
          <TrendingUp aria-hidden="true" />
          Actualizar precio<span className="sr-only"> de {plan.nombre}</span>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="min-h-11 rounded-xl px-4 font-bold text-slate-700 hover:text-foreground pointer-fine:min-h-10 dark:text-slate-200"
        >
          <Link to={`/app/planes/${plan.id}/editar`}>
            <Pencil aria-hidden="true" />
            Editar<span className="sr-only"> {plan.nombre}</span>
          </Link>
        </Button>
      </div>
    </Can>
  );
}

function TarjetaPlan({ plan, onActualizarPrecio, onVerHistorial }: { plan: Plan } & AccionesDeLaTarjeta) {
  const vigente = estaVigente(plan);
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-pink-200 dark:hover:border-primary/40",
        !vigente && "bg-muted/40 opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="wrap-break-word text-lg font-extrabold leading-tight text-foreground">{plan.nombre}</h2>
          {plan.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.descripcion}</p>}
        </div>
        {/* Vigente es lo normal (y el encabezado ya los cuenta): solo se marca el de baja. */}
        {!vigente && <BadgeEstadoPlan vigente={false} />}
      </div>
      <Precio plan={plan} onVerHistorial={onVerHistorial} />
      <DetallesPlan plan={plan} />
      {/* Un plan de baja ya no se modifica: solo se consulta su historial de precios. */}
      {vigente && <AccionesPlan plan={plan} onActualizarPrecio={onActualizarPrecio} />}
    </li>
  );
}

export function ListaPlanes({ planes, total, onActualizarPrecio, onVerHistorial }: { planes: Plan[]; total: number } & AccionesDeLaTarjeta) {
  return (
    <div className="@container space-y-3">
      <ul aria-label="Planes" className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
        {planes.map((plan) => (
          <TarjetaPlan key={plan.id} plan={plan} onActualizarPrecio={onActualizarPrecio} onVerHistorial={onVerHistorial} />
        ))}
      </ul>
      {planes.length < total && (
        <p className="text-sm text-muted-foreground">
          Mostrando {planes.length} de {total} {total === 1 ? "plan" : "planes"}.
        </p>
      )}
    </div>
  );
}

/** Mientras cargan: la misma grilla, para que la pantalla no salte al llegar los datos. */
export function ListaPlanesCargando() {
  return (
    <div role="status" className="@container">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
        {Array.from({ length: 4 }, (_, indice) => (
          <div key={indice} className="flex h-80 flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 animate-pulse rounded-lg bg-muted/60" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando planes…</span>
    </div>
  );
}
