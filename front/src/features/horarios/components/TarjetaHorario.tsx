import { Pencil, Trash2, Undo2 } from 'lucide-react';
import type { Horario } from '../../../types/horarios';
import { textoCupo } from '../utils/cupo';
import { InsigniaBajaProgramada } from './insignia-baja-programada';
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
  'h-6 w-6 rounded-md border border-slate-200/80 dark:border-slate-700 bg-slate-50/90 p-1 text-slate-500 shadow-2xs transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 [&_svg]:size-3';

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
        className={cn(CLASES_BOTON_ACCION, horario.bajaProgramada ? 'hover:text-primary' : 'hover:text-destructive')}
        title={`${horario.bajaProgramada ? 'Cancelar la baja programada' : 'Eliminar horario'} de ${contexto}`}
        aria-label={`${horario.bajaProgramada ? 'Cancelar la baja programada' : 'Eliminar horario'} de ${contexto}`}
      >
        {horario.bajaProgramada ? (
          <Undo2 aria-hidden="true" className="stroke-[2.5]" />
        ) : (
          <Trash2 aria-hidden="true" className="stroke-[2.5]" />
        )}
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
    <div className={cn('flex h-full w-full flex-col justify-between', esCompacta ? 'p-2.5' : 'p-3')}>
      {/* Encabezado: Rango horario (estilo Mis Clases) y botones de acción */}
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <span className="inline-block text-[11px] font-extrabold text-primary leading-tight">
          {horario.horaInicio} - {horario.horaFin}
        </span>
        <div className="pointer-events-auto shrink-0">
          <AccionesHorario horario={horario} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* Cuerpo: Actividad y Profesora */}
      <div className="min-w-0 my-0.5">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
          {horario.actividadNombre}
        </h4>
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
          {horario.profesoraNombre}
        </p>
      </div>

      {/* Pie: Modalidad y Cupo (estilo Mis Clases) */}
      <div className="mt-auto pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
        {horario.bajaProgramada ? (
          <InsigniaBajaProgramada compacta />
        ) : (
          <span className="capitalize">
            {horario.actividadTipo === 'PERSONALIZADA' ? 'Pers.' : 'Grupal'}
          </span>
        )}
        <span>
          Cupo: <strong className="font-bold text-slate-700 dark:text-slate-200">{textoCupo(horario.cupoMaximo)}</strong>
        </span>
      </div>
    </div>
  );
}

