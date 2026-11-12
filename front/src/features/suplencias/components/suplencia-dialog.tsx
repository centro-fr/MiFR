import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { suplenciaFormSchema, type SuplenciaFormValues } from "@/features/suplencias/schemas/suplencia";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { Suplencia } from "@/types/suplencia";
import { fechaActualArgentina } from "@/utils/fecha";

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
      <DialogContent className="flex max-h-[90dvh] max-w-lg md:max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {suplencia ? "Editar suplencia" : "Registrar suplencia"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Indicá la fecha, horario a cubrir y el/la profesor/a que estará a cargo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
            <Select
              value={idHorario}
              onValueChange={(value) => formulario.setValue("idHorario", value, { shouldValidate: true })}
            >
              <SelectTrigger
                disabled={Boolean(suplencia)}
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
              >
                <SelectValue placeholder={horariosDisponibles.length === 0 ? "No hay clases este día" : "Elegí actividad y horario"} />
              </SelectTrigger>
              <SelectContent>
                {horariosDisponibles.length === 0 ? (
                  <SelectItem disabled value="_sin_clases">
                    No hay clases registradas en este día de la semana
                  </SelectItem>
                ) : (
                  horariosDisponibles.map((horario) => (
                    <SelectItem key={horario.id_horario} value={String(horario.id_horario)}>
                      {horario.actividad.nombre} · {horario.hora_inicio.slice(11, 16)} hs · {horario.profesora.usuario.nombre} {horario.profesora.usuario.apellido}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Campo>

          <Campo label="Profesor/a suplente" error={formulario.formState.errors.idProfesoraSuplente?.message}>
            <Select
              value={idProfesoraSuplente}
              onValueChange={(value) => formulario.setValue("idProfesoraSuplente", value, { shouldValidate: true })}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold">
                <SelectValue placeholder="Elegí un/a profesor/a" />
              </SelectTrigger>
              <SelectContent>
                {profesorasDisponibles.map((profesora) => (
                  <SelectItem key={profesora.id} value={profesora.id}>
                    {profesora.nombre} {profesora.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
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
    <div className="space-y-1.5">
      <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
        {label} {obligatorio && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-semibold text-destructive mt-1">{error}</p>}
    </div>
  );
}
