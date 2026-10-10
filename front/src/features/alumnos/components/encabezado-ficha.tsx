import { Pencil, RotateCcw, Wallet } from "lucide-react";
import { Can } from "@/components/guards/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import {
  calcularEdad,
  formatearDiaDeTimestamp,
  formatearDni,
  formatearFecha,
  inicialesDe,
  textoEdad,
} from "@/features/alumnos/utils/formato-ficha";
import type { EstadoAlumno, FichaAlumno } from "@/types/alumno";
import { cn } from "@/utils/cn";

// Colores de docs/sdd/03-alumnos-e-inscripciones/tasks.md (verde activo, gris baja);
// INACTIVO va en ámbar: sigue inscripto pero no está asistiendo.
const ESTILO_ESTADO: Record<EstadoAlumno, { texto: string; clases: string }> = {
  ACTIVO: {
    texto: "Activo",
    clases: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  INACTIVO: {
    texto: "Inactivo",
    clases: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  },
  BAJA: {
    texto: "De baja",
    clases: "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-300",
  },
};

// Edición (US-09), reactivación (US-08) y cobros todavía no están implementados.
const TITULO_PROXIMAMENTE = "Disponible próximamente";

export function BadgeEstadoAlumno({ estado }: { estado: EstadoAlumno }) {
  const { texto, clases } = ESTILO_ESTADO[estado];
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", clases)}>
      <span aria-hidden="true" className="mr-1.5 size-1.5 rounded-full bg-current" />
      {texto}
    </Badge>
  );
}

function DatosIdentificatorios({ alumno }: { alumno: FichaAlumno }) {
  const edad = calcularEdad(alumno.fechaNacimiento);
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-slate-600 dark:text-slate-400">
      {alumno.dni && (
        <li>
          DNI: <strong className="text-slate-800 dark:text-slate-200">{formatearDni(alumno.dni)}</strong>
        </li>
      )}
      <li>
        Edad: <strong className="text-slate-800 dark:text-slate-200">{textoEdad(edad)}</strong> (
        {formatearFecha(alumno.fechaNacimiento)})
      </li>
      <li>Alta: {formatearDiaDeTimestamp(alumno.fechaAlta)}</li>
      {alumno.fechaBaja && <li>Baja: {formatearDiaDeTimestamp(alumno.fechaBaja)}</li>}
    </ul>
  );
}

function BotonBajaOReactivar({ estaDeBaja, onDarDeBaja }: { estaDeBaja: boolean; onDarDeBaja: () => void }) {
  const clases =
    "col-span-2 rounded-xl border-rose-200 bg-white px-4 font-bold text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white sm:col-span-1 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600";
  if (estaDeBaja) {
    return (
      <Button disabled variant="outline" title={TITULO_PROXIMAMENTE} className={clases}>
        <RotateCcw aria-hidden="true" />
        Reactivar
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" onClick={onDarDeBaja} className={clases}>
      Dar de baja
    </Button>
  );
}

interface AccionesFichaProps {
  estaDeBaja: boolean;
  onDarDeBaja: () => void;
}

function AccionesFicha({ estaDeBaja, onDarDeBaja }: AccionesFichaProps) {
  const { hasRole, hasPermission } = usePermissions();
  // Como en el back (inscripcion.routes.ts): la profesora también tiene ALUMNOS_EDITAR para
  // pre-inscribir, pero dar de baja o reactivar es solo de la propietaria.
  const puedeDarDeBaja = hasRole("PROPIETARIA") && hasPermission("ALUMNOS_EDITAR");

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3.5 sm:flex sm:flex-wrap sm:border-0 sm:pt-0 dark:border-white/10">
      <Can permission="ALUMNOS_EDITAR">
        <Button disabled title={TITULO_PROXIMAMENTE} className="rounded-xl bg-primary px-4 font-bold text-white">
          <Pencil aria-hidden="true" />
          Editar ficha
        </Button>
      </Can>
      <Button
        disabled
        title={TITULO_PROXIMAMENTE}
        className="rounded-xl bg-slate-900 px-4 font-bold text-white dark:bg-white/10"
      >
        <Wallet aria-hidden="true" className="text-emerald-400" />
        Registrar cobro
      </Button>
      {puedeDarDeBaja && <BotonBajaOReactivar estaDeBaja={estaDeBaja} onDarDeBaja={onDarDeBaja} />}
    </div>
  );
}

interface EncabezadoFichaProps {
  alumno: FichaAlumno;
  onDarDeBaja: () => void;
}

export function EncabezadoFicha({ alumno, onDarDeBaja }: EncabezadoFichaProps) {
  return (
    <section
      aria-label="Resumen del alumno"
      className="flex flex-col gap-3.5 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-5 dark:bg-surface-low"
    >
      <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
        <div
          aria-hidden="true"
          className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-primary-dark to-primary text-lg font-extrabold text-white sm:size-16 sm:text-xl"
        >
          {inicialesDe(alumno.nombre, alumno.apellido)}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {alumno.nombre} {alumno.apellido}
            </h1>
            <BadgeEstadoAlumno estado={alumno.estado} />
          </div>
          <DatosIdentificatorios alumno={alumno} />
        </div>
      </div>
      <AccionesFicha estaDeBaja={alumno.estado === "BAJA"} onDarDeBaja={onDarDeBaja} />
    </section>
  );
}
