import { useState, useMemo } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAsistenciasAlumno } from "../hooks/use-asistencias-alumno";

interface Props {
  idAlumno: number;
}

type FiltroAsistencia = "TODAS" | "PRESENTES" | "AUSENTES";

function formatearFechaTabla(fechaIso: string): string {
  const soloFecha = fechaIso.includes("T") ? fechaIso.slice(0, 10) : fechaIso;
  const [anio, mes, dia] = soloFecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function HistorialAsistenciaAlumno({ idAlumno }: Props) {
  const { data: asistencias = [], isLoading } = useAsistenciasAlumno(idAlumno);
  const [filtro, setFiltro] = useState<FiltroAsistencia>("TODAS");

  const conteoPresentes = useMemo(
    () => asistencias.filter((a) => a.asistio).length,
    [asistencias],
  );
  const conteoAusentes = useMemo(
    () => asistencias.filter((a) => !a.asistio).length,
    [asistencias],
  );

  const asistenciasFiltradas = useMemo(() => {
    if (filtro === "PRESENTES") return asistencias.filter((a) => a.asistio);
    if (filtro === "AUSENTES") return asistencias.filter((a) => !a.asistio);
    return asistencias;
  }, [asistencias, filtro]);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Historial de asistencia
      </h2>

      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {/* Header con pestañas idénticas a Alumno-Listado */}
        {asistencias.length > 0 && (
          <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setFiltro("TODAS")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filtro === "TODAS"
                  ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
              )}
            >
              <span>Todas</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-extrabold",
                  filtro === "TODAS"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {asistencias.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltro("PRESENTES")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filtro === "PRESENTES"
                  ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
              )}
            >
              <span>Presentes</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-extrabold",
                  filtro === "PRESENTES"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {conteoPresentes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltro("AUSENTES")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filtro === "AUSENTES"
                  ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
              )}
            >
              <span>Ausentes</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-extrabold",
                  filtro === "AUSENTES"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {conteoAusentes}
              </span>
            </button>
          </div>
        )}

      {isLoading ? (
        <div className="flex items-center justify-center py-14 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 aria-hidden="true" className="mr-2 size-5 animate-spin text-primary" />
          Cargando asistencias…
        </div>
      ) : asistencias.length === 0 ? (
        <div className="p-10 text-center">
          <CalendarCheck className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            No hay asistencias registradas todavía
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A medida que la profesora tome asistencia en las clases programadas, acá verás el historial detallado.
          </p>
        </div>
      ) : asistenciasFiltradas.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No hay clases que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Fecha
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Horario
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Actividad
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Profesor/a
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {asistenciasFiltradas.map((asistencia) => (
                <tr
                  key={asistencia.id_clase}
                  className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60"
                >
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatearFechaTabla(asistencia.fecha)}
                    </span>
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      {asistencia.dia}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                    {asistencia.hora_inicio} a {asistencia.hora_fin}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">
                    {asistencia.actividad}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                    {asistencia.profesora}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
                        asistencia.asistio
                          ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full shrink-0",
                          asistencia.asistio ? "bg-emerald-500" : "bg-rose-500",
                        )}
                        aria-hidden="true"
                      />
                      {asistencia.asistio ? "Presente" : "Ausente"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400 font-normal">
                    {asistencia.observaciones || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
