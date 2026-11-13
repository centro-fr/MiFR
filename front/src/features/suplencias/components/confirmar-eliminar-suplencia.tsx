import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { ConfirmarAccion } from "@/components/ui/confirmar-accion";
import { fechaCorta, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { useEliminarSuplencia } from "@/features/suplencias/hooks/use-suplencias";
import type { Suplencia } from "@/types/suplencia";

interface Props {
  suplencia: Suplencia | null;
  onClose: () => void;
}

export function ConfirmarEliminarSuplencia({ suplencia, onClose }: Props) {
  const eliminar = useEliminarSuplencia();
  if (!suplencia) return null;

  async function confirmar(idClase: Suplencia["idClase"]) {
    try {
      await eliminar.mutateAsync(idClase);
      toast.success("Suplencia eliminada.");
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo eliminar la suplencia."));
    }
  }

  return (
    <ConfirmarAccion
      titulo="¿Seguro que desea eliminar?"
      descripcion={`${suplencia.actividad.nombre} del ${fechaCorta(suplencia.fechaClase)} vuelve a quedar a cargo de ${nombreCompleto(suplencia.titular)}.`}
      textoConfirmar="Eliminar"
      textoConfirmando="Eliminando…"
      confirmando={eliminar.isPending}
      onConfirmar={() => void confirmar(suplencia.idClase)}
      onCancelar={onClose}
    />
  );
}
