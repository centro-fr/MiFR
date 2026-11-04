import { SeccionReporte } from "@/features/reportes/components/piezas-reporte";
import { formatearPorcentaje } from "@/features/reportes/utils/formato-informe";
import { armarMapaDeOcupacion, type CeldaDelMapa, type NivelDeCelda } from "@/features/reportes/utils/mapa-ocupacion";
import type { HorarioOcupado } from "@/types/reportes";
import { cn } from "@/utils/cn";

const DIAS_CORTOS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Los mismos colores que el mapa del Dashboard: del verde (hay lugar) al rojo (no entra nadie más).
const COLOR: Record<NivelDeCelda, { celda: string; texto: string; leyenda: string }> = {
  LIBRE: { celda: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100", texto: "Libre", leyenda: "menos del 60 %" },
  MODERADO: { celda: "bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100", texto: "Moderado", leyenda: "60 a 84 %" },
  CASI_LLENO: { celda: "bg-orange-200 text-orange-950 dark:bg-orange-500/35 dark:text-orange-50", texto: "Casi lleno", leyenda: "85 a 99 %" },
  COMPLETO: { celda: "bg-rose-300 text-rose-950 dark:bg-rose-500/50 dark:text-white", texto: "Completo", leyenda: "100 %" },
  SIN_CUPO: { celda: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200", texto: "Sin cupo", leyenda: "sin tope" },
  SIN_ACTIVIDAD: { celda: "bg-slate-50 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.03] dark:ring-white/10", texto: "Sin actividad", leyenda: "" },
};

function valorDeLaCelda(celda: CeldaDelMapa): string {
  if (celda.nivel === "SIN_ACTIVIDAD") return "";
  if (celda.porcentaje === null) return String(celda.horarios.reduce((total, { inscriptos }) => total + inscriptos, 0));
  return `${Math.round(celda.porcentaje)}%`;
}

function descripcionDeLaCelda(celda: CeldaDelMapa): string {
  const cuando = `${DIAS[celda.dia]} ${celda.hora}`;
  if (celda.nivel === "SIN_ACTIVIDAD") return `${cuando}: sin actividad`;
  const detalle = celda.horarios
    .map((h) => `${h.actividad} con ${h.profesora}, ${h.cupo === null ? `${h.inscriptos} inscriptos, sin cupo` : `${h.inscriptos} de ${h.cupo}`}`)
    .join("; ");
  const ocupacion = celda.porcentaje === null ? "" : `, ${formatearPorcentaje(celda.porcentaje)}`;
  return `${cuando}: ${COLOR[celda.nivel].texto}${ocupacion}. ${detalle}`;
}

function Leyenda() {
  const niveles: NivelDeCelda[] = ["LIBRE", "MODERADO", "CASI_LLENO", "COMPLETO", "SIN_CUPO", "SIN_ACTIVIDAD"];
  return (
    <ul aria-label="Referencias" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground dark:border-slate-800">
      {niveles.map((nivel) => (
        <li key={nivel} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-3 rounded-[3px]", COLOR[nivel].celda)} />
          {COLOR[nivel].texto}
          {COLOR[nivel].leyenda && ` · ${COLOR[nivel].leyenda}`}
        </li>
      ))}
    </ul>
  );
}

/** US-37: el mismo mapa de calor del Dashboard, con los filtros del reporte. */
export function MapaOcupacion({ horarios }: { horarios: HorarioOcupado[] }) {
  const franjas = armarMapaDeOcupacion(horarios);
  return (
    <SeccionReporte
      id="titulo-mapa-ocupacion"
      titulo="Mapa de la semana"
      descripcion="Qué tan llena está cada franja. Si a la misma hora hay dos clases, se suman sus inscriptos y sus cupos."
    >
      <div className="overflow-x-auto">
        <div
          role="group"
          aria-label="Ocupación por día y hora de inicio"
          className="grid min-w-[560px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1 tabular-nums"
        >
          <span />
          {DIAS_CORTOS.slice(1).map((dia) => (
            <span key={dia} className="text-center text-xs font-bold text-muted-foreground">
              {dia}
            </span>
          ))}
          {franjas.map((franja) => (
            <div key={franja.hora} className="contents">
              <span className="flex items-center text-xs font-semibold text-muted-foreground">{franja.hora}</span>
              {franja.celdas.map((celda) => {
                const descripcion = descripcionDeLaCelda(celda);
                return (
                  <span
                    key={celda.dia}
                    role="img"
                    aria-label={descripcion}
                    title={descripcion}
                    className={cn("flex h-8 items-center justify-center rounded-md text-xs font-bold", COLOR[celda.nivel].celda)}
                  >
                    {valorDeLaCelda(celda)}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Leyenda />
    </SeccionReporte>
  );
}
