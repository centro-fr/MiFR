import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  CargandoOpciones,
  DialogoPlanYHorarios,
  ErrorOpciones,
  FormularioPlanYHorarios,
} from "@/features/alumnos/components/formulario-plan-y-horarios";
import { useDatosReactivacion, useReactivarAlumno } from "@/features/alumnos/hooks/use-reactivacion";
import type { ReactivarAlumnoBody } from "@/features/alumnos/schemas/reactivacion";

interface Props {
  idAlumno: number;
  nombre: string;
  onClose: () => void;
}

// US-08: reactivar vuelve a inscribir al alumno. Se proponen el plan, la profesora y los horarios
// que tenía; si alguno ya no tiene cupo, el back lo avisa y se puede elegir otro.
export function ModalReactivarAlumno({ idAlumno, nombre, onClose }: Props) {
  const { datos, error, reintentar } = useDatosReactivacion(idAlumno);
  const reactivar = useReactivarAlumno();

  // mutateAsync y no mutate: al refrescarse la ficha, el botón "Reactivar" (y este modal) se
  // desmonta antes de que corra el onSuccess de mutate, que React Query descarta en ese caso.
  const confirmar = (cuerpo: ReactivarAlumnoBody) => {
    reactivar
      .mutateAsync({ id: idAlumno, cuerpo })
      .then(() => {
        toast.success(`${nombre} quedó activo de nuevo`);
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
      descripcion="Vuelve a quedar activo con el plan y los horarios que elijas. Te proponemos los que tenía antes de la baja."
      procesando={reactivar.isPending}
      onClose={onClose}
    >
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
