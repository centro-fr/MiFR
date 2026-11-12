import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { Textarea } from "@/components/ui/textarea";
import { suplenciaFormSchema, type SuplenciaFormValues } from "@/features/suplencias/schemas/suplencia";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { Suplencia } from "@/types/suplencia";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface Props {
  abierto: boolean;
  suplencia: Suplencia | null;
  horarios: HorarioApi[];
  profesoras: ProfesoraDatos[];
  guardando: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (datos: SuplenciaFormValues) => void;
  /** AAAA-MM-DD con el que arranca una suplencia nueva: un día del mes que se está mirando. */
  fechaSugerida?: string;
}

function valoresIniciales(suplencia: Suplencia | null, fechaSugerida: string): SuplenciaFormValues {
  return suplencia
    ? { fechaClase: suplencia.fechaClase.slice(0, 10), idHorario: suplencia.idHorario, idProfesoraSuplente: suplencia.suplente.id, motivo: suplencia.motivo ?? "" }
    : { fechaClase: fechaSugerida, idHorario: "", idProfesoraSuplente: "", motivo: "" };
}

export function SuplenciaDialog({
  abierto,
  suplencia,
  horarios,
  profesoras,
  guardando,
  error,
  onClose,
  onSubmit,
  fechaSugerida = fechaActualArgentina(),
}: Props) {
  const formulario = useForm<SuplenciaFormValues>({
    resolver: zodResolver(suplenciaFormSchema),
    defaultValues: valoresIniciales(suplencia, fechaSugerida),
  });
  const fecha = useWatch({ control: formulario.control, name: "fechaClase" });
  const idHorario = useWatch({ control: formulario.control, name: "idHorario" });
  const idProfesoraSuplente = useWatch({ control: formulario.control, name: "idProfesoraSuplente" });

  useEffect(() => {
    formulario.reset(valoresIniciales(suplencia, fechaSugerida));
  }, [formulario, suplencia, fechaSugerida]);

  const dia = fecha ? new Date(`${fecha}T12:00:00`).getDay() || 7 : 0;
  const horariosDisponibles = useMemo(() => {
    return horarios
      .filter((horario) => horario.dia_semana === dia)
      .sort((a, b) => {
        const compActividad = a.actividad.nombre.trim().localeCompare(b.actividad.nombre.trim(), "es", {
          sensitivity: "base",
        });
        if (compActividad !== 0) return compActividad;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
  }, [horarios, dia]);
  const horarioSeleccionado = horarios.find((horario) => String(horario.id_horario) === idHorario);
  const profesorasDisponibles = profesoras.filter((profesora) => String(profesora.id) !== String(horarioSeleccionado?.id_profesora));

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(CONTENIDO_MODAL, "max-w-lg md:max-w-xl")}>
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            {suplencia ? "Editar suplencia" : "Registrar suplencia"}
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Indicá la fecha, horario a cubrir y el/la profesor/a que estará a cargo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className={CUERPO_MODAL}>
          <Campo label="Fecha de la clase" error={formulario.formState.errors.fechaClase?.message}>
            <CampoFecha
              name="fechaClase"
              aria-label="Fecha de la clase"
              disabled={Boolean(suplencia)}
              value={formulario.watch("fechaClase") ?? ""}
              onChange={(v) => formulario.setValue("fechaClase", v, { shouldValidate: true })}
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
            />
          </Campo>

          <Campo label="Horario" error={formulario.formState.errors.idHorario?.message}>
            <SelectorDesplegable
              id="suplencia-horario"
              name="idHorario"
              aria-label="Horario"
              disabled={Boolean(suplencia)}
              conOpcionesNativas={false}
              placeholder={horariosDisponibles.length === 0 ? "No hay clases este día" : "Elegí actividad y horario"}
              valor={idHorario}
              opciones={horariosDisponibles.map((horario) => ({
                valor: String(horario.id_horario),
                texto: `${horario.actividad.nombre} · ${horario.hora_inicio.slice(11, 16)} hs · ${horario.profesora.usuario.nombre} ${horario.profesora.usuario.apellido}`,
              }))}
              onChange={(value) => formulario.setValue("idHorario", value, { shouldValidate: true })}
              variante="formulario"
            />
          </Campo>

          <Campo label="Profesor/a suplente" error={formulario.formState.errors.idProfesoraSuplente?.message}>
            <SelectorDesplegable
              id="suplencia-profesora"
              name="idProfesoraSuplente"
              aria-label="Profesor/a suplente"
              placeholder="Elegí un/a profesor/a"
              conOpcionesNativas={false}
              valor={idProfesoraSuplente}
              opciones={profesorasDisponibles.map((profesora) => ({
                valor: profesora.id,
                texto: `${profesora.nombre} ${profesora.apellido}`,
              }))}
              onChange={(value) => formulario.setValue("idProfesoraSuplente", value, { shouldValidate: true })}
              variante="formulario"
            />
          </Campo>

          <Campo label="Motivo" error={formulario.formState.errors.motivo?.message} obligatorio={false}>
            <Textarea
              {...formulario.register("motivo")}
              className="min-h-24 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
              placeholder="Opcional: motivo de la ausencia o cobertura"
            />
          </Campo>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          </div>

          <DialogFooter className={PIE_MODAL}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={guardando}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
            >
              {guardando ? "Guardando..." : "Guardar suplencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  error,
  obligatorio = true,
  children,
}: {
  label: string;
  error?: string;
  obligatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={CAMPO_MODAL}>
      <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
        {label} {obligatorio && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-semibold text-destructive mt-1">{error}</p>}
    </div>
  );
}
