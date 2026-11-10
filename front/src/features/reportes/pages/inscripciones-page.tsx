import { useState } from "react";
import { CalendarX } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosDeInscripciones } from "@/features/reportes/components/estadisticas-inscripciones";
import { BajasDelAnioSeccion, MesAMes } from "@/features/reportes/components/inscripciones-anios";
import { InscripcionesImprimible } from "@/features/reportes/components/inscripciones-imprimible";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { ErrorDelReporte, ReporteVacio, ResumenEnTarjetas, type DatoResumen } from "@/features/reportes/components/piezas-reporte";
import { useExportarReporte } from "@/features/reportes/hooks/use-exportar-reporte";
import {
  useEstadisticasInscripciones,
  usePlanesParaFiltro,
  useProfesorasParaFiltro,
} from "@/features/reportes/hooks/use-reportes";
import { conSigno, type Metrica } from "@/features/reportes/utils/comparacion-anios";
import {
  armarCsvInscripciones,
  describirFiltrosInscripciones,
  nombreArchivoInscripciones,
  type FiltrosInscripcionesDescritos,
} from "@/features/reportes/utils/exportar-inscripciones";
import { mesesTranscurridos } from "@/features/reportes/utils/formato-inscripciones";
import type { EstadisticasInscripciones, FiltrosInscripciones } from "@/types/reportes";
import { fechaActualArgentina } from "@/utils/fecha";

// US-35: pestaña "Inscripciones" de Reportes. Altas, bajas y activos del año elegido mes a mes, contra
// hasta dos años anteriores, y por qué se van y cuánto se quedan los que se dan de baja. Arranca con el
// año en curso.

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <Skeleton key={indice} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

function SinMovimientos({ anio }: { anio: number }) {
  return (
    <ReporteVacio
      icono={<CalendarX className="size-7" />}
      titulo={`Sin altas ni bajas en ${anio}`}
      texto="No hubo movimiento de alumnos con los filtros elegidos. Probá con otro año o limpiando los filtros."
    />
  );
}

function compararCon(diferencia: number, referencia: string): string {
  return diferencia === 0 ? `Igual que ${referencia}` : `${conSigno(diferencia)} que ${referencia}`;
}

/** Las cuatro tarjetas: lo que va del año contra lo mismo del año anterior. */
function resumenDelAnio(actual: EstadisticasInscripciones, anterior: EstadisticasInscripciones | undefined, hoy: string): DatoResumen[] {
  const transcurridos = mesesTranscurridos(actual.meses, hoy);
  const cuantos = transcurridos.length;
  const sumar = (anio: EstadisticasInscripciones, campo: "cantidad" | "bajas") =>
    anio.meses.slice(0, cuantos).reduce((total, mes) => total + mes[campo], 0);
  const altas = sumar(actual, "cantidad");
  const bajas = sumar(actual, "bajas");
  const cierre = transcurridos.at(-1);
  const activos = cierre?.activosAlCierre ?? actual.activosAlInicio;
  const referencia = anterior && (cuantos < 12 ? `a esta altura de ${anterior.anio}` : `en ${anterior.anio}`);
  const activosAntes = anterior && cierre ? anterior.meses[cierre.mes - 1]?.activosAlCierre : null;
  return [
    { etiqueta: `Altas en ${actual.anio}`, valor: String(altas), nota: referencia && compararCon(altas - sumar(anterior, "cantidad"), referencia) },
    { etiqueta: `Bajas en ${actual.anio}`, valor: String(bajas), nota: referencia && compararCon(bajas - sumar(anterior, "bajas"), referencia) },
    {
      etiqueta: "Crecimiento en el año",
      valor: conSigno(altas - bajas),
      nota: referencia && compararCon(altas - bajas - (sumar(anterior, "cantidad") - sumar(anterior, "bajas")), referencia),
    },
    {
      etiqueta: "Activos al cierre",
      valor: String(activos),
      nota: activosAntes == null ? undefined : compararCon(activos - activosAntes, "hace un año"),
    },
  ];
}

