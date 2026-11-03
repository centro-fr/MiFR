import { useState } from "react";
import { AlertCircle, CalendarX } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosInforme } from "@/features/reportes/components/filtros-informe";
import { InformeAsistenciaImprimible } from "@/features/reportes/components/informe-asistencia-imprimible";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { PorAlumno, PorProfesora, ResumenDelInforme } from "@/features/reportes/components/resultado-informe";
import { useExportarAsistencia } from "@/features/reportes/hooks/use-exportar-asistencia";
import { useInformeAsistencia } from "@/features/reportes/hooks/use-reportes";
import { filtrosAplicados, filtrosIniciales, periodoDelInforme, type FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { FiltrosInformeAsistencia, InformeAsistencia } from "@/types/reportes";
import { fechaActualArgentina } from "@/utils/fecha";

// US-33: pestaña "Asistencia" de Reportes. Arranca con el mes en curso y se rehace con los filtros.
// Es solo informativo: no modifica datos.

const SIN_FILTROS: FiltrosDescritos = { alumno: null, profesora: null, actividad: null, incluirBajas: false };

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el informe" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <Skeleton key={indice} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function SinDatos() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <CalendarX aria-hidden="true" className="size-8 text-slate-400" />
      <p className="font-bold text-slate-900 dark:text-white">Sin datos para estos filtros</p>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
        No hay clases dictadas con asistencia registrada en el período. Probá con otras fechas o sacá algún filtro.
      </p>
    </div>
  );
}

function Informe({ informe, cargandoPagina, onCambiarPagina }: { informe: InformeAsistencia; cargandoPagina: boolean; onCambiarPagina: (offset: number) => void }) {
  if (informe.resumen.clasesDictadas === 0 && informe.totalAlumnos === 0) return <SinDatos />;
  return (
    <div className="flex flex-col gap-4">
      <ResumenDelInforme informe={informe} />
      {informe.porProfesora.length > 0 && <PorProfesora profesoras={informe.porProfesora} />}
      {informe.totalAlumnos > 0 && <PorAlumno informe={informe} cargando={cargandoPagina} onCambiarPagina={onCambiarPagina} />}
    </div>
  );
}

export function InformeAsistenciaPage() {
  const [filtros, setFiltros] = useState<FiltrosInformeAsistencia>(() => filtrosIniciales(fechaActualArgentina()));
  const [descripcion, setDescripcion] = useState<FiltrosDescritos>(SIN_FILTROS);
  const [offset, setOffset] = useState(0);
  const consulta = useInformeAsistencia(filtros, offset);
  const { exportar, preparando, impresion } = useExportarAsistencia(filtros, descripcion);

  const informe = consulta.data;
  const conDatos = Boolean(informe && (informe.resumen.clasesDictadas > 0 || informe.totalAlumnos > 0));
  const aplicados = filtrosAplicados(descripcion);

  function generar(nuevos: FiltrosInformeAsistencia, nuevaDescripcion: FiltrosDescritos) {
    setFiltros(nuevos);
    setDescripcion(nuevaDescripcion);
    setOffset(0);
    // Con los mismos filtros, "Generar" trae los datos más recientes (spec: actualizado al generarlo).
    if (JSON.stringify(nuevos) === JSON.stringify(filtros) && offset === 0) void consulta.refetch();
  }

  return (
    <PaginaReportes
      acciones={<MenuExportar disabled={!conDatos || consulta.isFetching} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Informe de asistencia</h2>
          <p className="text-sm text-muted-foreground">
            {informe ? periodoDelInforme(informe.desde, informe.hasta) : periodoDelInforme(filtros.desde, filtros.hasta)}
            {aplicados.length > 0 && ` · ${aplicados.join(" · ")}`}
          </p>
        </div>

        <FiltrosInforme generando={consulta.isFetching && !consulta.isPlaceholderData} onGenerar={generar} />

        {consulta.isPending && <Cargando />}
        {consulta.isError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
            <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
              {mensajeDeErrorApi(consulta.error, "No se pudo generar el informe.")}
            </p>
            <Button type="button" variant="outline" disabled={consulta.isFetching} onClick={() => void consulta.refetch()} className="min-h-11 rounded-xl font-bold">
              Reintentar
            </Button>
          </div>
        )}
        {informe && <Informe informe={informe} cargandoPagina={consulta.isPlaceholderData} onCambiarPagina={setOffset} />}
      </div>
      {impresion && <InformeAsistenciaImprimible informe={impresion.datos} descripcion={descripcion} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
