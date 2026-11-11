import { createPortal } from "react-dom";
import { fechaHora } from "@/features/honorarios/utils/formato-honorarios";
import { describirFiltrosInscripciones, type FiltrosInscripcionesDescritos } from "@/features/reportes/utils/exportar-inscripciones";
import { conSigno, motivosPrincipales } from "@/features/reportes/utils/comparacion-anios";
import { formatearDecimal, mesesTranscurridos } from "@/features/reportes/utils/formato-inscripciones";
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
  const altas = meses.reduce((total, mes) => total + mes.cantidad, 0);
  const bajas = meses.reduce((total, mes) => total + mes.bajas, 0);
  const activos = meses.at(-1)?.activosAlCierre ?? estadisticas.activosAlInicio;
  const { permanencia } = estadisticas.bajas;
  const resumen: [string, string][] = [
    ["Altas", String(altas)],
    ["Bajas", String(bajas)],
    ["Crecimiento", conSigno(altas - bajas)],
    ["Activos al cierre", String(activos)],
  ];
  const filtros = describirFiltrosInscripciones(descripcion);
  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR</p>
        <h1 className="mt-1 text-2xl font-bold">Inscripciones · {estadisticas.anio}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {filtros.length > 0 ? filtros.join(" · ") : "Todos los planes y profesoras"} · Generado el {fechaHora(generadoEl)}
        </p>
      </header>
      <dl className="mt-4 grid grid-cols-4 gap-3">
        {resumen.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded border border-slate-300 p-2">
            <dt className="text-xs text-slate-600">{etiqueta}</dt>
            <dd className="text-lg font-bold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-600">
            <th className={CELDA}>Mes</th>
            <th className={`${CELDA} text-right`}>Altas</th>
            <th className={`${CELDA} text-right`}>Bajas</th>
            <th className={`${CELDA} text-right`}>Activos al cierre</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes) => (
            <tr key={mes.mes}>
              <td className={CELDA}>{mes.nombre}</td>
              <td className={CELDA_NUMERO}>{mes.cantidad}</td>
              <td className={CELDA_NUMERO}>{mes.bajas}</td>
              <td className={CELDA_NUMERO}>{mes.activosAlCierre ?? "—"}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={CELDA}>Total</td>
            <td className={CELDA_NUMERO}>{altas}</td>
            <td className={CELDA_NUMERO}>{bajas}</td>
            <td className={CELDA} />
          </tr>
        </tbody>
      </table>
      {permanencia.cantidad > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">Bajas del año</h2>
          <p className="mt-1 text-sm">
            {motivosPrincipales(estadisticas.bajas.motivos)
              .map(({ nombre, cantidad }) => `${nombre}: ${cantidad}`)
              .join(" · ")}
          </p>
          <p className="mt-1 text-sm">
            Se quedan en promedio {permanencia.promedioMeses === null ? "—" : `${formatearDecimal(permanencia.promedioMeses)} meses`} ·{" "}
            {Math.round((permanencia.primerosTresMeses / permanencia.cantidad) * 100)} % se va en los primeros 3 meses
          </p>
        </section>
      )}
      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-600">
        Cuentan las altas definitivas por su fecha de alta y las bajas por su fecha de baja. Las pre-inscripciones y las reactivaciones no suman.
      </footer>
    </div>,
    document.body,
  );
}
