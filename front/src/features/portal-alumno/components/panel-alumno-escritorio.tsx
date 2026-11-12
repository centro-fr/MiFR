import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  Trophy,
  XCircle,
} from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { usePanelAlumno } from "../hooks/use-panel-alumno";
import type { PanelAlumno } from "../schemas/panel-alumno";

const ESTADO_CUOTA = {
  AL_DIA: { etiqueta: "Cuota al día", clases: "border-emerald-200 bg-emerald-50 text-emerald-700", icono: CheckCircle2 },
  EN_GRACIA: { etiqueta: "Por vencer", clases: "border-amber-200 bg-amber-50 text-amber-700", icono: Clock3 },
  VENCIDA: { etiqueta: "Cuota vencida", clases: "border-rose-200 bg-rose-50 text-rose-700", icono: AlertCircle },
} as const;

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(`${fecha}T12:00:00`));
}

function Encabezado({ nombre }: { nombre: string }) {
  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        Hola, {nombre}
      </h1>
      <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
        Este es el resumen de tu actividad en MiFR.
      </p>
    </div>
  );
}

function PlanCard({ plan }: { plan: NonNullable<PanelAlumno["plan"]> }) {
  const estado = ESTADO_CUOTA[plan.estado_cuota];
  const IconoEstado = estado.icono;

  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mi plan</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">{plan.nombre}</h2>
          </div>
          <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-extrabold ${estado.clases}`}>
            <IconoEstado aria-hidden="true" className="mr-1.5 size-3.5" />
            {estado.etiqueta}
          </Badge>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <DatoPlan etiqueta="Vencimiento" valor={formatearFecha(plan.fecha_vencimiento)} />
          <DatoPlan
            etiqueta={plan.dias_restantes >= 0 ? "Días restantes" : "Días vencida"}
            valor={Math.abs(plan.dias_restantes).toString()}
          />
          <DatoPlan etiqueta="Profesora" valor={plan.profesora} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="min-h-[44px] flex-1 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark">
            <Link to="/app/clases">Ver mis clases</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[44px] flex-1 rounded-xl font-bold">
            <Link to="/app/rutina">Mi rutina</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DatoPlan({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}

function ProximasClases({ clases }: { clases: PanelAlumno["proximas_clases"] }) {
  return (
    <Seccion titulo="Próximas clases" icono={<CalendarDays aria-hidden="true" className="size-5" />}>
      {clases.length === 0 ? (
        <Vacio mensaje="No tenés clases próximas inscriptas." />
      ) : (
        <div className="space-y-3">
          {clases.map((clase) => (
            <div key={clase.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-pink-50 text-primary dark:bg-pink-950/40">
                <span className="text-xs font-bold">{formatearFecha(clase.fecha)}</span>
                <Clock3 aria-hidden="true" className="mt-0.5 size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{clase.actividad}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {clase.hora_inicio} a {clase.hora_fin} · {clase.profesora}
                </p>
              </div>
              {clase.cupo_disponible !== null ? (
                <span className="shrink-0 text-right text-xs font-bold text-slate-500">{clase.cupo_disponible} lugares</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );
}

function HistorialAsistencias({ asistencias }: { asistencias: PanelAlumno["historial_asistencias"] }) {
  return (
    <Seccion titulo="Mi historial" icono={<Dumbbell aria-hidden="true" className="size-5" />}>
      {asistencias.length === 0 ? (
        <Vacio mensaje="Todavía no hay asistencias registradas." />
      ) : (
        <div className="space-y-2">
          {asistencias.map((asistencia) => {
            const presente = asistencia.estado === "PRESENTE";
            return (
              <div key={asistencia.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                {presente ? <CheckCircle2 className="size-5 text-emerald-500" /> : <XCircle className="size-5 text-rose-500" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{asistencia.actividad}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatearFecha(asistencia.fecha)} · {asistencia.profesora}
                  </p>
                </div>
                <span className={`text-xs font-extrabold ${presente ? "text-emerald-600" : "text-rose-600"}`}>
                  {presente ? "Presente" : "Ausente"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Seccion>
  );
}

function Seccion({ titulo, icono, children }: { titulo: string; icono: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icono}</span>
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Vacio({ mensaje }: { mensaje: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">{mensaje}</div>;
}

function AccesosRanking() {
  return (
    <Card className="rounded-3xl border-slate-200 bg-slate-900 p-5 text-white shadow-sm dark:border-slate-800 sm:p-6">
      <div className="flex items-center gap-2">
        <Flame aria-hidden="true" className="size-5 text-pink-300" />
        <h2 className="text-lg font-black">Seguí avanzando</h2>
      </div>
      <p className="mt-1 text-sm text-slate-300">Próximamente vas a poder consultar tu racha, insignias y posición en el ranking.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="secondary" className="min-h-[44px] rounded-xl font-extrabold">
          <Link to="/app/ranking"><Trophy aria-hidden="true" className="mr-2 size-4" /> Ranking</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px] rounded-xl border-white/20 bg-transparent font-extrabold text-white hover:bg-white/10">
          <Link to="/app/rutina">Ver mi progreso</Link>
        </Button>
      </div>
    </Card>
  );
}

/** Inicio del alumno en escritorio (la vista anterior al diseño mobile). */
export function PanelAlumnoEscritorio() {
  const consulta = usePanelAlumno();

  if (consulta.isPending) {
    return (
      <OwnerLayout>
        <div aria-busy="true" aria-label="Cargando tu panel" className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-48 rounded-3xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (consulta.isError) {
    return (
      <OwnerLayout>
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar tu panel.")}
          onReintentar={() => void consulta.refetch()}
        />
      </OwnerLayout>
    );
  }

  const panel = consulta.data;
  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        <Encabezado nombre={panel.alumno.nombre} />
        {panel.plan ? <PlanCard plan={panel.plan} /> : <Vacio mensaje="Todavía no tenés un plan activo." />}
        <div className="grid gap-6 lg:grid-cols-2">
          <ProximasClases clases={panel.proximas_clases} />
          <HistorialAsistencias asistencias={panel.historial_asistencias} />
        </div>
        <AccesosRanking />
      </div>
    </OwnerLayout>
  );
}
