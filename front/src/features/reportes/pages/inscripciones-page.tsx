import { useState } from "react";
import { AlertCircle, CalendarX } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FiltrosDeInscripciones,
  ResumenDeInscripciones,
  TablaAltasPorMes,
} from "@/features/reportes/components/estadisticas-inscripciones";
import { GraficoAltasPorMes } from "@/features/reportes/components/grafico-altas-por-mes";
import { InscripcionesImprimible } from "@/features/reportes/components/inscripciones-imprimible";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { useExportarReporte } from "@/features/reportes/hooks/use-exportar-reporte";
import {
  useEstadisticasInscripciones,
  usePlanesParaFiltro,
  useProfesorasParaFiltro,
} from "@/features/reportes/hooks/use-reportes";
import {
  armarCsvInscripciones,
  describirFiltrosInscripciones,
  nombreArchivoInscripciones,
  type FiltrosInscripcionesDescritos,
} from "@/features/reportes/utils/exportar-inscripciones";
import { mesesTranscurridos } from "@/features/reportes/utils/formato-inscripciones";
import type { EstadisticasInscripciones, FiltrosInscripciones } from "@/types/reportes";
import { fechaActualArgentina } from "@/utils/fecha";

// US-35: pestaña "Inscripciones" de Reportes. Altas definitivas de cada mes del año elegido, con la
// comparación con el mes anterior. Arranca con el año en curso.

function useDescripcion(filtros: FiltrosInscripciones): FiltrosInscripcionesDescritos {
  const planes = usePlanesParaFiltro();
  const profesoras = useProfesorasParaFiltro();
  const plan = planes.data?.find((p) => Number(p.id) === filtros.idPlan);
  const profesora = profesoras.data?.find((p) => Number(p.id) === filtros.idProfesora);
  return { plan: plan?.nombre ?? null, profesora: profesora ? `${profesora.nombre} ${profesora.apellido}` : null };
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando las estadísticas" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((indice) => (
          <Skeleton key={indice} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function SinAltas({ anio }: { anio: number }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl shadow-xs">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200"
      >
        <CalendarX className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
        Sin altas en {anio}
      </h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        No hubo altas definitivas con los filtros seleccionados. Probá eligiendo otro año o limpiando los filtros.
      </p>
    </Card>
  );
}

function Estadisticas({ estadisticas, hoy }: { estadisticas: EstadisticasInscripciones; hoy: string }) {
  const transcurridos = mesesTranscurridos(estadisticas.meses, hoy);
  if (estadisticas.totalAltas === 0) return <SinAltas anio={estadisticas.anio} />;
  const enCurso = estadisticas.anio === Number(hoy.slice(0, 4));

  return (
    <div className="flex flex-col gap-5">
      <ResumenDeInscripciones estadisticas={estadisticas} transcurridos={transcurridos} />

      <Card
        role="region"
        aria-labelledby="titulo-altas-por-mes"
        className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <h3 id="titulo-altas-por-mes" className="text-base font-extrabold text-slate-900 dark:text-white">
          Altas por mes
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {estadisticas.anio}
          {enCurso && " · el mes en curso va resaltado"}
        </p>
        <div className="mt-4">
          <GraficoAltasPorMes meses={estadisticas.meses} hoy={hoy} />
        </div>
      </Card>

      <TablaAltasPorMes estadisticas={estadisticas} transcurridos={transcurridos} />
    </div>
  );
}

export function InscripcionesPage() {
  const hoy = fechaActualArgentina();
  const anioActual = Number(hoy.slice(0, 4));
  const [filtros, setFiltros] = useState<FiltrosInscripciones>({ anio: anioActual, idPlan: null, idProfesora: null });
  const consulta = useEstadisticasInscripciones(filtros);
  const descripcion = useDescripcion(filtros);
  const { exportar, preparando, impresion } = useExportarReporte({
    preparar: async () => {
      if (!consulta.data) throw new Error("Las estadísticas todavía no cargaron");
      return consulta.data;
    },
    csv: (estadisticas) => ({
      contenido: armarCsvInscripciones(estadisticas, descripcion, hoy),
      nombreArchivo: nombreArchivoInscripciones(estadisticas.anio),
    }),
  });
  const aplicados = describirFiltrosInscripciones(descripcion);
  const conDatos = (consulta.data?.totalAltas ?? 0) > 0;

  return (
    <PaginaReportes
      acciones={
        <MenuExportar
          disabled={!conDatos || consulta.isFetching}
          preparando={preparando}
          onExportar={(formato) => void exportar(formato)}
        />
      }
    >
      <div className="space-y-6 min-w-0">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inscriptos por mes
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Altas definitivas de {filtros.anio}
            {aplicados.length > 0 && ` · ${aplicados.join(" · ")}`}. No computan pre-inscripciones ni reactivaciones.
          </p>
        </div>

        <FiltrosDeInscripciones filtros={filtros} anioActual={anioActual} onCambiar={setFiltros} />

        {consulta.isPending && <Cargando />}

        {consulta.isError && (
          <Card className="flex flex-col items-center gap-3 border-rose-200 dark:border-rose-900/50 p-8 text-center rounded-3xl shadow-xs">
            <AlertCircle className="size-8 text-rose-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Error al cargar estadísticas
            </h3>
            <p role="alert" className="text-xs text-slate-500 max-w-sm">
              {mensajeDeErrorApi(consulta.error, "No se pudieron cargar las estadísticas.")}
            </p>
            <Button
              type="button"
              disabled={consulta.isFetching}
              onClick={() => void consulta.refetch()}
              className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold px-5"
            >
              Reintentar
            </Button>
          </Card>
        )}

        {consulta.data && <Estadisticas estadisticas={consulta.data} hoy={hoy} />}
      </div>

      {impresion && (
        <InscripcionesImprimible
          estadisticas={impresion.datos}
          descripcion={descripcion}
          hoy={hoy}
          generadoEl={impresion.generadoEl}
        />
      )}
    </PaginaReportes>
  );
}
