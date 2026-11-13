import type { Horario } from '../../../types/horarios';
import { ConfirmarAccion } from '@/components/ui/confirmar-accion';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  horario: Horario | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DIA: Record<Horario['diaSemana'], string> = {
  LUNES: 'lunes',
  MARTES: 'martes',
  MIERCOLES: 'miércoles',
  JUEVES: 'jueves',
  VIERNES: 'viernes',
  SABADO: 'sábado',
  DOMINGO: 'domingo',
};

// Con alumnos inscriptos la baja no es inmediata: se aplica cuando vence la cuota de cada uno, para
// respetar las clases que ya pagaron.
export function ConfirmDeleteModal({ isOpen, horario, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!isOpen || !horario) return null;
  const conteo = horario as unknown as { inscriptos_count?: number; inscriptosCount?: number };
  const inscriptos = conteo.inscriptos_count ?? conteo.inscriptosCount ?? 0;
  const clase = `${horario.actividadNombre} del ${DIA[horario.diaSemana]} ${horario.horaInicio}`;

  return inscriptos > 0 ? (
    <ConfirmarAccion
      titulo="¿Programar la baja del horario?"
      descripcion={`${clase} tiene ${inscriptos} ${inscriptos === 1 ? 'alumno' : 'alumnos'}: se da de baja cuando venzan sus cuotas y no admite nuevos.`}
      textoConfirmar="Programar baja"
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  ) : (
    <ConfirmarAccion
      titulo="¿Seguro que desea eliminar?"
      descripcion={`${clase} sale del cronograma y queda en el historial.`}
      textoConfirmar="Eliminar"
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  );
}
