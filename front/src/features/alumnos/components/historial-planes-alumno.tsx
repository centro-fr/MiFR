import type { AlumnoDetalle, InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { formatearPrecio } from "@/utils/moneda";
import { cn } from "@/utils/cn";

interface HistorialPlanesAlumnoProps {
  alumno: AlumnoDetalle;
}

interface ItemHistorialPlan {
  id: number;
  nombre: string;
  frecuencia: string;
  modalidad: string;
  profesora: string;
  periodo: string;
  precio: number;
  estado: "Vigente" | "Finalizado";
}

function formatearFechaCorta(fechaIso: string | null): string {
  if (!fechaIso) return "-";
  return formatearFecha(fechaIso);
}

// Cada horario de la inscripción es una clase por semana.
function obtenerFrecuencia(inscripcion: InscripcionDeAlumno): string {
  const cantidad = inscripcion.horarios?.length ?? 0;
  if (cantidad === 0) return "-";
  return `${cantidad} ${cantidad === 1 ? "clase" : "clases"} por semana`;
}

// La actividad que cursa; si sus horarios son de más de una, van todas.
function obtenerModalidad(inscripcion: InscripcionDeAlumno): string {
  const actividades = [...new Set((inscripcion.horarios ?? []).map((horario) => horario.actividad))];
  return actividades.length > 0 ? actividades.join(", ") : "-";
}

const CELDA_TEXTO = "px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300";

export function HistorialPlanesAlumno({ alumno }: HistorialPlanesAlumnoProps) {
  const items: ItemHistorialPlan[] = [];

  // 1. Inscripciones vigentes
  const vigentes = alumno.inscripciones?.length
    ? alumno.inscripciones
    : alumno.inscripcion
      ? [alumno.inscripcion]
      : [];

  vigentes.forEach((inscripcion) => {
    items.push({
      id: inscripcion.id_inscripcion,
      nombre: inscripcion.plan.nombre,
      frecuencia: obtenerFrecuencia(inscripcion),
      modalidad: obtenerModalidad(inscripcion),
      profesora: inscripcion.profesora,
      periodo: `Desde ${formatearFechaCorta(inscripcion.fecha_inicio)}`,
      precio: inscripcion.plan.precio,
      estado: "Vigente",
    });
  });

  // 2. Inscripciones de bajas / anteriores
  (alumno.inscripciones_de_la_baja ?? []).forEach((inscripcion) => {
    items.push({
      id: inscripcion.id_inscripcion,
      nombre: inscripcion.plan.nombre,
      frecuencia: obtenerFrecuencia(inscripcion),
      modalidad: obtenerModalidad(inscripcion),
      profesora: inscripcion.profesora,
      periodo: alumno.fecha_baja
        ? `${formatearFechaCorta(inscripcion.fecha_inicio)} al ${formatearFechaCorta(alumno.fecha_baja)}`
        : `Desde ${formatearFechaCorta(inscripcion.fecha_inicio)}`,
      precio: inscripcion.plan.precio,
      estado: "Finalizado",
    });
  });

  return (
    <div className="space-y-3 mt-6">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Historial de planes
      </h2>

      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No hay registros de planes en el historial.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Frecuencia
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Modalidad
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Profesor/a
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Período
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Precio
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {items.map((item) => {
                const esVigente = item.estado === "Vigente";
                return (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap font-bold text-sm text-slate-900 dark:text-white">
                      {item.nombre}
                    </td>
                    <td className={CELDA_TEXTO}>{item.frecuencia}</td>
                    <td className={CELDA_TEXTO}>{item.modalidad}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                      {item.profesora}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                      {item.periodo}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                      {formatearPrecio(item.precio)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
                          esVigente
                            ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            esVigente ? "bg-emerald-500" : "bg-slate-400",
                          )}
                          aria-hidden="true"
                        />
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
