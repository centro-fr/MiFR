import { useState, type FormEvent, type ReactNode } from "react";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { OpcionesDeInscripcion } from "@/features/alumnos/hooks/use-reactivacion";
import {
  aCuerpoReactivacion,
  crearReactivacionSchema,
  type ReactivacionFormValues,
  type ReactivarAlumnoBody,
} from "@/features/alumnos/schemas/reactivacion";
import { formatearPrecio } from "@/features/alumnos/utils/pendientes-de-alta";
import { ajustarSeleccion, etiquetaHorario, horariosElegibles, valoresIniciales } from "@/features/alumnos/utils/reactivacion";
import type { HorarioElegible, InscripcionAnterior } from "@/types/alumno";

// Elegir plan, profesora y horarios con las reglas del back que se pueden ver antes de enviar.
// Lo usan la reactivación (US-08) y el cambio de plan u horarios desde la ficha.

type Errores = Partial<Record<keyof ReactivacionFormValues, string>>;

export interface PropsFormularioPlanYHorarios {
  opciones: OpcionesDeInscripcion;
  /** Lo que se propone de entrada: la inscripción anterior o la actual. */
  propuesta: InscripcionAnterior | null;
  /** Una validación propia del flujo; devuelve los errores a mostrar o null. */
  validarAdemas?: (valores: ReactivacionFormValues) => Errores | null;
  textoConfirmar: string;
  textoProcesando: string;
  procesando: boolean;
  /** Si es true, el plan queda bloqueado en el actual (modo solo cambiar horarios). */
  bloquearPlan?: boolean;
  /** Si es true, la profesora queda bloqueada en la actual (cambio de horario con misma profe). */
  bloquearProfesora?: boolean;
  /** Filtra los horarios para que solo se muestren los de una actividad específica. */
  actividadExclusiva?: string;
  /** Aviso informativo sobre cuándo comenzará a regir el plan. */
  mensajeAviso?: string;
  /** Error del back al guardar (por ejemplo, sin cupo). */
  error: unknown;
  onClose: () => void;
  onConfirm: (cuerpo: ReactivarAlumnoBody) => void;
}

export function FormularioPlanYHorarios({
  opciones,
  propuesta,
  validarAdemas,
  textoConfirmar,
  textoProcesando,
  procesando,
  bloquearPlan,
  bloquearProfesora,
  actividadExclusiva,
  mensajeAviso,
  error,
  onClose,
  onConfirm,
}: PropsFormularioPlanYHorarios) {
  const { planes, profesoras, horarios } = opciones;
  const [valores, setValores] = useState(() => valoresIniciales(propuesta, planes, horarios));
  const [errores, setErrores] = useState<Errores>({});

  const plan = planes.find(({ id }) => id === valores.idPlan);
  const elegiblesBase = horariosElegibles(horarios, plan, valores.idProfesora);
  const elegibles = actividadExclusiva
    ? elegiblesBase.filter((h) => h.actividad.toLowerCase() === actividadExclusiva.toLowerCase())
    : elegiblesBase;

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
    const erroresDelFlujo = validarAdemas?.(resultado.data);
    if (erroresDelFlujo) {
      setErrores(erroresDelFlujo);
      return;
    }
    onConfirm(aCuerpoReactivacion(resultado.data));
  };

  return (
    <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
      {mensajeAviso && (
        <Alert className="rounded-xl border-blue-200 bg-blue-50/70 p-3 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <AlertDescription className="text-xs font-medium leading-relaxed">
            {mensajeAviso}
          </AlertDescription>
        </Alert>
      )}

      <CampoSelect id="inscripcion-plan" etiqueta="Plan" error={errores.idPlan}>
        {(props) => (
          <SelectorDesplegable
            id={props.id}
            aria-invalid={props["aria-invalid"]}
            aria-describedby={props["aria-describedby"]}
            valor={valores.idPlan}
            disabled={bloquearPlan || procesando}
            placeholder="Elegí un plan"
            todos="Elegí un plan"
            opciones={planes.map(({ id, nombre, precio }) => ({
              valor: id,
              texto: precio === null ? nombre : `${nombre} (${formatearPrecio(precio)})`,
            }))}
            onChange={(v) => cambiar({ idPlan: v })}
            variante="formulario"
          />
        )}
      </CampoSelect>

      <CampoSelect id="inscripcion-profesora" etiqueta="Profesora" error={errores.idProfesora}>
        {(props) => (
          <SelectorDesplegable
            id={props.id}
            aria-invalid={props["aria-invalid"]}
            aria-describedby={props["aria-describedby"]}
            valor={valores.idProfesora}
            disabled={bloquearProfesora || procesando}
            placeholder="Elegí una profesora"
            todos="Elegí una profesora"
            opciones={profesoras.map(({ id, nombre, apellido }) => ({
              valor: id,
              texto: `${nombre} ${apellido}`,
            }))}
            onChange={(v) => cambiar({ idProfesora: v })}
            variante="formulario"
          />
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

      {error !== null && error !== undefined && (
        <Alert role="alert" className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
            {mensajeDeErrorApi(error, "No se pudieron guardar los cambios.")}
          </AlertDescription>
        </Alert>
      )}

      <div className="-mx-6 -mb-6 mt-6 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Button
          type="button"
          variant="outline"
          disabled={procesando}
          onClick={onClose}
          className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={procesando} className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark">
          {procesando ? textoProcesando : textoConfirmar}
        </Button>
      </div>
    </form>
  );
}

export function CargandoOpciones() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Cargando planes y horarios…</span>
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

export function ErrorOpciones({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
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
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? "inscripcion-horarios-error" : undefined}>
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
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 has-checked:border-slate-900 has-checked:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:has-checked:border-white dark:has-checked:bg-white/10">
                <input
                  type="checkbox"
                  checked={elegidos.includes(horario.id)}
                  onChange={(evento) => alternar(horario.id, evento.target.checked)}
                  className="size-4 accent-slate-900 dark:accent-white"
                />
                {etiquetaHorario(horario)}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id="inscripcion-horarios-error" role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface PropsDialogo {
  titulo: string;
  descripcion: string;
  /** Mientras se guarda no se cierra con Escape ni tocando afuera. */
  procesando: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function DialogoPlanYHorarios({ titulo, descripcion, procesando, onClose, children }: PropsDialogo) {
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !procesando) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
