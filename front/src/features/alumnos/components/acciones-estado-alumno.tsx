import { useState } from "react";
import { RotateCcw, UserX } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { ModalBajaAlumno } from "@/features/alumnos/components/modal-baja-alumno";
import { ModalReactivarAlumno } from "@/features/alumnos/components/modal-reactivar-alumno";
import { useDarDeBajaAlumno } from "@/features/alumnos/hooks/use-alumnos";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { deudaAlIrse, type DeudaAlIrse } from "@/features/alumnos/utils/situacion-cuota";
import type { MotivoBaja } from "@/types/alumno";

interface Props {
  alumno: AlumnoDetalle;
}

// US-08: "Dar de baja" o, si ya está de baja, "Reactivar". Como en el back (inscripcion.routes.ts),
// es solo de la propietaria: la página decide si se muestra.
export function AccionesEstadoAlumno({ alumno }: Props) {
  const nombre = `${alumno.usuario.nombre} ${alumno.usuario.apellido}`;
  return alumno.estado === "BAJA" ? (
    <Reactivar idAlumno={alumno.id_alumno} nombre={nombre} deuda={deudaAlIrse(alumno.inscripciones_de_la_baja)} />
  ) : (
    <DarDeBaja idAlumno={alumno.id_alumno} nombre={nombre} inscripciones={alumno.inscripciones} />
  );
}

const CLASE_BOTON = "min-h-[48px] w-full shrink-0 rounded-xl px-4 font-bold sm:w-auto";

function DarDeBaja({
  idAlumno,
  nombre,
  inscripciones,
}: {
  idAlumno: number;
  nombre: string;
  inscripciones: AlumnoDetalle["inscripciones"];
}) {
  const darDeBaja = useDarDeBajaAlumno(idAlumno);
  const [abierto, setAbierto] = useState(false);

  const abrir = () => {
    darDeBaja.reset();
    setAbierto(true);
  };

  // mutateAsync y no mutate: al refrescarse la ficha, este botón pasa a ser "Reactivar" y se
  // desmonta antes de que corra el onSuccess de mutate, que React Query descarta en ese caso.
  const confirmar = (motivo: MotivoBaja, detalle?: string, idInscripcion?: number) => {
    darDeBaja
      .mutateAsync({ motivo, detalle, idInscripcion })
      .then(() => {
        setAbierto(false);
        toast.info(idInscripcion ? `Se dio de baja el plan seleccionado de ${nombre}` : `${nombre} quedó dado de baja`);
      })
      .catch(() => {
        // El error ya se muestra en el modal (darDeBaja.isError).
      });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={abrir}
        className={`${CLASE_BOTON} border-rose-200 bg-white text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600`}
      >
        <UserX aria-hidden="true" />
        Dar de baja
      </Button>
      {abierto && (
        <ModalBajaAlumno
          nombre={nombre}
          inscripciones={inscripciones}
          dandoDeBaja={darDeBaja.isPending}
          errorBaja={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja al alumno.") : null}
          onClose={() => setAbierto(false)}
          onConfirm={confirmar}
        />
      )}
    </>
  );
}

function Reactivar({ idAlumno, nombre, deuda }: { idAlumno: number; nombre: string; deuda: DeudaAlIrse | null }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)} className={`${CLASE_BOTON} bg-emerald-600 text-white hover:bg-emerald-700`}>
        <RotateCcw aria-hidden="true" />
        Reactivar
      </Button>
      {abierto && <ModalReactivarAlumno idAlumno={idAlumno} nombre={nombre} deuda={deuda} onClose={() => setAbierto(false)} />}
    </>
  );
}
