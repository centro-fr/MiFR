import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldErrors, type UseFormReturn } from "react-hook-form";
import { ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { CampoFechaDelFormulario } from "@/components/formulario/campo-fecha-del-formulario";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { ConfirmarMedicionDelMismoDia } from "@/features/rutinas/components/confirmaciones-medicion";
import { AREA_DE_TEXTO, CONTROL, CONTROL_FECHA, ETIQUETA } from "@/features/rutinas/components/estilos-formulario";
import { DialogoDeCarga, MensajeError, Obligatorio, PieDelFormulario } from "@/features/rutinas/components/formulario";
import { useCorregirMedicion, useRegistrarMedicion } from "@/features/rutinas/hooks/use-rutinas";
import { MEDIDAS, type CodigoMedida } from "@/features/rutinas/schemas/medidas";
import {
  MEDIDAS_VACIAS,
  aCorregirMedicionBody,
  aRegistrarMedicionBody,
  crearMedicionFormSchema,
  valoresDeMedicion,
  type MedicionFormValues,
} from "@/features/rutinas/schemas/medicion-form";
import type { Medicion } from "@/types/rutinas";
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
  /** La que se corrige; null para registrar una nueva. */
  medicion: Medicion | null;
  /** Las del alumno, de la más reciente a la más antigua, para avisar si se carga otra el mismo día. */
  mediciones: Medicion[];
  onListo: () => void;
}

function FormularioMedicion({ idAlumno, medicion, mediciones, onListo }: PropsFormulario) {
  const registrar = useRegistrarMedicion(idAlumno);
  const corregir = useCorregirMedicion(idAlumno);
  const hoy = fechaActualArgentina();
  const formulario = useForm<MedicionFormValues>({
    resolver: zodResolver(crearMedicionFormSchema(hoy)),
    defaultValues: medicion ? valoresDeMedicion(medicion) : { fecha: hoy, medidas: MEDIDAS_VACIAS, observaciones: "" },
  });
  // isDirty se lee al renderizar: el formState de react-hook-form solo calcula lo que se lee ahí.
  const { errors: errores, isDirty: huboCambios } = formulario.formState;
  const [fecha, medidas] = useWatch({ control: formulario.control, name: ["fecha", "medidas"] });
  const [verMas, setVerMas] = useState(false);
  // Lo cargado mientras se pregunta si reemplaza a la medición de ese día o se suma.
  const [porConfirmar, setPorConfirmar] = useState<{ valores: MedicionFormValues; existente: Medicion } | null>(null);
  const otraDelDia = (dia: string) => mediciones.find((otra) => otra.fecha === dia && otra.id !== medicion?.id) ?? null;
  const otraDeLaFecha = otraDelDia(fecha);
  // Si una medida plegada tiene un valor o un error, se muestra: nunca queda un error escondido.
  const adicionalesVisibles = verMas || hayAdicionalesConDatos(medidas, errores.medidas);

  // El botón que las despliega desaparece: el foco pasa a la primera medida que aparece.
  useEffect(() => {
    if (verMas) formulario.setFocus(`medidas.${MEDIDAS_ADICIONALES[0]}`);
  }, [verMas, formulario]);

  async function enviar(guardarEnElBack: () => Promise<unknown>, exito: string) {
    try {
      await guardarEnElBack();
      toast.success(exito);
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la medición."));
    }
  }

  const registrarNueva = (valores: MedicionFormValues) =>
    enviar(() => registrar.mutateAsync(aRegistrarMedicionBody(idAlumno, valores)), "Medición guardada.");
  const reemplazar = (idRegistro: number, valores: MedicionFormValues, exito: string) =>
    enviar(() => corregir.mutateAsync({ idRegistro, cuerpo: aCorregirMedicionBody(valores) }), exito);

  const guardar = formulario.handleSubmit(async (valores) => {
    if (medicion) {
      // Sin cambios no se manda nada: si no, quedaría marcada como corregida sin serlo.
      if (!huboCambios) return onListo();
      return reemplazar(medicion.id, valores, "Medición corregida.");
    }
    const existente = otraDelDia(valores.fecha);
    if (existente) return setPorConfirmar({ valores, existente });
    return registrarNueva(valores);
  });

  function resolverMismoDia(accion: (valores: MedicionFormValues) => Promise<void>) {
    if (!porConfirmar) return;
    setPorConfirmar(null);
    void accion(porConfirmar.valores);
  }

  return (
    <>
      <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="medicion-fecha" className={ETIQUETA}>
            Fecha <Obligatorio />
          </label>
          <div className="sm:max-w-56">
            <CampoFechaDelFormulario
              control={formulario.control}
              name="fecha"
              id="medicion-fecha"
              etiquetaCalendario="Abrir calendario para la fecha de la medición"
              className={CONTROL_FECHA}
              max={hoy}
              aria-invalid={Boolean(errores.fecha)}
              aria-describedby={errores.fecha ? "medicion-fecha-error" : otraDeLaFecha ? "medicion-fecha-aviso" : undefined}
            />
          </div>
          <MensajeError id="medicion-fecha-error" mensaje={errores.fecha?.message} />
          {!errores.fecha && otraDeLaFecha && (
            <p id="medicion-fecha-aviso" className="flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-300">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {medicion
                ? `Ya hay otra medición del ${formatearFecha(fecha)}. Si guardás, quedan las dos.`
                : `Ya hay una medición del ${formatearFecha(fecha)}. Al guardar vas a elegir si la reemplazás o sumás esta.`}
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

        <PieDelFormulario
          guardando={registrar.isPending || corregir.isPending}
          textoGuardar={medicion ? "Guardar corrección" : "Guardar medición"}
          onCancelar={onListo}
        />
      </form>
      <ConfirmarMedicionDelMismoDia
        existente={porConfirmar?.existente ?? null}
        onReemplazar={(existente) => resolverMismoDia((valores) => reemplazar(existente.id, valores, "Medición reemplazada."))}
        onGuardarOtra={() => resolverMismoDia(registrarNueva)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </>
  );
}

interface PropsDialogo extends Omit<PropsFormulario, "onListo"> {
  abierto: boolean;
  nombreAlumno: string;
  onClose: () => void;
}

export function DialogoMedicion({ abierto, nombreAlumno, onClose, ...props }: PropsDialogo) {
  const { medicion } = props;
  return (
    <DialogoDeCarga
      abierto={abierto}
      titulo={medicion ? "Corregir medición" : "Registrar medición"}
      descripcion={
        medicion
          ? `La del ${formatearFecha(medicion.fecha)} de ${nombreAlumno}. Lo que guardes reemplaza lo que tenía.`
          : `Peso y medidas de ${nombreAlumno}. Quedan en su historial de evolución.`
      }
      onClose={onClose}
    >
      {abierto && <FormularioMedicion {...props} onListo={onClose} />}
    </DialogoDeCarga>
  );
}
