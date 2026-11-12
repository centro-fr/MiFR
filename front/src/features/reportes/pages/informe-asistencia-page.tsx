import { useState } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { MenuExportar } from "@/components/menu-exportar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
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
      <TablaSkeleton ariaLabel="Cargando informe de asistencia" filas={6} />
    </div>
  );
}

function SinDatos() {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-lg shadow-xs">
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
      titulo="Informe de asistencia"
      subtitulo={
        <>
          {informe ? periodoDelInforme(informe.desde, informe.hasta) : periodoDelInforme(filtros.desde, filtros.hasta)}
          {aplicados.length > 0 && ` · ${aplicados.join(" · ")}`}
        </>
      }
      acciones={
        <MenuExportar
          disabled={!conDatos || consulta.isFetching}
          preparando={preparando}
          onExportar={(formato) => void exportar(formato)}
        />
      }
    >
      <div className="space-y-6 min-w-0">
        <FiltrosInforme generando={consulta.isFetching && !consulta.isPlaceholderData} onGenerar={generar} />

        {consulta.isPending && <Cargando />}

        {consulta.isError && (
          <EstadoErrorCarga
            titulo="Error al generar el informe"
            mensaje={mensajeDeErrorApi(consulta.error, "No se pudo generar el informe.")}
            reintentando={consulta.isFetching}
            onReintentar={() => void consulta.refetch()}
          />
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
