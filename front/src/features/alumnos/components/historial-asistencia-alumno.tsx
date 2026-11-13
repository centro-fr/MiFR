import { useState } from "react";
import { Loader2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { LISTA_MOVIL_EN_TARJETA } from "@/components/ui/estilos-lista";
import { FilaMovil } from "@/components/ui/fila-movil";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { cn } from "@/utils/cn";
import { ASISTENCIAS_POR_PAGINA } from "../api/asistencias-api";
import { useAsistenciasAlumno } from "../hooks/use-asistencias-alumno";
import type { FiltroAsistencia, RegistroAsistenciaAlumno } from "../schemas/asistencia-alumno";

interface Props {
  idAlumno: number;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** "2026-11-09" → "09/11/2026". */
function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// La fecha es de calendario: se arma al mediodía para que el huso horario no la corra de día.
function diaDeLaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha.slice(0, 10)}T12:00:00`).getDay()] ?? "";
}

function EstadoMarca({ asistio }: { asistio: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        asistio
          ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", asistio ? "bg-emerald-500" : "bg-rose-500")} />
      {asistio ? "Presente" : "Ausente"}
    </span>
  );
}

function TablaAsistencias({ marcas }: { marcas: RegistroAsistenciaAlumno[] }) {
  return (
    <>
      <ul aria-label="Asistencias" className={cn(LISTA_MOVIL_EN_TARJETA, "lg:hidden")}>
        {marcas.map((marca) => (
          <FilaMovil
            key={marca.id_clase}
            titulo={`${fechaCorta(marca.fecha)} · ${diaDeLaSemana(marca.fecha)}`}
            insignia={<EstadoMarca asistio={marca.asistio} />}
            detalle={[`${marca.hora_inicio} a ${marca.hora_fin}`, marca.actividad, marca.profesora, marca.observaciones]}
          />
        ))}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">Fecha</th>
              <th scope="col" className="px-4 py-3.5">Horario</th>
              <th scope="col" className="px-4 py-3.5">Actividad</th>
              <th scope="col" className="px-4 py-3.5">Profesor/a</th>
              <th scope="col" className="px-4 py-3.5">Estado</th>
              <th scope="col" className="px-6 py-3.5">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {marcas.map((marca) => (
              <tr key={marca.id_clase} className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60">
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <span className="font-bold text-slate-900 dark:text-white">{fechaCorta(marca.fecha)}</span>
                  <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">{diaDeLaSemana(marca.fecha)}</span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                  {marca.hora_inicio} a {marca.hora_fin}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">{marca.actividad}</td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">{marca.profesora}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <EstadoMarca asistio={marca.asistio} />
                </td>
                <td className="px-6 py-3.5 text-sm font-normal text-slate-500 dark:text-slate-400">{marca.observaciones || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** US-10: el historial de asistencia de la ficha, de a 10, con las pestañas Todas, Presentes y Ausentes. */
export function HistorialAsistenciaAlumno({ idAlumno }: Props) {
  const [filtro, setFiltro] = useState<FiltroAsistencia>("TODAS");
  const [pagina, setPagina] = useState(0);
  const { data, isPending, isError, error, isFetching, refetch } = useAsistenciasAlumno(idAlumno, filtro, pagina);

  const presentes = data?.presentes ?? 0;
  const ausentes = data?.ausentes ?? 0;
  const sinHistorial = data !== undefined && presentes + ausentes === 0;

  function cambiarFiltro(nuevo: FiltroAsistencia) {
    setFiltro(nuevo);
    setPagina(0);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Historial de asistencia</h2>

      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {data && !sinHistorial && (
          <div className="border-b border-slate-100 p-3 dark:border-slate-800">
            <PestanasFiltro
              etiqueta="Filtrar asistencias"
              opciones={[
                { id: "TODAS", etiqueta: "Todas", conteo: presentes + ausentes },
                { id: "PRESENTES", etiqueta: "Presentes", conteo: presentes },
                { id: "AUSENTES", etiqueta: "Ausentes", conteo: ausentes },
              ]}
              valor={filtro}
              onCambiar={cambiarFiltro}
            />
          </div>
        )}

        {isPending ? (
          <div className="flex items-center justify-center py-14 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Loader2 aria-hidden="true" className="mr-2 size-5 animate-spin text-primary" />
            Cargando asistencias…
          </div>
        ) : isError ? (
          <EstadoErrorCarga
            className="border-0 shadow-none"
            mensaje={mensajeDeErrorApi(error, "No se pudo cargar el historial de asistencia.")}
            reintentando={isFetching}
            onReintentar={() => void refetch()}
          />
        ) : sinHistorial ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No hay asistencias registradas todavía</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A medida que la profesora tome asistencia en las clases, acá vas a ver el historial.
            </p>
          </div>
        ) : data.datos.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No hay clases que coincidan con el filtro.</div>
        ) : (
          <>
            <TablaAsistencias marcas={data.datos} />
            {data.total > ASISTENCIAS_POR_PAGINA && (
              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                <PaginacionTabla
                  pagina={pagina}
                  total={data.total}
                  tamanoPagina={ASISTENCIAS_POR_PAGINA}
                  onCambiarPagina={setPagina}
                  etiquetaItems="clases"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
