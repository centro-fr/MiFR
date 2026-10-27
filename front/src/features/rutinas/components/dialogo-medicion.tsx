import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldErrors, type UseFormReturn } from "react-hook-form";
import { ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { AREA_DE_TEXTO, CONTROL, ETIQUETA } from "@/features/rutinas/components/estilos-formulario";
import { DialogoDeCarga, MensajeError, Obligatorio, PieDelFormulario } from "@/features/rutinas/components/formulario";
import { useRegistrarMedicion } from "@/features/rutinas/hooks/use-rutinas";
import { MEDIDAS, type CodigoMedida } from "@/features/rutinas/schemas/medidas";
import {
  MEDIDAS_VACIAS,
  aRegistrarMedicionBody,
  crearMedicionFormSchema,
  type MedicionFormValues,
} from "@/features/rutinas/schemas/medicion-form";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

// Peso y cintura son las que más se toman; el resto queda plegado para no llenar el formulario de
// campos que casi nunca se usan.
const MEDIDAS_PRINCIPALES: CodigoMedida[] = ["PESO", "CINTURA"];
const MEDIDAS_ADICIONALES: CodigoMedida[] = ["TALLA", "PECHO", "CADERA", "BRAZO", "PIERNA", "GRASA_CORPORAL"];

const EJEMPLO: Record<CodigoMedida, string> = {
  PESO: "62,4",
  TALLA: "168",
  PECHO: "92",
  CINTURA: "74",
  CADERA: "98",
  BRAZO: "28",
  PIERNA: "54",
  GRASA_CORPORAL: "24",
};

function CampoMedida({ codigo, formulario }: { codigo: CodigoMedida; formulario: UseFormReturn<MedicionFormValues> }) {
  const { etiqueta, unidad } = MEDIDAS[codigo];
  const error = formulario.formState.errors.medidas?.[codigo]?.message;
  const id = `medicion-${codigo.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta} <span className="font-normal text-muted-foreground">({unidad})</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          maxLength={6}
          placeholder={`Ej: ${EJEMPLO[codigo]}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...formulario.register(`medidas.${codigo}`)}
          className={cn(CONTROL, "pr-10")}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-slate-500">
          {unidad}
        </span>
      </div>
      <MensajeError id={`${id}-error`} mensaje={error} />
    </div>
  );
}

function hayAdicionalesConDatos(valores: MedicionFormValues["medidas"], errores: FieldErrors<MedicionFormValues>["medidas"]): boolean {
  return MEDIDAS_ADICIONALES.some((codigo) => valores[codigo].trim() !== "" || errores?.[codigo]);
}

interface PropsFormulario {
  idAlumno: number;
  /** Fechas (AAAA-MM-DD) que ya tienen una medición, para avisar si se carga otra el mismo día. */
  fechasConMedicion: Set<string>;
  onListo: () => void;
}

function FormularioMedicion({ idAlumno, fechasConMedicion, onListo }: PropsFormulario) {
  const registrar = useRegistrarMedicion(idAlumno);
  const hoy = fechaActualArgentina();
  const formulario = useForm<MedicionFormValues>({
    resolver: zodResolver(crearMedicionFormSchema(hoy)),
    defaultValues: { fecha: hoy, medidas: MEDIDAS_VACIAS, observaciones: "" },
  });
  const errores = formulario.formState.errors;
  const [fecha, medidas] = useWatch({ control: formulario.control, name: ["fecha", "medidas"] });
  const [verMas, setVerMas] = useState(false);
  // Si una medida plegada tiene un valor o un error, se muestra: nunca queda un error escondido.
  const adicionalesVisibles = verMas || hayAdicionalesConDatos(medidas, errores.medidas);

  // El botón que las despliega desaparece: el foco pasa a la primera medida que aparece.
  useEffect(() => {
    if (verMas) formulario.setFocus(`medidas.${MEDIDAS_ADICIONALES[0]}`);
  }, [verMas, formulario]);

  const guardar = formulario.handleSubmit(async (valores) => {
    try {
      await registrar.mutateAsync(aRegistrarMedicionBody(idAlumno, valores));
      toast.success("Medición guardada.");
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la medición."));
    }
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="medicion-fecha" className={ETIQUETA}>
          Fecha <Obligatorio />
        </label>
        <input
          id="medicion-fecha"
          type="date"
          max={hoy}
          aria-invalid={Boolean(errores.fecha)}
          aria-describedby={errores.fecha ? "medicion-fecha-error" : fechasConMedicion.has(fecha) ? "medicion-fecha-aviso" : undefined}
          {...formulario.register("fecha")}
          className={cn(CONTROL, "sm:max-w-56")}
        />
        <MensajeError id="medicion-fecha-error" mensaje={errores.fecha?.message} />
        {!errores.fecha && fechasConMedicion.has(fecha) && (
          <p id="medicion-fecha-aviso" className="flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-300">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Ya hay una medición del {formatearFecha(fecha)}. Si guardás, quedan las dos.
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className={cn(ETIQUETA, "mb-1")}>Medidas</legend>
        <p className="-mt-2 text-sm text-muted-foreground">Cargá las que tomaste; como mínimo una.</p>
        <div className="grid grid-cols-2 gap-3">
          {MEDIDAS_PRINCIPALES.map((codigo) => (
            <CampoMedida key={codigo} codigo={codigo} formulario={formulario} />
          ))}
        </div>
        {adicionalesVisibles ? (
          <div className="grid grid-cols-2 gap-3">
            {MEDIDAS_ADICIONALES.map((codigo) => (
              <CampoMedida key={codigo} codigo={codigo} formulario={formulario} />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVerMas(true)}
            className="flex min-h-11 items-center gap-1.5 self-start rounded-xl px-1 text-left text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
            Más medidas: talla, pecho, cadera, brazo, pierna y grasa
          </button>
        )}
        <MensajeError id="medicion-medidas-error" mensaje={errores.medidas?.message} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="medicion-observaciones" className={ETIQUETA}>
          Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="medicion-observaciones"
          rows={3}
          maxLength={500}
          placeholder="Ej: tomada en ayunas"
          aria-invalid={Boolean(errores.observaciones)}
          aria-describedby={errores.observaciones ? "medicion-observaciones-error" : undefined}
          {...formulario.register("observaciones")}
          className={AREA_DE_TEXTO}
        />
        <MensajeError id="medicion-observaciones-error" mensaje={errores.observaciones?.message} />
      </div>

      <PieDelFormulario guardando={registrar.isPending} textoGuardar="Guardar medición" onCancelar={onListo} />
    </form>
  );
}

interface PropsDialogo extends Omit<PropsFormulario, "onListo"> {
  abierto: boolean;
  nombreAlumno: string;
  onClose: () => void;
}

export function DialogoMedicion({ abierto, nombreAlumno, onClose, ...props }: PropsDialogo) {
  return (
    <DialogoDeCarga
      abierto={abierto}
      titulo="Registrar medición"
      descripcion={`Peso y medidas de ${nombreAlumno}. Quedan en su historial de evolución.`}
      onClose={onClose}
    >
      {abierto && <FormularioMedicion {...props} onListo={onClose} />}
    </DialogoDeCarga>
  );
}