function Estadisticas({ filtros, hoy }: { filtros: FiltrosInscripciones; hoy: string }) {
  const [metrica, setMetrica] = useState<Metrica>("altas");
  // Cuántos años antes del elegido se comparan: 1 es el año anterior y 2, el de antes.
  const [atras, setAtras] = useState<number[]>([1]);
  const [tablaAbierta, setTablaAbierta] = useState(false);
  const actual = useEstadisticasInscripciones(filtros);
  const anterior = useEstadisticasInscripciones({ ...filtros, anio: filtros.anio - 1 });
  const dosAtras = useEstadisticasInscripciones({ ...filtros, anio: filtros.anio - 2 }, atras.includes(2));

  if (actual.isPending) return <Cargando />;
  if (actual.isError) return <ErrorDelReporte error={actual.error} reintentando={actual.isFetching} onReintentar={() => void actual.refetch()} />;
  if (actual.data.totalAltas === 0 && actual.data.totalBajas === 0) return <SinMovimientos anio={filtros.anio} />;

  const anios = [filtros.anio - 2, filtros.anio - 1, filtros.anio];
  const elegidos = anios.filter((anio) => anio === filtros.anio || atras.includes(filtros.anio - anio));
  const porAnio = new Map<number, EstadisticasInscripciones | undefined>([
    [filtros.anio, actual.data],
    [filtros.anio - 1, anterior.data],
    [filtros.anio - 2, dosAtras.data],
  ]);
  const datos = elegidos.flatMap((anio) => {
    const delAnio = porAnio.get(anio);
    return delAnio ? [delAnio] : [];
  });
  const cargandoAnios = (atras.includes(1) && anterior.isPending) || (atras.includes(2) && dosAtras.isPending);

  return (
    <div className="flex flex-col gap-5">
      <ResumenEnTarjetas datos={resumenDelAnio(actual.data, anterior.data, hoy)} />
      <MesAMes
        metrica={metrica}
        onMetrica={setMetrica}
        anios={anios}
        elegidos={elegidos}
        anioElegido={filtros.anio}
        onAlternarAnio={(anio) => {
          if (anio === filtros.anio) return;
          const distancia = filtros.anio - anio;
          setAtras((previos) => (previos.includes(distancia) ? previos.filter((d) => d !== distancia) : [...previos, distancia]));
        }}
        datos={datos}
        cargando={cargandoAnios}
        hoy={hoy}
        tablaAbierta={tablaAbierta}
        onAlternarTabla={() => setTablaAbierta((abierta) => !abierta)}
      />
      <BajasDelAnioSeccion actual={actual.data} anterior={anterior.data} />
    </div>
  );
}

export function InscripcionesPage() {
  const hoy = fechaActualArgentina();
  const anioActual = Number(hoy.slice(0, 4));
  const [filtros, setFiltros] = useState<FiltrosInscripciones>({ anio: anioActual, idPlan: null, idProfesora: null });
  // La misma consulta que usa Estadisticas: se comparte por la caché.
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
  const conDatos = (consulta.data?.totalAltas ?? 0) + (consulta.data?.totalBajas ?? 0) > 0;

  return (
    <PaginaReportes
      titulo="Inscripciones"
      subtitulo={`Altas y bajas de ${filtros.anio}${aplicados.length > 0 ? ` · ${aplicados.join(" · ")}` : ""}. No se cuentan las pre-inscripciones ni las reactivaciones.`}
      acciones={<MenuExportar disabled={!conDatos || consulta.isFetching} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="min-w-0 space-y-6">
        <FiltrosDeInscripciones filtros={filtros} anioActual={anioActual} onCambiar={setFiltros} />

        {/* Con otro año o filtro la comparación arranca de nuevo, con el año anterior. */}
        <Estadisticas key={JSON.stringify(filtros)} filtros={filtros} hoy={hoy} />
      </div>

      {impresion && <InscripcionesImprimible estadisticas={impresion.datos} descripcion={descripcion} hoy={hoy} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
