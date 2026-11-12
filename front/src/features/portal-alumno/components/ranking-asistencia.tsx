import { useState } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import type { FiltrosRankingAsistencia } from "../api/ranking-asistencia-api";
import { MedallaPuesto } from "./medalla-puesto";
import { useRankingAsistencia } from "../hooks/use-ranking-asistencia";
import type { RankingAsistencia as Ranking } from "../schemas/ranking-asistencia";

// US-30: ranking de asistencia con filtro de período. Lo usan la sección Ranking (profesora, alumno
// y tutor) y la pestaña Ranking de Reportes (propietaria); cada una pone su propio encabezado.

const CAMPO_FECHA =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white";

function FiltroPeriodo({ onAplicar }: { onAplicar: (filtros: FiltrosRankingAsistencia) => void }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const restablecer = () => {
    setDesde("");
    setHasta("");
    onAplicar({});
  };

  return (
    <form
      aria-label="Período del ranking"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar({ desde: desde || undefined, hasta: hasta || undefined });
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
        <label htmlFor="ranking-desde">Desde</label>
        <CampoFecha
          id="ranking-desde"
          aria-label="Desde"
          value={desde}
          onChange={setDesde}
          className={CAMPO_FECHA}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
        <label htmlFor="ranking-hasta">Hasta</label>
        <CampoFecha
          id="ranking-hasta"
          aria-label="Hasta"
          value={hasta}
          onChange={setHasta}
          className={CAMPO_FECHA}
        />
      </div>
      <Button type="submit" className="min-h-[44px] rounded-xl bg-primary font-bold text-white">
        Aplicar período
      </Button>
      {desde || hasta ? (
        <Button type="button" variant="ghost" className="min-h-[44px] rounded-xl font-bold text-primary" onClick={restablecer}>
          Restablecer
        </Button>
      ) : null}
    </form>
  );
}

function FilaRanking({ fila }: { fila: Ranking["datos"][number] }) {
  return (
    <li className={`rounded-2xl p-4 ${fila.es_propia ? "bg-pink-50 dark:bg-primary/10" : "bg-slate-50 dark:bg-slate-800/40"}`}>
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

function TablaPosiciones({ ranking }: { ranking: Ranking }) {
  return (
    <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-slate-800 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Posiciones</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Solo se muestran alumnos activos con al menos {ranking.minimo_clases} clases previstas.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full border-primary/30 bg-pink-50 px-3 py-1 text-xs font-extrabold text-primary dark:bg-primary/10">
          {ranking.total} participantes
        </Badge>
      </div>
      <ol className="space-y-3">
        {ranking.datos.map((fila) => <FilaRanking key={fila.id_alumno} fila={fila} />)}
      </ol>
    </Card>
  );
}

function RankingVacio({ minimoClases }: { minimoClases: number }) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-14 text-center dark:border-slate-800">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Todavía no hay ranking</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        Se necesitan al menos {minimoClases} clases previstas en el período para aparecer.
      </p>
    </Card>
  );
}

function ResultadoRanking({ filtros }: { filtros: FiltrosRankingAsistencia }) {
  const consulta = useRankingAsistencia(filtros);

  if (consulta.isPending) {
    return <TablaSkeleton ariaLabel="Cargando el ranking" filas={6} />;
  }

  if (consulta.isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar el ranking.")}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }

  const ranking = consulta.data;
  return ranking.datos.length === 0 ? <RankingVacio minimoClases={ranking.minimo_clases} /> : <TablaPosiciones ranking={ranking} />;
}

export function RankingAsistencia() {
  const [filtros, setFiltros] = useState<FiltrosRankingAsistencia>({});
  return (
    <div className="min-w-0 space-y-6">
      <FiltroPeriodo onAplicar={setFiltros} />
      <ResultadoRanking filtros={filtros} />
    </div>
  );
}
