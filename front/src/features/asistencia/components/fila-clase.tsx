import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import type { EstadoVisibleClase } from "@/features/asistencia/utils/formato-clase";
import { cn } from "@/utils/cn";

const ESTADOS: Record<EstadoVisibleClase, { etiqueta: string; clase: string }> = {
  EN_CURSO: {
    etiqueta: "En curso",
    clase: "border-pink-200 bg-pink-50 text-primary-dark dark:border-primary/40 dark:bg-primary/15 dark:text-pink-200",
  },
  ABIERTA: {
    etiqueta: "Abierta",
    clase: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  CERRADA: {
    etiqueta: "Cerrada",
    clase: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300",
  },
  CANCELADA: {
    etiqueta: "Cancelada",
    clase: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  },
};

export function EstadoClase({ estado }: { estado: EstadoVisibleClase }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-bold", ESTADOS[estado].clase)}>
      {ESTADOS[estado].etiqueta}
    </span>
  );
}

function cupoMaximoDe(clase: ClaseDelDiaApi): number | null {
  return clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
}

/** Inscriptos con una barra de ocupación cuando la clase tiene cupo. */
function Ocupacion({ clase }: { clase: ClaseDelDiaApi }) {
  const cupo = cupoMaximoDe(clase);
  if (clase.inscriptos === 0) return <span className="text-sm text-muted-foreground">Sin inscriptos</span>;
  const texto = `${clase.inscriptos} ${clase.inscriptos === 1 ? "inscripto" : "inscriptos"}`;
  if (cupo === null) return <span className="text-sm font-semibold text-foreground">{texto}</span>;
  const porcentaje = Math.min(100, Math.round((clase.inscriptos / cupo) * 100));
  return (
    <span className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-foreground">
        {clase.inscriptos} / {cupo}
        <span className="sr-only"> inscriptos</span>
      </span>
      <span aria-hidden="true" className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary/70" style={{ width: `${porcentaje}%` }} />
      </span>
    </span>
  );
}

interface FilaClaseProps {
  clase: ClaseDelDiaApi;
  to: string;
  estado: EstadoVisibleClase;
  /** Solo para la propietaria: quien dicta la clase (puede ser una suplente). */
  profesora?: string;
}

/**
 * Una clase del día. Toda la fila es el enlace a su asistencia: es lo único que se hace desde acá,
 * y un blanco grande es más fácil de tocar que un ícono suelto.
 */
export function FilaClase({ clase, to, estado, profesora }: FilaClaseProps) {
  const { actividad } = clase.horario;
  const modalidad = actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada";
  const puedeMarcar = estado === "EN_CURSO" || estado === "ABIERTA";
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "group grid grid-cols-[3.75rem_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary md:grid-cols-[5rem_minmax(0,1fr)_9rem_7rem_9rem] md:gap-x-5 md:px-5",
          estado === "EN_CURSO" && "bg-pink-50/60 dark:bg-primary/10",
        )}
      >
        <span className="row-span-2 flex flex-col leading-tight md:row-span-1">
          <span className="text-base font-extrabold tabular-nums text-foreground">{horaDesdeApi(clase.horario.hora_inicio)}</span>
          <span className="text-xs tabular-nums text-muted-foreground">a {horaDesdeApi(clase.horario.hora_fin)}</span>
        </span>

        <span className="min-w-0">
          <span className="block truncate font-bold text-foreground">{actividad.nombre}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {modalidad}
            {profesora && ` · ${profesora}`}
          </span>
        </span>

        {/* En celular el estado va arriba a la derecha y la ocupación debajo del nombre. */}
        <span className="justify-self-end md:hidden">
          <EstadoClase estado={estado} />
        </span>
        <span className="col-start-2 md:col-start-auto">
          <Ocupacion clase={clase} />
        </span>
        <span className="hidden md:block">
          <EstadoClase estado={estado} />
        </span>

        <span
          className={cn(
            "col-start-3 row-start-2 inline-flex items-center justify-self-end gap-1 text-sm font-bold md:col-start-auto md:row-start-auto",
            puedeMarcar ? "text-primary dark:text-pink-300" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          <span className="hidden md:inline">{puedeMarcar ? "Tomar asistencia" : "Ver asistencia"}</span>
          <span className="sr-only md:hidden">{puedeMarcar ? "Tomar asistencia" : "Ver asistencia"}</span>
          <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </Link>
    </li>
  );
}
