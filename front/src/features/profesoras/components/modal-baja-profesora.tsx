import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmarAccion } from "@/components/ui/confirmar-accion";
import { BOTON_MODAL_PRINCIPAL } from "@/components/ui/estilos-modal";
import type { Profesora } from "@/features/profesoras/schemas/profesora";

interface Props {
  profesora: Profesora;
  cantidadHorarios?: number;
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// Con clases a cargo no se puede dar de baja: el cronograma quedaría con clases sin docente. Primero
// se reasignan o se dan de baja sus horarios.
export function ModalBajaProfesora({ profesora, cantidadHorarios = 0, dandoDeBaja, errorBaja, onClose, onConfirm }: Props) {
  if (cantidadHorarios > 0) {
    return (
      <ConfirmarAccion
        titulo={`${profesora.nombreCompleto} tiene clases a cargo`}
        descripcion={`Reasigná o dá de baja ${cantidadHorarios === 1 ? "su clase" : `sus ${cantidadHorarios} clases`} en Horarios antes de darla de baja.`}
        textoConfirmar="Ir a Horarios"
        onConfirmar={onClose}
        onCancelar={onClose}
        accionAlternativa={
          <Button asChild className={BOTON_MODAL_PRINCIPAL}>
            <Link to="/app/horarios">Ir a Horarios</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ConfirmarAccion
      titulo="¿Seguro que desea realizar la baja?"
      descripcion="Se conserva su historial y deja de estar disponible para nuevos horarios."
      textoConfirmar="Dar de baja"
      textoConfirmando="Dando de baja…"
      confirmando={dandoDeBaja}
      error={errorBaja}
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  );
}
