import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { TablaSkeleton } from "@/components/ui/estados-pantalla";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
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
    return <TablaSkeleton conTarjeta={false} ariaLabel="Cargando historial de rendiciones" filas={4} />;
  }

  if (rendiciones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
        <History className="size-8 text-slate-400" />
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          No hay rendiciones en el historial
        </h3>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
          A medida que confirmes la entrega de efectivo de los profesores, quedarán registradas acá.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Alumno
              </th>
              <th scope="col" className="px-4 py-3.5">
                Plan
              </th>
              <th scope="col" className="px-4 py-3.5">
                Profesor/a
              </th>
              <th scope="col" className="px-4 py-3.5">
                Fecha rendición
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Monto rendido
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rendiciones.map((rendicion) => {
              const nombreAlumno = `${rendicion.alumno.nombre} ${rendicion.alumno.apellido}`;
              const nombreProfesora = `${rendicion.profesora.nombre} ${rendicion.profesora.apellido}`;

              return (
                <tr
                  key={rendicion.id_pago}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                        {inicialesDe(rendicion.alumno.nombre, rendicion.alumno.apellido)}
                      </span>
                      <Link
                        to={`/app/alumnos/${rendicion.alumno.id_alumno}`}
                        className="font-bold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                      >
                        {nombreAlumno}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {rendicion.plan}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                    {nombreProfesora}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                    {formatearFechaHora(rendicion.fecha_rendicion)}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                    {formatearPrecio(rendicion.monto)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Rows */}
      <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        {rendiciones.map((rendicion) => {
          const nombreAlumno = `${rendicion.alumno.nombre} ${rendicion.alumno.apellido}`;
          const nombreProfesora = `${rendicion.profesora.nombre} ${rendicion.profesora.apellido}`;

          return (
            <div
              key={rendicion.id_pago}
              className="flex items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                  {inicialesDe(rendicion.alumno.nombre, rendicion.alumno.apellido)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/app/alumnos/${rendicion.alumno.id_alumno}`}
                    className="text-sm font-bold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300 truncate block"
                  >
                    {nombreAlumno}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {rendicion.plan} · {nombreProfesora} · {formatearFechaHora(rendicion.fecha_rendicion)}
                  </p>
                </div>
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white shrink-0">
                {formatearPrecio(rendicion.monto)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
