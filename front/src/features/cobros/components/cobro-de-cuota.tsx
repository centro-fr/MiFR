import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { ALUMNOS_QUERY_KEY, useAlumno } from "@/features/alumnos/hooks/use-alumnos";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import { ModalRegistrarCobro } from "@/features/cobros/components/modal-registrar-cobro";

interface Props {
  /** El alumno al que se le cobra la cuota; null con el cobro cerrado. */
  idAlumno: number | null;
  onCerrar: () => void;
}

/**
 * Cobro de la cuota vigente de un alumno (US-15/US-16), desde el listado o la ficha de la profesora.
 * Pide la ficha (la misma caché que la pantalla de detalle) para tener la inscripción y su precio, y al
 * terminar muestra el comprobante si fue en efectivo.
 */
export function CobroDeCuota({ idAlumno, onCerrar }: Props) {
  const queryClient = useQueryClient();
  const consulta = useAlumno(idAlumno ?? 0);
  const [idPagoComprobante, setIdPagoComprobante] = useState<number | null>(null);
  const alumno = idAlumno !== null ? consulta.data : undefined;
  const fallo = idAlumno !== null && consulta.isError;

  // Sin la ficha no se puede abrir el cobro: se avisa y se ofrece reintentar en lugar de no hacer nada.
  const { error, refetch } = consulta;
  useEffect(() => {
    if (!fallo) return;
    toast.error(mensajeDeErrorApi(error, "No se pudieron cargar los datos para el cobro."), {
      action: { label: "Reintentar", onClick: () => void refetch() },
    });
  }, [fallo, error, refetch]);
  const inscripcion = alumno?.inscripcion;

  function terminar(idPago: number | null) {
    onCerrar();
    setIdPagoComprobante(idPago);
    void queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY });
  }

  return (
    <>
      {alumno && inscripcion && (
        <ModalRegistrarCobro
          abierto
          onClose={onCerrar}
          alumno={{
            id_alumno: alumno.id_alumno,
            nombre: alumno.usuario.nombre,
            apellido: alumno.usuario.apellido,
            dni: alumno.usuario.dni,
          }}
          inscripcion={{
            id_inscripcion: inscripcion.id_inscripcion,
            id_plan: inscripcion.plan.id_plan,
            nombre_plan: inscripcion.plan.nombre,
            precio_vigente: inscripcion.plan.precio,
            situacion_cuota: inscripcion.situacion_cuota,
          }}
          plan={{ id: String(inscripcion.plan.id_plan), nombre: inscripcion.plan.nombre }}
          onExito={(idPago) => terminar(idPago)}
          onTransferenciaInformada={() => terminar(null)}
        />
      )}
      {idPagoComprobante !== null && (
        <ModalComprobante idPago={idPagoComprobante} abierto onClose={() => setIdPagoComprobante(null)} />
      )}
    </>
  );
}
