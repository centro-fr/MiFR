import { CheckCircle2, History, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatearPrecio } from "@/utils/moneda";
import type { CobroRendido } from "../schemas/rendicion";

interface Props {
  rendiciones: CobroRendido[];
  cargando: boolean;
}

function formatearFechaHora(fechaIso: string): string {
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${horas}:${minutos}`;
}

export function TablaHistorialRendiciones({ rendiciones, cargando }: Props) {
  if (cargando) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
        <Loader2 className="size-5 animate-spin text-primary" />
        Cargando historial de rendiciones…
      </div>
    );
  }

  if (rendiciones.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-800">
        <History className="size-8 text-slate-400" />
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          No hay rendiciones en el historial
        </h3>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
          A medida que confirmes la entrega de efectivo de los profesores, quedarán registradas acá.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Fecha rendición
              </th>
              <th scope="col" className="px-4 py-3.5">
                Profesor/a
              </th>
              <th scope="col" className="px-4 py-3.5">
                Alumno
              </th>
              <th scope="col" className="px-4 py-3.5">
                Plan
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Monto rendido
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rendiciones.map((rendicion) => (
              <tr
                key={rendicion.id_pago}
                className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
              >
                <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {formatearFechaHora(rendicion.fecha_rendicion)}
                </td>
                <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                  {rendicion.profesora.nombre} {rendicion.profesora.apellido}
                </td>
                <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200">
                  {rendicion.alumno.nombre} {rendicion.alumno.apellido}
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                  {rendicion.plan}
                </td>
                <td className="px-6 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                  {formatearPrecio(rendicion.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 xl:hidden">
        {rendiciones.map((rendicion) => (
          <Card
            key={rendicion.id_pago}
            className="w-full min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-4 text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate flex-1 min-w-0">
                {rendicion.profesora.nombre} {rendicion.profesora.apellido}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white shrink-0">
                {formatearPrecio(rendicion.monto)}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Alumno: {rendicion.alumno.nombre} {rendicion.alumno.apellido} ({rendicion.plan})
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="size-3.5" />
                <span>Rendido en caja</span>
              </div>
              <span>{formatearFechaHora(rendicion.fecha_rendicion)}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
