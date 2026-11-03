import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { Info, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { CampoFechaDelFormulario } from "@/components/formulario/campo-fecha-del-formulario";
import { Button } from "@/components/ui/button";
import { AREA_DE_TEXTO, CONTROL, CONTROL_FECHA, ETIQUETA } from "@/features/rutinas/components/estilos-formulario";
import { DialogoDeCarga, MensajeError, Obligatorio, PieDelFormulario } from "@/features/rutinas/components/formulario";
import { useCrearRutina } from "@/features/rutinas/hooks/use-rutinas";
import {
  MAXIMO_DIAS,
  MAXIMO_EJERCICIOS,
  aCrearRutinaBody,
  diaVacio,
  ejercicioVacio,
  rutinaFormSchema,
  valoresIniciales,
  type RutinaFormValues,
} from "@/features/rutinas/schemas/rutina-form";
import type { Rutina } from "@/types/rutinas";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

type Formulario = UseFormReturn<RutinaFormValues>;

// En el celular cada ejercicio es una tarjeta con sus etiquetas; desde sm, una fila bajo un encabezado.
const COLUMNAS = "sm:grid-cols-[minmax(0,2fr)_4.5rem_5.5rem_minmax(0,1.5fr)_2.75rem]";
const ETIQUETA_DE_FILA = "text-xs font-bold text-slate-600 sm:sr-only dark:text-slate-300";
const ERROR_DE_FILA = "text-xs font-semibold text-rose-700 dark:text-rose-300";

interface PropsCampoDeFila {
  id: string;
  etiqueta: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

function CampoDeFila({ id, etiqueta, error, className, children }: PropsCampoDeFila) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className={ETIQUETA_DE_FILA}>
        {etiqueta}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} role="alert" className={ERROR_DE_FILA}>
          {error}
        </p>
      )}
    </div>
  );
}

