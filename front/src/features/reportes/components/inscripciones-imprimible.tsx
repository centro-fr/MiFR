import { createPortal } from "react-dom";
import { fechaHora } from "@/features/honorarios/utils/formato-honorarios";
import { describirFiltrosInscripciones, type FiltrosInscripcionesDescritos } from "@/features/reportes/utils/exportar-inscripciones";
import { acumulados, describirComparacion, formatearDecimal, mesesTranscurridos, promedioMensual } from "@/features/reportes/utils/formato-inscripciones";
import type { EstadisticasInscripciones } from "@/types/reportes";

// Versión para imprimir o "Guardar como PDF" (US-35), como la de honorarios y la de asistencia.
// Colores fijos y sin `dark:`: el papel es blanco aunque la app esté en modo oscuro.

interface PropsImprimible {
  estadisticas: EstadisticasInscripciones;
  descripcion: FiltrosInscripcionesDescritos;
  hoy: string;
  generadoEl: string;
}

const CELDA = "border-b border-slate-200 px-2 py-1.5 text-left align-top";
const CELDA_NUMERO = `${CELDA} text-right tabular-nums`;

export function InscripcionesImprimible({ estadisticas, descripcion, hoy, generadoEl }: PropsImprimible) {
  const meses = mesesTranscurridos(estadisticas.meses, hoy);
  const acumulado = acumulados(meses);
  const filtros = describirFiltrosInscripciones(descripcion);
  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR · MiFR</p>
        <h1 className="mt-1 text-2xl font-bold">Inscriptos por mes · {estadisticas.anio}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {filtros.length > 0 ? filtros.join(" · ") : "Todos los planes y profesoras"} · Generado el {fechaHora(generadoEl)}
        </p>
      </header>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded border border-slate-300 p-2">
          <dt className="text-xs text-slate-600">Altas del año</dt>
          <dd className="text-lg font-bold tabular-nums">{estadisticas.totalAltas}</dd>
        </div>
        <div className="rounded border border-slate-300 p-2">
          <dt className="text-xs text-slate-600">Mes con más altas</dt>
          <dd className="text-lg font-bold">{estadisticas.mesPico ? `${estadisticas.mesPico.nombre} (${estadisticas.mesPico.cantidad})` : "—"}</dd>
        </div>
        <div className="rounded border border-slate-300 p-2">
          <dt className="text-xs text-slate-600">Promedio por mes</dt>
          <dd className="text-lg font-bold tabular-nums">{formatearDecimal(promedioMensual(meses))}</dd>
        </div>
      </dl>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-600">
            <th className={CELDA}>Mes</th>
            <th className={`${CELDA} text-right`}>Altas</th>
            <th className={CELDA}>Vs. mes anterior</th>
            <th className={`${CELDA} text-right`}>Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes, indice) => (
            <tr key={mes.mes}>
              <td className={CELDA}>{mes.nombre}</td>
              <td className={CELDA_NUMERO}>{mes.cantidad}</td>
              <td className={CELDA}>{describirComparacion(mes)}</td>
              <td className={CELDA_NUMERO}>{acumulado[indice]}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={CELDA}>Total del año</td>
            <td className={CELDA_NUMERO}>{estadisticas.totalAltas}</td>
            <td className={CELDA} colSpan={2} />
          </tr>
        </tbody>
      </table>
      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-600">
        Cuentan las altas definitivas por su fecha de alta. Las pre-inscripciones y las reactivaciones no suman.
      </footer>
    </div>,
    document.body,
  );
}
