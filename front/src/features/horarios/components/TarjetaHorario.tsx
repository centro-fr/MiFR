import { Move, Pencil, Trash2 } from 'lucide-react';
import type { Horario } from '../../../types/horarios';
import { textoCupo } from '../utils/cupo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface AccionesTarjeta {
  onEdit: (horario: Horario) => void;
  onDelete: (horario: Horario) => void;
}

interface TarjetaHorarioProps extends AccionesTarjeta {
  horario: Horario;
  /** Tarjeta de una sola hora: diseño compacto en vez del vertical espacioso. */
  esCompacta: boolean;
  /** Con filtros activos la grilla es solo de consulta: no se ofrece arrastrar. */
  isFilterActive: boolean;
}

const CLASES_BOTON_ACCION =
  'h-5 w-5 rounded bg-white/80 p-1 text-muted-foreground shadow-2xs transition hover:bg-white dark:bg-black/30 dark:hover:bg-black/50 [&_svg]:size-2.5';

function etiquetaTipo(horario: Horario): string {
  return horario.actividadTipo === 'PERSONALIZADA' ? 'Personalizada 1:1' : 'Clase Grupal';
}

/** Editar y eliminar: se muestran al pasar el mouse o al enfocar con el teclado (`sr-only` los deja en el orden de tab). */
function AccionesHorario({ horario, onEdit, onDelete }: AccionesTarjeta & { horario: Horario }) {
  const contexto = `${horario.actividadNombre}, ${horario.diaSemana} ${horario.horaInicio}`;
  return (
    <div className="sr-only flex items-center gap-0.5 group-focus-within:not-sr-only group-hover:not-sr-only">
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

function CabeceraTarjeta({ horario, esCompacta, isFilterActive, onEdit, onDelete }: TarjetaHorarioProps) {
  const { tema } = horario;
  return (
    <div className={cn('flex items-center justify-between gap-1', !esCompacta && 'mb-1.5 flex-wrap')}>
      <div className="flex min-w-0 items-center gap-1">
        <Badge
          variant="outline"
          className={cn(
            'truncate rounded-md border-0 py-0.5 font-black uppercase shadow-2xs',
            esCompacta ? 'max-w-[110px] px-1.5 text-xs' : 'max-w-[130px] px-2 text-sm',
          )}
          style={{ backgroundColor: tema.badgeBg, color: tema.badgeText }}
        >
          {horario.profesoraNombre}
        </Badge>
        {!isFilterActive && (
          <span
            className="text-muted-foreground transition group-hover:text-foreground"
            title="Arrastrá para mover a otra celda o sobre otra clase para intercambiar"
          >
            <Move aria-hidden="true" className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      <div className="pointer-events-auto flex items-center gap-1">
        <span className={cn('font-extrabold tracking-tight text-foreground', esCompacta ? 'text-xs' : 'text-sm')}>
          {horario.horaInicio} - {horario.horaFin} hs
        </span>
        <AccionesHorario horario={horario} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

function CuerpoCompacto({ horario }: { horario: Horario }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-1.5 pt-1">
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-black leading-tight text-foreground">{horario.actividadNombre}</h4>
        <p className="truncate text-xs font-semibold text-foreground/80">{etiquetaTipo(horario)}</p>
      </div>
      <div className="shrink-0 rounded-lg border border-black/5 bg-white/80 px-2 py-0.5 text-right shadow-2xs backdrop-blur-2xs dark:border-white/10 dark:bg-black/30">
        <div className="text-xs font-bold leading-tight text-foreground/80">
          Cupo: <strong className="text-foreground">{textoCupo(horario.cupoMaximo)}</strong>
        </div>
      </div>
    </div>
  );
}

function CuerpoExpandido({ horario }: { horario: Horario }) {
  return (
    <>
      <h4 className="line-clamp-2 text-sm font-black leading-snug text-foreground">{horario.actividadNombre}</h4>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground/80">{etiquetaTipo(horario)}</p>
    </>
  );
}

function PieExpandido({ horario }: { horario: Horario }) {
  return (
    <div className="pointer-events-none mt-auto flex items-center border-t border-black/10 pt-2 text-sm font-medium dark:border-white/10">
      <span className="text-foreground/80">
        Cupo: <strong className="font-bold text-foreground">{textoCupo(horario.cupoMaximo)}</strong>
      </span>
    </div>
  );
}

export function TarjetaHorario(props: TarjetaHorarioProps) {
  const { horario, esCompacta } = props;

  if (esCompacta) {
    return (
      <div className="pointer-events-none flex min-h-0 flex-1 flex-col justify-between">
        <CabeceraTarjeta {...props} />
        <CuerpoCompacto horario={horario} />
      </div>
    );
  }
  return (
    <>
      <div className="pointer-events-none">
        <CabeceraTarjeta {...props} />
        <CuerpoExpandido horario={horario} />
      </div>
      <PieExpandido horario={horario} />
    </>
  );
}
