import { useState } from "react";
import { AlertCircle, CalendarX } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosInforme } from "@/features/reportes/components/filtros-informe";
import { InformeAsistenciaImprimible } from "@/features/reportes/components/informe-asistencia-imprimible";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { PorAlumno, PorProfesora, ResumenDelInforme } from "@/features/reportes/components/resultado-informe";
import { useExportarAsistencia } from "@/features/reportes/hooks/use-exportar-asistencia";
import { useInformeAsistencia } from "@/features/reportes/hooks/use-reportes";
import {
  filtrosAplicados,
  filtrosIniciales,
  periodoDelInforme,
  type FiltrosDescritos,
} from "@/features/reportes/utils/formato-informe";
import type { FiltrosInformeAsistencia, InformeAsistencia } from "@/types/reportes";
import { fechaActualArgentina } from "@/utils/fecha";

// US-33: pestaña "Asistencia" de Reportes.

const SIN_FILTROS: FiltrosDescritos = { alumno: null, profesora: null, actividad: null, incluirBajas: false };

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el informe" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <Skeleton key={indice} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

function SinDatos() {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-lg shadow-xs">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200"
      >
        <CalendarX className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
        Sin datos para estos filtros
      </h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        No hay clases dictadas con asistencia registrada en el período. Probá con otras fechas o sacá algún filtro.
      </p>
    </Card>
  );
}

function Informe({
  informe,
  cargandoPagina,
  onCambiarPagina,
}: {
  informe: InformeAsistencia;
  cargandoPagina: boolean;
  onCambiarPagina: (offset: number) => void;
}) {
  if (informe.resumen.clasesDictadas === 0 && informe.totalAlumnos === 0) return <SinDatos />;
  return (
    <div className="flex flex-col gap-5">
      <ResumenDelInforme informe={informe} />
      {informe.porProfesora.length > 0 && <PorProfesora profesoras={informe.porProfesora} />}
      {informe.totalAlumnos > 0 && (
        <PorAlumno informe={informe} cargando={cargandoPagina} onCambiarPagina={onCambiarPagina} />
      )}
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
    if (JSON.stringify(nuevos) === JSON.stringify(filtros) && offset === 0) void consulta.refetch();
  }

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
            Informe de asistencia
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {informe ? periodoDelInforme(informe.desde, informe.hasta) : periodoDelInforme(filtros.desde, filtros.hasta)}
            {aplicados.length > 0 && ` · ${aplicados.join(" · ")}`}
          </p>
        </div>

        <FiltrosInforme generando={consulta.isFetching && !consulta.isPlaceholderData} onGenerar={generar} />

        {consulta.isPending && <Cargando />}

        {consulta.isError && (
          <Card className="flex flex-col items-center gap-3 border-rose-200 dark:border-rose-900/50 p-8 text-center rounded-lg shadow-xs">
            <AlertCircle className="size-8 text-rose-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Error al generar el informe
            </h3>
            <p role="alert" className="text-xs text-slate-500 max-w-sm">
              {mensajeDeErrorApi(consulta.error, "No se pudo generar el informe.")}
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

        {informe && (
          <Informe informe={informe} cargandoPagina={consulta.isPlaceholderData} onCambiarPagina={setOffset} />
        )}
      </div>

      {impresion && (
        <InformeAsistenciaImprimible
          informe={impresion.datos}
          descripcion={descripcion}
          generadoEl={impresion.generadoEl}
        />
      )}
    </PaginaReportes>
  );
}
