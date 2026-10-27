import { createPortal } from "react-dom";
import { fechaHora } from "@/features/honorarios/utils/formato-honorarios";
import { filtrosAplicados, formatearPorcentaje, periodoDelInforme, type FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { InformeAsistencia } from "@/types/reportes";

// Versión para imprimir o "Guardar como PDF" (US-33), como la de honorarios: va directo en <body> y
// la regla de impresión de index.css oculta todo lo demás. Colores fijos y sin `dark:`: el papel es
// blanco aunque la app esté en modo oscuro.

interface PropsImprimible {
  informe: InformeAsistencia;
  descripcion: FiltrosDescritos;
  generadoEl: string;
}

const CELDA = "border-b border-slate-200 px-2 py-1.5 text-left align-top";
const CELDA_NUMERO = `${CELDA} text-right tabular-nums whitespace-nowrap`;

function Encabezados({ columnas }: { columnas: string[] }) {
  return (
    <thead>
      <tr className="text-xs uppercase text-slate-600">
        {columnas.map((columna, indice) => (
          <th key={columna} className={indice === 0 ? CELDA : `${CELDA} text-right`}>
            {columna}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Resumen({ informe }: { informe: InformeAsistencia }) {
  const { resumen } = informe;
  const datos = [
    ["Clases dictadas", String(resumen.clasesDictadas)],
    ["Asistencias", String(resumen.asistencias)],
    ["Inasistencias", String(resumen.inasistencias)],
    ["Asistencia", formatearPorcentaje(resumen.porcentaje)],
  ];
  return (
    <dl className="mt-4 grid grid-cols-4 gap-3">
      {datos.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded border border-slate-300 p-2">
          <dt className="text-xs text-slate-600">{etiqueta}</dt>
          <dd className="text-lg font-bold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InformeAsistenciaImprimible({ informe, descripcion, generadoEl }: PropsImprimible) {
  const filtros = filtrosAplicados(descripcion);
  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR · MiFR</p>
        <h1 className="mt-1 text-2xl font-bold">Informe de asistencia</h1>
        <p className="mt-1 text-sm text-slate-600">
          {periodoDelInforme(informe.desde, informe.hasta)} · Generado el {fechaHora(generadoEl)}
        </p>
        <p className="text-sm text-slate-600">{filtros.length > 0 ? filtros.join(" · ") : "Todos los alumnos, profesoras y actividades"}</p>
      </header>
      <Resumen informe={informe} />

      {informe.porProfesora.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b-2 border-slate-800 pb-1 text-base font-bold">Por profesora</h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <Encabezados columnas={["Profesora", "Clases dictadas", "Alumnos", "Asistencias", "% promedio"]} />
            <tbody>
              {informe.porProfesora.map((p) => (
                <tr key={p.id}>
                  <td className={CELDA}>{`${p.apellido}, ${p.nombre}`}</td>
                  <td className={CELDA_NUMERO}>{p.clasesDictadas}</td>
                  <td className={CELDA_NUMERO}>{p.cantidadAlumnos}</td>
                  <td className={CELDA_NUMERO}>{p.asistencias}</td>
                  <td className={CELDA_NUMERO}>{formatearPorcentaje(p.porcentajePromedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {informe.alumnos.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b-2 border-slate-800 pb-1 text-base font-bold">Por alumno ({informe.alumnos.length})</h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <Encabezados columnas={["Alumno", "Clases previstas", "Asistencias", "Inasistencias", "% asistencia"]} />
            <tbody>
              {informe.alumnos.map((a) => (
                <tr key={a.id} className="break-inside-avoid">
                  <td className={CELDA}>
                    {`${a.apellido}, ${a.nombre}`}
                    {a.dadoDeBaja && <span className="text-slate-600"> (dado de baja)</span>}
                  </td>
                  <td className={CELDA_NUMERO}>{a.clasesPrevistas}</td>
                  <td className={CELDA_NUMERO}>{a.asistencias}</td>
                  <td className={CELDA_NUMERO}>{a.inasistencias}</td>
                  <td className={CELDA_NUMERO}>{formatearPorcentaje(a.porcentaje)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-600">
        Cuentan solo las clases dictadas; las inasistencias incluyen las que registró el cierre automático.
      </footer>
    </div>,
    document.body,
  );
}
