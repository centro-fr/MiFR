import { createPortal } from "react-dom";
import { fechaHora } from "@/features/honorarios/utils/formato-honorarios";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import { formatearPrecio } from "@/utils/moneda";

// Versión para imprimir o "Guardar como PDF" de los informes armados como TablaExportable. Colores
// fijos y sin `dark:`: el papel es blanco aunque la app esté en modo oscuro.

const CELDA = "border-b border-slate-200 px-2 py-1.5 text-left align-top";
const CELDA_NUMERO = `${CELDA} text-right tabular-nums`;

function texto(valor: string | number, decimales: number | undefined): string {
  if (typeof valor === "string") return valor;
  return decimales === 2 ? formatearPrecio(valor) : String(valor);
}

export function TablaImprimible({ tabla, generadoEl }: { tabla: TablaExportable; generadoEl: string }) {
  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR</p>
        <h1 className="mt-1 text-2xl font-bold">{tabla.titulo}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {tabla.detalle} · Generado el {fechaHora(generadoEl)}
        </p>
      </header>
      {tabla.resumen.length > 0 && (
        <dl className="mt-4 grid grid-cols-4 gap-3">
          {tabla.resumen.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="rounded border border-slate-300 p-2">
              <dt className="text-xs text-slate-600">{etiqueta}</dt>
              <dd className="text-lg font-bold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-600">
            {tabla.columnas.map((columna) => (
              <th key={columna.titulo} className={columna.decimales !== undefined ? `${CELDA} text-right` : CELDA}>
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila, indice) => (
            <tr key={indice}>
              {fila.map((valor, columna) => {
                const decimales = tabla.columnas[columna]?.decimales;
                return (
                  <td key={columna} className={decimales !== undefined ? CELDA_NUMERO : CELDA}>
                    {texto(valor, decimales)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tabla.pie && <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-600">{tabla.pie}</footer>}
    </div>,
    document.body,
  );
}
