import { useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFecha } from "@/components/formulario/campo-fecha";
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
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, FILA_DE_CAMPOS_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import { bloquearPegadoNoNumerico, bloquearTeclasNoNumericas } from "@/utils/entrada-numerica";

interface PropsDialogoMedicion {
  abierto: boolean;
  idAlumno: number;
  nombreAlumno: string;
  medicion: Medicion | null;
  mediciones: Medicion[];
  onClose: () => void;
}

function formatearFechaCorta(fechaIso: string): string {
  const solo = fechaIso.slice(0, 10);
  const partes = solo.split("-");
  const dia = partes[2];
  const mes = partes[1];
  return dia && mes ? `${dia}/${mes}` : solo;
}

export function DialogoMedicion({
  abierto,
  idAlumno,
  nombreAlumno,
  medicion,
  mediciones,
  onClose,
}: PropsDialogoMedicion) {
  const registrar = useRegistrarMedicion(idAlumno);
  const corregir = useCorregirMedicion(idAlumno);
  const hoy = fechaActualArgentina();
  const [mostrarMas, setMostrarMas] = useState(false);

  const formulario = useForm<MedicionFormValues>({
    resolver: zodResolver(crearMedicionFormSchema(hoy)),
    defaultValues: medicion ? valoresDeMedicion(medicion) : { fecha: hoy, medidas: MEDIDAS_VACIAS, observaciones: "" },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = formulario;

  // Mapa de la última medición por código de medida para mostrar "Última: X kg el DD/MM"
  const ultimasMedidas = useMemo(() => {
    const mapa = new Map<CodigoMedida, { valor: number; fecha: string }>();
    for (const m of mediciones) {
      if (medicion && m.id === medicion.id) continue;
      for (const item of m.medidas) {
        const cod = item.codigo as CodigoMedida;
        if (!mapa.has(cod)) {
          mapa.set(cod, { valor: item.valor, fecha: m.fecha });
        }
      }
    }
    return mapa;
  }, [mediciones, medicion]);

  const enviando = registrar.isPending || corregir.isPending;

  const guardar = handleSubmit(async (valores) => {
    try {
      if (medicion) {
        await corregir.mutateAsync({
          idRegistro: medicion.id,
          cuerpo: aCorregirMedicionBody(valores),
        });
        toast.success("Medición actualizada.");
      } else {
        await registrar.mutateAsync(aRegistrarMedicionBody(idAlumno, valores));
        toast.success("Medición registrada.");
      }
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la medición."));
    }
  });

  function renderCampoMedida(codigo: CodigoMedida) {
    const def = MEDIDAS[codigo];
    const ultima = ultimasMedidas.get(codigo);
    const textoUltima = ultima
      ? `Última: ${ultima.valor.toString().replace(".", ",")} ${def.unidad} el ${formatearFechaCorta(ultima.fecha)}`
      : null;

    return (
      <div key={codigo} className={CAMPO_MODAL}>
        <label htmlFor={`medida-${codigo}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {def.etiqueta} <span className="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
        </label>
        <div className="relative">
          <Input
            id={`medida-${codigo}`}
            type="number"
            step="0.1"
            min={0}
            onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
            onPaste={(e) => bloquearPegadoNoNumerico(e, true)}
            placeholder={def.unidad === "%" ? "20" : "60"}
            {...register(`medidas.${codigo}`)}
            className="h-10 rounded-xl border-slate-200 bg-white pr-10 font-medium dark:border-slate-800 dark:bg-slate-900"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            {def.unidad}
          </span>
        </div>
        {textoUltima && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {textoUltima}
          </p>
        )}
        {errors.medidas?.[codigo] && (
          <p className="text-xs font-semibold text-rose-600">{errors.medidas[codigo]?.message}</p>
        )}
      </div>
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent className={cn(CONTENIDO_MODAL, "max-w-lg")}>
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            {medicion ? "Corregir medición" : "Registrar medición"}
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Para {nombreAlumno}. Cargá las medidas que tomaste, al menos una.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void guardar(e)} noValidate className={cn(CUERPO_MODAL, "flex flex-col gap-5 space-y-0")}>
          {/* Fecha */}
          <div className={CAMPO_MODAL}>
            <label htmlFor="fecha-medicion" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Fecha <span className="text-primary">*</span>
            </label>
            <CampoFecha
              id="fecha-medicion"
              name="fecha"
              max={hoy}
              value={watch("fecha") ?? ""}
              onChange={(v) => setValue("fecha", v, { shouldValidate: true })}
              className="h-10 rounded-xl border-slate-200 bg-white font-medium dark:border-slate-800 dark:bg-slate-900"
            />
            {errors.fecha && <p className="text-xs font-semibold text-rose-600">{errors.fecha.message}</p>}
          </div>

          {/* Grid de medidas principales: Peso, Cintura, Cadera, Brazo */}
          <div className={FILA_DE_CAMPOS_MODAL}>
            {renderCampoMedida("PESO")}
            {renderCampoMedida("CINTURA")}
            {renderCampoMedida("CADERA")}
            {renderCampoMedida("BRAZO")}
          </div>

          {/* Toggle de más medidas */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setMostrarMas(!mostrarMas)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer dark:text-slate-400 dark:hover:text-slate-200"
            >
              {mostrarMas ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              <span>Más medidas: grasa, altura, pecho y pierna</span>
            </button>
          </div>

          {mostrarMas && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {renderCampoMedida("GRASA_CORPORAL")}
              {renderCampoMedida("TALLA")}
              {renderCampoMedida("PECHO")}
              {renderCampoMedida("PIERNA")}
            </div>
          )}

          {/* Observaciones */}
          <div className={cn(CAMPO_MODAL, "pt-1")}>
            <label htmlFor="observaciones-medicion" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Observaciones <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="observaciones-medicion"
              rows={2}
              placeholder="Ej: tomada en ayunas"
              {...register("observaciones")}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Footer de acciones estilo Cobrar en Alumnos-Lista */}
          <div className={cn(PIE_MODAL, "-mx-6 -mb-5 mt-2")}>
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
            >
              {enviando ? "Guardando..." : "Guardar medición"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