function EjerciciosDelDia({ formulario, indiceDia }: { formulario: Formulario; indiceDia: number }) {
  const ejercicios = useFieldArray({ control: formulario.control, name: `dias.${indiceDia}.ejercicios` });
  const errores = formulario.formState.errors.dias?.[indiceDia]?.ejercicios;
  const nombreDelDia = `día ${indiceDia + 1}`;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className={cn("hidden gap-2 px-0.5 text-xs font-bold text-slate-500 sm:grid dark:text-slate-400", COLUMNAS)}>
        <span>Ejercicio</span>
        <span>Series</span>
        <span>Reps</span>
        <span>Notas</span>
      </div>
      <ol className="flex flex-col gap-2">
        {ejercicios.fields.map((campo, indice) => {
          const base = `rutina-dia${indiceDia}-ej${indice}`;
          const ruta = `dias.${indiceDia}.ejercicios.${indice}` as const;
          const error = errores?.[indice];
          return (
            <li key={campo.id} className={cn("relative grid grid-cols-2 gap-2 rounded-xl border border-border p-3 pr-12 sm:border-0 sm:p-0 sm:pr-0", COLUMNAS)}>
              <CampoDeFila id={`${base}-nombre`} etiqueta="Ejercicio" error={error?.nombre?.message} className="col-span-2 sm:col-span-1">
                {(props) => <input {...props} type="text" maxLength={80} placeholder="Ej: Sentadilla" {...formulario.register(`${ruta}.nombre`)} className={CONTROL} />}
              </CampoDeFila>
              <CampoDeFila id={`${base}-series`} etiqueta="Series" error={error?.series?.message}>
                {(props) => <input {...props} type="text" inputMode="numeric" maxLength={2} placeholder="4" {...formulario.register(`${ruta}.series`)} className={CONTROL} />}
              </CampoDeFila>
              <CampoDeFila id={`${base}-reps`} etiqueta="Repeticiones" error={error?.repeticiones?.message}>
                {(props) => <input {...props} type="text" maxLength={30} placeholder="12" {...formulario.register(`${ruta}.repeticiones`)} className={CONTROL} />}
              </CampoDeFila>
              <CampoDeFila id={`${base}-notas`} etiqueta="Notas (opcional)" error={error?.notas?.message} className="col-span-2 sm:col-span-1">
                {(props) => <input {...props} type="text" maxLength={200} placeholder="Ej: 20 kg" {...formulario.register(`${ruta}.notas`)} className={CONTROL} />}
              </CampoDeFila>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => ejercicios.remove(indice)}
                disabled={ejercicios.fields.length === 1}
                aria-label={`Quitar el ejercicio ${indice + 1} del ${nombreDelDia}`}
                className="absolute top-2 right-2 size-11 rounded-full text-slate-500 hover:bg-slate-100 hover:text-rose-700 sm:static sm:size-11 dark:hover:bg-slate-800"
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="ghost"
        onClick={() => ejercicios.append(ejercicioVacio())}
        disabled={ejercicios.fields.length >= MAXIMO_EJERCICIOS}
        className="min-h-11 self-start rounded-xl px-2 font-bold text-primary hover:bg-pink-50 dark:hover:bg-primary/15"
      >
        <Plus aria-hidden="true" />
        Agregar ejercicio
      </Button>
    </div>
  );
}

function DiasDeLaRutina({ formulario }: { formulario: Formulario }) {
  const dias = useFieldArray({ control: formulario.control, name: "dias" });
  const errores = formulario.formState.errors.dias;

  return (
    <div className="flex flex-col gap-4">
      {dias.fields.map((campo, indice) => {
        const id = `rutina-dia${indice}-nombre`;
        const error = errores?.[indice]?.nombre?.message;
        return (
          <fieldset key={campo.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-slate-50 p-3 sm:p-4 dark:bg-white/5">
            <legend className="sr-only">Día {indice + 1}</legend>
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor={id} className={ETIQUETA}>
                  Día {indice + 1} <Obligatorio />
                </label>
                <input
                  id={id}
                  type="text"
                  maxLength={60}
                  placeholder="Ej: Piernas"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  {...formulario.register(`dias.${indice}.nombre`)}
                  className={CONTROL}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => dias.remove(indice)}
                disabled={dias.fields.length === 1}
                aria-label={`Quitar el día ${indice + 1}`}
                className="min-h-11 shrink-0 rounded-xl font-bold text-rose-700 hover:text-rose-800 dark:text-rose-300"
              >
                <Trash2 aria-hidden="true" />
                <span className="hidden sm:inline">Quitar día</span>
              </Button>
            </div>
            <MensajeError id={`${id}-error`} mensaje={error} />
            <EjerciciosDelDia formulario={formulario} indiceDia={indice} />
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="outline"
        onClick={() => dias.append(diaVacio(dias.fields.length + 1))}
        disabled={dias.fields.length >= MAXIMO_DIAS}
        className="min-h-11 self-start rounded-xl font-bold"
      >
        <Plus aria-hidden="true" />
        Agregar día
      </Button>
    </div>
  );
}

interface PropsFormulario {
  idAlumno: number;
  /** La rutina actual: el formulario parte de ella y, al guardar, pasa al historial. */
  vigente: Rutina | null;
  onListo: () => void;
}

function FormularioRutina({ idAlumno, vigente, onListo }: PropsFormulario) {
  const crear = useCrearRutina(idAlumno);
  const formulario = useForm<RutinaFormValues>({
    resolver: zodResolver(rutinaFormSchema),
    defaultValues: valoresIniciales(fechaActualArgentina(), vigente),
  });
  const errores = formulario.formState.errors;

  const guardar = formulario.handleSubmit(async (valores) => {
    try {
      await crear.mutateAsync(aCrearRutinaBody(idAlumno, valores));
      toast.success(vigente ? "Rutina actualizada. La anterior quedó en el historial." : "Rutina guardada.");
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la rutina."));
    }
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
      {vigente && (
        <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Se guarda como una rutina nueva desde la fecha que elijas. La actual pasa al historial.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rutina-nombre" className={ETIQUETA}>
          Nombre <Obligatorio />
        </label>
        <input
          id="rutina-nombre"
          type="text"
          maxLength={100}
          placeholder="Ej: Fuerza – etapa 1"
          aria-invalid={Boolean(errores.nombre)}
          aria-describedby={errores.nombre ? "rutina-nombre-error" : undefined}
          {...formulario.register("nombre")}
          className={CONTROL}
        />
        <MensajeError id="rutina-nombre-error" mensaje={errores.nombre?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rutina-desde" className={ETIQUETA}>
            Desde <Obligatorio />
          </label>
          <CampoFechaDelFormulario
            control={formulario.control}
            name="desde"
            id="rutina-desde"
            etiquetaCalendario="Abrir calendario para la fecha de inicio"
            className={CONTROL_FECHA}
            aria-invalid={Boolean(errores.desde)}
            aria-describedby={errores.desde ? "rutina-desde-error" : undefined}
          />
          <MensajeError id="rutina-desde-error" mensaje={errores.desde?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rutina-hasta" className={ETIQUETA}>
            Hasta <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <CampoFechaDelFormulario
            control={formulario.control}
            name="hasta"
            id="rutina-hasta"
            etiquetaCalendario="Abrir calendario para la fecha de fin"
            className={CONTROL_FECHA}
            aria-invalid={Boolean(errores.hasta)}
            aria-describedby={errores.hasta ? "rutina-hasta-error" : undefined}
          />
          <MensajeError id="rutina-hasta-error" mensaje={errores.hasta?.message} />
        </div>
      </div>

      <section aria-labelledby="rutina-dias-titulo" className="flex flex-col gap-3">
        <div>
          <h3 id="rutina-dias-titulo" className={ETIQUETA}>
            Días y ejercicios
          </h3>
          <p className="text-sm text-muted-foreground">
            Hasta {MAXIMO_DIAS} días. Las repeticiones admiten texto, como 8-10 o 30 s.
          </p>
        </div>
        <DiasDeLaRutina formulario={formulario} />
      </section>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rutina-observaciones" className={ETIQUETA}>
          Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="rutina-observaciones"
          rows={3}
          maxLength={500}
          placeholder="Ej: si te molesta la rodilla, bajá el peso en sentadilla"
          aria-invalid={Boolean(errores.observaciones)}
          aria-describedby={errores.observaciones ? "rutina-observaciones-error" : undefined}
          {...formulario.register("observaciones")}
          className={AREA_DE_TEXTO}
        />
        <MensajeError id="rutina-observaciones-error" mensaje={errores.observaciones?.message} />
      </div>

      <PieDelFormulario guardando={crear.isPending} textoGuardar="Guardar rutina" onCancelar={onListo} />
    </form>
  );
}

interface PropsDialogo extends Omit<PropsFormulario, "onListo"> {
  abierto: boolean;
  nombreAlumno: string;
  onClose: () => void;
}

export function DialogoRutina({ abierto, nombreAlumno, vigente, onClose, idAlumno }: PropsDialogo) {
  return (
    <DialogoDeCarga
      abierto={abierto}
      titulo={vigente ? "Cambiar rutina" : "Cargar rutina"}
      descripcion={`Lo que ${nombreAlumno} tiene que hacer en cada día de entrenamiento.`}
      onClose={onClose}
      ancho="amplio"
    >
      {abierto && <FormularioRutina idAlumno={idAlumno} vigente={vigente} onListo={onClose} />}
    </DialogoDeCarga>
  );
}
