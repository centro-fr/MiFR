import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EstadoAlReactivar } from "@/features/alumnos/api/reactivacion-api";
import {
  CargandoOpciones,
  DialogoPlanYHorarios,
  ErrorOpciones,
  FormularioPlanYHorarios,
} from "@/features/alumnos/components/formulario-plan-y-horarios";
import { useDatosReactivacion, useReactivarAlumno } from "@/features/alumnos/hooks/use-reactivacion";
import type { ReactivarAlumnoBody } from "@/features/alumnos/schemas/reactivacion";
import { textoDeuda, type DeudaAlIrse } from "@/features/alumnos/utils/situacion-cuota";

interface Props {
  idAlumno: number;
  nombre: string;
  /** Lo que debía el día de la baja (US-08): se advierte antes de reactivarlo. */
  deuda: DeudaAlIrse | null;
  onClose: () => void;
}

// El back decide el estado según si el alumno pagó alguna vez, así que el aviso sale de su respuesta.
function mensajeAlReactivar(nombre: string, estado: EstadoAlReactivar): string {
  return estado === "ACTIVA"
    ? `${nombre} quedó activo de nuevo`
    : `${nombre} quedó pre-inscripto: el alta se confirma con su primer pago, desde Pendientes de alta`;
}

// US-08: reactivar vuelve a inscribir al alumno. Se proponen el plan, la profesora y los horarios
// que tenía; si alguno ya no tiene cupo, el back lo avisa y se puede elegir otro.
export function ModalReactivarAlumno({ idAlumno, nombre, deuda, onClose }: Props) {
  const { datos, error, reintentar } = useDatosReactivacion(idAlumno);
  const reactivar = useReactivarAlumno();

  // mutateAsync y no mutate: al refrescarse la ficha, el botón "Reactivar" (y este modal) se
  // desmonta antes de que corra el onSuccess de mutate, que React Query descarta en ese caso.
  const confirmar = (cuerpo: ReactivarAlumnoBody) => {
    reactivar
      .mutateAsync({ id: idAlumno, cuerpo })
      .then((estado) => {
        toast.success(mensajeAlReactivar(nombre, estado));
        onClose();
      })
      .catch(() => {
        // El error ya se muestra en el formulario (reactivar.error).
      });
  };

  return (
    <DialogoPlanYHorarios
      icono={<RotateCcw className="size-5" />}
      titulo={`Reactivar a ${nombre}`}
      descripcion="Se inscribe en el plan y los horarios que elijas; te proponemos los que tenía antes de la baja. Si nunca pagó una cuota, queda pre-inscripto hasta su primer pago."
      procesando={reactivar.isPending}
      onClose={onClose}
    >
      {deuda && (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">{textoDeuda(deuda)}</AlertDescription>
        </Alert>
      )}
      {datos ? (
        <FormularioPlanYHorarios
          opciones={datos}
          propuesta={datos.anterior}
          textoConfirmar="Reactivar alumno"
          textoProcesando="Reactivando..."
          procesando={reactivar.isPending}
          error={reactivar.error}
          onClose={onClose}
          onConfirm={confirmar}
        />
      ) : error ? (
        <ErrorOpciones error={error} onReintentar={reintentar} />
      ) : (
        <CargandoOpciones />
      )}
    </DialogoPlanYHorarios>
  );
}
