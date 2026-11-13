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

// Con alumnos inscriptos la baja no es inmediata: cada uno sale al terminar su período de gracia, para
// respetar las clases que ya pagaron. Sobre un horario con la baja ya programada, la acción la cancela.
export function ConfirmDeleteModal({ isOpen, horario, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!isOpen || !horario) return null;
  const inscriptos = horario.inscriptos ?? 0;
  const clase = `${horario.actividadNombre} del ${DIA[horario.diaSemana]} ${horario.horaInicio}`;

  if (horario.bajaProgramada) {
    return (
      <ConfirmarAccion
        titulo="¿Cancelar la baja programada?"
        descripcion={`${clase} sigue en el cronograma y vuelve a admitir alumnos nuevos.`}
        textoConfirmar="Cancelar baja"
        onConfirmar={onConfirm}
        onCancelar={onClose}
      />
    );
  }

  return inscriptos > 0 ? (
    <ConfirmarAccion
      titulo="¿Programar la baja del horario?"
      descripcion={`${clase} tiene ${inscriptos} ${inscriptos === 1 ? 'alumno' : 'alumnos'}: no admite nuevos y cada uno sale al terminar su período de gracia.`}
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
