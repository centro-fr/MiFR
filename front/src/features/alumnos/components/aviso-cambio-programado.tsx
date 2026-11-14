import { useState } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { ConfirmarAccion } from "@/components/ui/confirmar-accion";
import { useCancelarCambioPlan } from "@/features/alumnos/hooks/use-reactivacion";
import type { CambioPlanProgramado } from "@/features/alumnos/schemas/alumno";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { fechaCalendarioCorta } from "@/utils/fecha";

interface Props {
  idInscripcion: number;
  cambio: CambioPlanProgramado;
}

/** US-14: el cambio de plan que espera a que termine la gracia de la cuota actual. Lo cancela la propietaria. */
export function AvisoCambioProgramado({ idInscripcion, cambio }: Props) {
  const { hasRole } = usePermissions();
  const cancelar = useCancelarCambioPlan();
  const [confirmando, setConfirmando] = useState(false);
  const fecha = fechaCalendarioCorta(cambio.fecha_aplicacion);

  const confirmar = () =>
    cancelar.mutate(idInscripcion, {
      onSuccess: () => {
        toast.success("Se canceló el cambio de plan programado.");
        setConfirmando(false);
      },
    });

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
      <p>
        El {fecha} pasa al plan <strong className="font-bold text-slate-900 dark:text-white">{cambio.nombre_plan}</strong> con{" "}
        {cambio.nombre_profesora}, al terminar la gracia de la cuota actual.
      </p>
      {hasRole("PROPIETARIA") && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmando(true)}
          className="h-9 shrink-0 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancelar cambio
        </Button>
      )}
      {confirmando && (
        <ConfirmarAccion
          titulo="¿Cancelar el cambio de plan?"
          descripcion={`Sigue con el plan actual y no pasa a ${cambio.nombre_plan} el ${fecha}.`}
          textoConfirmar="Cancelar cambio"
          textoConfirmando="Cancelando…"
          confirmando={cancelar.isPending}
          error={cancelar.error ? mensajeDeErrorApi(cancelar.error, "No se pudo cancelar el cambio.") : null}
          onConfirmar={confirmar}
          onCancelar={() => {
            cancelar.reset();
            setConfirmando(false);
          }}
        />
      )}
    </div>
  );
}
