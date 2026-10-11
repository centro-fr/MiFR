import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, UserX } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatosPersonales } from "@/features/alumnos/components/datos-personales";
import { EncabezadoFicha } from "@/features/alumnos/components/encabezado-ficha";
import { ModalBajaAlumno } from "@/features/alumnos/components/modal-baja-alumno";
import { ModalReactivarAlumno } from "@/features/alumnos/components/modal-reactivar-alumno";
import { PestanasFicha } from "@/features/alumnos/components/pestanas-ficha";
import {
  esAlumnoNoEncontrado,
  useDarDeBajaAlumno,
  useFichaAlumno,
} from "@/features/alumnos/hooks/use-ficha-alumno";
import { useReactivarAlumno } from "@/features/alumnos/hooks/use-reactivacion";
import type { ReactivarAlumnoBody } from "@/features/alumnos/schemas/reactivacion";
import type { FichaAlumno, MotivoBaja } from "@/types/alumno";

// El listado lo implementa otro equipo (US-10); hasta entonces muestra "En construcción".
const RUTA_LISTADO = "/app/alumnos";

function VolverAlListado() {
  return (
    <Link
      to={RUTA_LISTADO}
      className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-transparent dark:text-slate-300"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Volver al listado de alumnos
    </Link>
  );
}

function FichaSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Cargando ficha del alumno…</span>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-11 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function AlumnoNoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-2xl bg-pink-100 text-primary-dark dark:bg-pink-500/15 dark:text-pink-300"
      >
        <UserX className="size-8" />
      </span>
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Alumno no encontrado</h1>
      <p className="max-w-[320px] text-sm text-muted-foreground">
        No existe un alumno con ese identificador. Buscalo desde el listado de alumnos.
      </p>
    </div>
  );
}

function ErrorFicha({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensajeDeErrorApi(error, "No se pudo cargar la ficha del alumno.")}
      </p>
      <Button type="button" onClick={onReintentar} className="rounded-xl px-5 font-bold">
        Reintentar
      </Button>
    </div>
  );
}

// Cada flujo (baja, reactivación) maneja su modal y su mutación; la ficha solo los dispara.
function useFlujoBaja(alumno: FichaAlumno) {
  const darDeBaja = useDarDeBajaAlumno();
  const [abierta, setAbierta] = useState(false);

  const abrir = () => {
    darDeBaja.reset();
    setAbierta(true);
  };

  // El modal también entrega el texto de "Otro motivo", pero el back todavía no tiene dónde
  // guardarlo. Cuando lo agregue, sumarlo acá a la mutación y al cuerpo de darDeBajaAlumno.
  const confirmar = (motivo: MotivoBaja) => {
    darDeBaja.mutate(
      { id: alumno.id, motivo },
      {
        onSuccess: () => {
          setAbierta(false);
          toast.info(`${alumno.nombre} ${alumno.apellido} quedó dado de baja`);
        },
      },
    );
  };

  const modal = abierta && (
    <ModalBajaAlumno
      alumno={alumno}
      dandoDeBaja={darDeBaja.isPending}
      errorBaja={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja al alumno.") : null}
      onClose={() => setAbierta(false)}
      onConfirm={confirmar}
    />
  );
  return { abrir, modal };
}

function useFlujoReactivacion(alumno: FichaAlumno) {
  const reactivar = useReactivarAlumno();
  const [abierta, setAbierta] = useState(false);

  const abrir = () => {
    reactivar.reset();
    setAbierta(true);
  };

  const confirmar = (cuerpo: ReactivarAlumnoBody) => {
    reactivar.mutate(
      { id: alumno.id, cuerpo },
      {
        onSuccess: () => {
          setAbierta(false);
          toast.success(`${alumno.nombre} ${alumno.apellido} quedó activo de nuevo`);
        },
      },
    );
  };

  const modal = abierta && (
    <ModalReactivarAlumno
      alumno={alumno}
      reactivando={reactivar.isPending}
      errorReactivacion={reactivar.isError ? mensajeDeErrorApi(reactivar.error, "No se pudo reactivar al alumno.") : null}
      onClose={() => setAbierta(false)}
      onConfirm={confirmar}
    />
  );
  return { abrir, modal };
}

function FichaConAcciones({ alumno }: { alumno: FichaAlumno }) {
  const baja = useFlujoBaja(alumno);
  const reactivacion = useFlujoReactivacion(alumno);

  return (
    <>
      <EncabezadoFicha alumno={alumno} onDarDeBaja={baja.abrir} onReactivar={reactivacion.abrir} />
      <PestanasFicha />
      <DatosPersonales alumno={alumno} />
      {baja.modal}
      {reactivacion.modal}
    </>
  );
}

function ContenidoFicha({ idAlumno }: { idAlumno: string }) {
  const { data: alumno, isPending, isError, error, refetch } = useFichaAlumno(idAlumno);

  if (isPending) return <FichaSkeleton />;
  if (isError) {
    return esAlumnoNoEncontrado(error) ? (
      <AlumnoNoEncontrado />
    ) : (
      <ErrorFicha error={error} onReintentar={() => void refetch()} />
    );
  }
  return <FichaConAcciones alumno={alumno} />;
}

// Los ids del DER son SERIAL: cualquier otra cosa en la URL no puede ser un alumno.
function esIdValido(id: string | undefined): id is string {
  return id !== undefined && /^[1-9]\d*$/.test(id);
}

export function FichaAlumnoPage() {
  const { idAlumno } = useParams();
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:gap-5">
        <VolverAlListado />
        {esIdValido(idAlumno) ? <ContenidoFicha idAlumno={idAlumno} /> : <AlumnoNoEncontrado />}
      </div>
    </OwnerLayout>
  );
}
