import { Pencil, Trash2 } from 'lucide-react';
import type { Horario } from '../../../types/horarios';
import { textoCupo } from '../utils/cupo';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface AccionesTarjeta {
  onEdit: (horario: Horario) => void;
  onDelete: (horario: Horario) => void;
}

interface TarjetaHorarioProps extends AccionesTarjeta {
  horario: Horario;
  /** Tarjeta de una sola hora: diseño compacto. */
  esCompacta: boolean;
  /** Con filtros activos la grilla es solo de consulta: no se ofrece arrastrar. */
  isFilterActive: boolean;
}

const CLASES_BOTON_ACCION =
  'h-6 w-6 rounded-lg bg-white/90 p-1 text-slate-500 shadow-2xs transition hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 [&_svg]:size-3';

/** Editar y eliminar: se muestran al pasar el mouse o al enfocar con el teclado (`sr-only` los deja en el orden de tab). */
function AccionesHorario({ horario, onEdit, onDelete }: AccionesTarjeta & { horario: Horario }) {
  const contexto = `${horario.actividadNombre}, ${horario.diaSemana} ${horario.horaInicio}`;
  return (
    <div className="sr-only flex items-center gap-1 group-focus-within:not-sr-only group-hover:not-sr-only">
      <Button
        type="button"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(horario);
        }}
        className={cn(CLASES_BOTON_ACCION, 'hover:text-primary')}
        title={`Editar horario de ${contexto}`}
        aria-label={`Editar horario de ${contexto}`}
      >
        <Pencil aria-hidden="true" className="stroke-[2.5]" />
      </Button>
      <Button
        type="button"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(horario);
        }}
        className={cn(CLASES_BOTON_ACCION, 'hover:text-destructive')}
        title={`Eliminar horario de ${contexto}`}
        aria-label={`Eliminar horario de ${contexto}`}
      >
        <Trash2 aria-hidden="true" className="stroke-[2.5]" />
      </Button>
    </div>
  );
}

export function TarjetaHorario({
  horario,
  esCompacta,
  onEdit,
  onDelete,
}: TarjetaHorarioProps) {
  return (
    <div className="flex h-full w-full flex-col justify-between p-3">
      {/* Encabezado: Título actividad y botones de acción */}
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <h4 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight text-slate-900 dark:text-white line-clamp-2">
          {horario.actividadNombre}
        </h4>
        <div className="pointer-events-auto shrink-0">
          <AccionesHorario horario={horario} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* Subtítulos: Profesora y Rango Horario */}
      <div className="mt-1 space-y-0.5">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
          {horario.profesoraNombre}
        </p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {horario.horaInicio} - {horario.horaFin}
        </p>
      </div>

      {/* Footer / Cupo (si no es ultra compacta) */}
      {!esCompacta && (
        <div className="mt-auto pt-1.5 border-t border-black/5 dark:border-white/10 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Cupo: <strong className="font-bold text-slate-700 dark:text-slate-200">{textoCupo(horario.cupoMaximo)}</strong></span>
        </div>
      )}
    </div>
  );
}

