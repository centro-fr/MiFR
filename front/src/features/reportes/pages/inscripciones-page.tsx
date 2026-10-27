import { useState } from "react";
import { AlertCircle, CalendarX } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosDeInscripciones, ResumenDeInscripciones, TablaAltasPorMes } from "@/features/reportes/components/estadisticas-inscripciones";
import { GraficoAltasPorMes } from "@/features/reportes/components/grafico-altas-por-mes";
import { InscripcionesImprimible } from "@/features/reportes/components/inscripciones-imprimible";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { useExportarReporte } from "@/features/reportes/hooks/use-exportar-reporte";
import { useEstadisticasInscripciones, usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
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

/** Los nombres del plan y la profesora elegidos, para el subtítulo y la exportación. */
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <CalendarX aria-hidden="true" className="size-8 text-slate-400" />
      <p className="font-bold text-slate-900 dark:text-white">Sin altas en {anio}</p>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">No hubo altas definitivas con estos filtros. Probá con otro año o sacá algún filtro.</p>
    </div>
  );
}

function Estadisticas({ estadisticas, hoy }: { estadisticas: EstadisticasInscripciones; hoy: string }) {
  const transcurridos = mesesTranscurridos(estadisticas.meses, hoy);
  if (estadisticas.totalAltas === 0) return <SinAltas anio={estadisticas.anio} />;
  const enCurso = estadisticas.anio === Number(hoy.slice(0, 4));
  return (
    <div className="flex flex-col gap-4">
      <ResumenDeInscripciones estadisticas={estadisticas} transcurridos={transcurridos} />
      <Card role="region" aria-labelledby="titulo-altas-por-mes" className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5 dark:border-slate-700/80 dark:bg-slate-900">
        <h3 id="titulo-altas-por-mes" className="text-base font-extrabold text-slate-900 dark:text-white">
          Altas por mes
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {estadisticas.anio}
          {enCurso && " · el mes en curso va resaltado"}
        </p>
        <div className="mt-3">
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
    // Lo que ya está en pantalla es todo el informe: no hace falta pedir nada más.
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
      acciones={<MenuExportar disabled={!conDatos || consulta.isFetching} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Inscriptos por mes</h2>
          <p className="text-sm text-muted-foreground">
            Altas definitivas de {filtros.anio}
            {aplicados.length > 0 && ` · ${aplicados.join(" · ")}`}. No cuentan las pre-inscripciones ni las reactivaciones.
          </p>
        </div>
        <FiltrosDeInscripciones filtros={filtros} anioActual={anioActual} onCambiar={setFiltros} />

        {consulta.isPending && <Cargando />}
        {consulta.isError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
            <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
              {mensajeDeErrorApi(consulta.error, "No se pudieron cargar las estadísticas.")}
            </p>
            <Button type="button" variant="outline" disabled={consulta.isFetching} onClick={() => void consulta.refetch()} className="min-h-11 rounded-xl font-bold">
              Reintentar
            </Button>
          </div>
        )}
        {consulta.data && <Estadisticas estadisticas={consulta.data} hoy={hoy} />}
      </div>
      {impresion && <InscripcionesImprimible estadisticas={impresion.datos} descripcion={descripcion} hoy={hoy} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
