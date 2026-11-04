import { Link } from "react-router-dom";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MedallaPuesto } from "../components/medalla-puesto";
import { useRankingAsistencia } from "../hooks/use-ranking-asistencia";
import type { RankingAsistencia } from "../schemas/ranking-asistencia";

function FilaRanking({ fila }: { fila: RankingAsistencia["datos"][number] }) {
  return (
    <li
      className={`rounded-2xl border p-4 ${
        fila.es_propia
          ? "border-primary/50 bg-pink-50/70 shadow-sm dark:bg-primary/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <MedallaPuesto posicion={fila.posicion} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{fila.nombre} {fila.apellido}</p>
            {fila.es_propia ? (
              <Badge className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-black text-white">Tu posición</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {fila.clases_asistidas} de {fila.clases_previstas} clases · Racha de {fila.racha_actual}
          </p>
        </div>
        <div className="w-20 shrink-0 text-right">
          <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{fila.porcentaje_asistencia.toFixed(2)}%</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-primary" style={{ width: `${fila.porcentaje_asistencia}%` }} />
          </div>
        </div>
      </div>
    </li>
  );
}

function RankingVacio({ minimoClases }: { minimoClases: number }) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-14 text-center dark:border-slate-800">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <Trophy aria-hidden="true" className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Todavía no hay ranking</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        Se necesitan al menos {minimoClases} clases previstas en el período para aparecer.
      </p>
    </Card>
  );
}

export function RankingAsistenciaPage() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const consulta = useRankingAsistencia(filtros);

  if (consulta.isPending) {
    return (
      <OwnerLayout>
        <div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
          Cargando el ranking...
        </div>
      </OwnerLayout>
    );
  }

  if (consulta.isError) {
    return (
      <OwnerLayout>
        <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border-slate-200 p-6 text-center dark:border-slate-800">
          <AlertCircle aria-hidden="true" className="size-8 text-rose-600" />
          <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {mensajeDeErrorApi(consulta.error, "No se pudo cargar el ranking.")}
          </p>
          <Button type="button" onClick={() => void consulta.refetch()} className="min-h-[44px] rounded-xl bg-primary font-bold text-white">
            Reintentar
          </Button>
        </Card>
      </OwnerLayout>
    );
  }

  const ranking = consulta.data;
  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button asChild variant="ghost" className="-ml-3 mb-2 min-h-[40px] rounded-xl px-3 font-bold text-slate-600 dark:text-slate-300">
              <Link to="/app/inicio"><ArrowLeft aria-hidden="true" className="mr-2 size-4" /> Volver a mi panel</Link>
            </Button>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Ranking de asistencia</h1>
            <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              Conocé el compromiso del grupo durante el período seleccionado.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full border-primary/30 bg-pink-50 px-3 py-1 text-xs font-extrabold text-primary dark:bg-primary/10">
            {ranking.total} participantes
          </Badge>
        </div>

        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-slate-800 sm:p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setFiltros({ desde: desde || undefined, hasta: hasta || undefined });
            }}
          >
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <Button type="submit" className="min-h-[44px] rounded-xl bg-primary font-bold text-white">
              Aplicar período
            </Button>
            {(desde || hasta) ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-[44px] rounded-xl font-bold text-primary"
                onClick={() => {
                  setDesde("");
                  setHasta("");
                  setFiltros({});
                }}
              >
                Restablecer
              </Button>
            ) : null}
          </form>
        </Card>

        {ranking.datos.length === 0 ? (
          <RankingVacio minimoClases={ranking.minimo_clases} />
        ) : (
          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-slate-800 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Comunidad MiFR</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Solo se muestran alumnos activos con al menos {ranking.minimo_clases} clases previstas.
                </p>
              </div>
              <Trophy aria-hidden="true" className="size-6 shrink-0 text-primary" />
            </div>
            <ol className="space-y-3">
              {ranking.datos.map((fila) => <FilaRanking key={fila.id_alumno} fila={fila} />)}
            </ol>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
