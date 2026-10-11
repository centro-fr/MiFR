import { useState, type FormEvent, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatosReactivacion, type DatosReactivacion } from "@/features/alumnos/hooks/use-reactivacion";
import {
  aCuerpoReactivacion,
  crearReactivacionSchema,
  type ReactivacionFormValues,
  type ReactivarAlumnoBody,
} from "@/features/alumnos/schemas/reactivacion";
import { formatearPrecio } from "@/features/alumnos/utils/pendientes-de-alta";
import { ajustarSeleccion, etiquetaHorario, horariosElegibles, valoresIniciales } from "@/features/alumnos/utils/reactivacion";
import type { FichaAlumno, HorarioElegible } from "@/types/alumno";

const CLASE_SELECT =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-surface-low dark:text-slate-200";

type Errores = Partial<Record<keyof ReactivacionFormValues, string>>;

interface Props {
  alumno: FichaAlumno;
  reactivando: boolean;
  /** Error del back al reactivar (por ejemplo, sin cupo). */
  errorReactivacion: string | null;
  onClose: () => void;
  onConfirm: (cuerpo: ReactivarAlumnoBody) => void;
}

// US-08: reactivar vuelve a inscribir al alumno. Se proponen el plan, la profesora y los horarios
// que tenía; si alguno ya no tiene cupo, el back lo avisa y se puede elegir otro.
export function ModalReactivarAlumno({ alumno, reactivando, errorReactivacion, onClose, onConfirm }: Props) {
  const { datos, error, reintentar } = useDatosReactivacion(alumno.id);

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !reactivando) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-border p-6 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <div className="flex flex-col gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            <RotateCcw className="size-5" />
          </span>
          <DialogTitle className="text-base font-extrabold text-dark dark:text-white">
            Reactivar a {alumno.nombre} {alumno.apellido}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Vuelve a quedar activo con el plan y los horarios que elijas. Te proponemos los que tenía antes de la baja.
          </DialogDescription>
        </div>
        {datos ? (
          <FormularioReactivacion
            datos={datos}
            reactivando={reactivando}
            errorReactivacion={errorReactivacion}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        ) : error ? (
          <ErrorDatos error={error} onReintentar={reintentar} />
        ) : (
          <CargandoDatos />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CargandoDatos() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Cargando planes y horarios…</span>
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function ErrorDatos({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensajeDeErrorApi(error, "No se pudieron cargar los planes y horarios.")}
      </p>
      <Button type="button" onClick={onReintentar} className="rounded-xl px-5 font-bold">
        Reintentar
      </Button>
    </div>
  );
}

type PropsFormulario = Omit<Props, "alumno"> & { datos: DatosReactivacion };

function FormularioReactivacion({ datos, reactivando, errorReactivacion, onClose, onConfirm }: PropsFormulario) {
  const { planes, profesoras, horarios } = datos;
  const [valores, setValores] = useState(() => valoresIniciales(datos.anterior, planes, horarios));
  const [errores, setErrores] = useState<Errores>({});

  const plan = planes.find(({ id }) => id === valores.idPlan);
  const elegibles = horariosElegibles(horarios, plan, valores.idProfesora);

  const cambiar = (cambio: Partial<ReactivacionFormValues>) => {
    setValores((actuales) => ajustarSeleccion({ ...actuales, ...cambio }, planes, horarios));
    setErrores({});
  };

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = crearReactivacionSchema(plan?.clasesPorSemana ?? null).safeParse(valores);
    if (!resultado.success) {
      const { fieldErrors } = resultado.error.flatten();
      setErrores({ idPlan: fieldErrors.idPlan?.[0], idProfesora: fieldErrors.idProfesora?.[0], idsHorarios: fieldErrors.idsHorarios?.[0] });
      return;
    }
    onConfirm(aCuerpoReactivacion(resultado.data));
  };

  return (
    <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
      <CampoSelect id="reactivar-plan" etiqueta="Plan" error={errores.idPlan}>
        {(props) => (
          <select {...props} value={valores.idPlan} onChange={(evento) => cambiar({ idPlan: evento.target.value })} className={CLASE_SELECT}>
            <option value="">Elegí un plan</option>
            {planes.map(({ id, nombre, precio }) => (
              <option key={id} value={id}>
                {precio === null ? nombre : `${nombre} (${formatearPrecio(precio)})`}
              </option>
            ))}
          </select>
        )}
      </CampoSelect>

      <CampoSelect id="reactivar-profesora" etiqueta="Profesora" error={errores.idProfesora}>
        {(props) => (
          <select {...props} value={valores.idProfesora} onChange={(evento) => cambiar({ idProfesora: evento.target.value })} className={CLASE_SELECT}>
            <option value="">Elegí una profesora</option>
            {profesoras.map(({ id, nombre, apellido }) => (
              <option key={id} value={id}>
                {nombre} {apellido}
              </option>
            ))}
          </select>
        )}
      </CampoSelect>

      <ListaHorarios
        horarios={elegibles}
        elegidos={valores.idsHorarios}
        listoParaElegir={Boolean(plan && valores.idProfesora)}
        clasesPorSemana={plan?.clasesPorSemana ?? null}
        error={errores.idsHorarios}
        onChange={(idsHorarios) => cambiar({ idsHorarios })}
      />

      {errorReactivacion && (
        <Alert role="alert" className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">{errorReactivacion}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-row items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={reactivando}
          onClick={onClose}
          className="rounded-xl border-slate-200 px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={reactivando} className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark">
          {reactivando ? "Reactivando..." : "Reactivar alumno"}
        </Button>
      </div>
    </form>
  );
}

interface PropsDelSelect {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

function CampoSelect({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: (props: PropsDelSelect) => ReactNode }) {
  const idError = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {etiqueta} <span className="text-rose-600" aria-hidden="true">*</span>
        <span className="sr-only">(obligatorio)</span>
      </label>
      {children({ id, "aria-invalid": error !== undefined, "aria-describedby": error ? idError : undefined })}
      {error && (
        <p id={idError} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

interface PropsListaHorarios {
  horarios: HorarioElegible[];
  elegidos: string[];
  listoParaElegir: boolean;
  clasesPorSemana: number | null;
  error?: string;
  onChange: (idsHorarios: string[]) => void;
}

function ListaHorarios({ horarios, elegidos, listoParaElegir, clasesPorSemana, error, onChange }: PropsListaHorarios) {
  const alternar = (id: string, marcado: boolean) =>
    onChange(marcado ? [...elegidos, id] : elegidos.filter((elegido) => elegido !== id));

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? "reactivar-horarios-error" : undefined}>
      <legend className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">
        Horarios <span className="text-rose-600" aria-hidden="true">*</span>
        <span className="sr-only">(obligatorio)</span>
        {clasesPorSemana !== null && (
          <span className="ml-1 font-medium text-muted-foreground">
            (hasta {clasesPorSemana} por semana)
          </span>
        )}
      </legend>
      {!listoParaElegir ? (
        <p className="text-sm text-muted-foreground">Elegí el plan y la profesora para ver sus horarios.</p>
      ) : horarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">La profesora no tiene horarios para este plan. Probá con otra profesora.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {horarios.map((horario) => (
            <li key={horario.id}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 has-checked:border-primary has-checked:bg-pink-50 dark:border-white/15 dark:text-slate-200 dark:has-checked:bg-primary/15">
                <input
                  type="checkbox"
                  checked={elegidos.includes(horario.id)}
                  onChange={(evento) => alternar(horario.id, evento.target.checked)}
                  className="size-4 accent-primary"
                />
                {etiquetaHorario(horario)}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id="reactivar-horarios-error" role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}
