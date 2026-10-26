import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { suplenciaFormSchema, type SuplenciaFormValues } from "@/features/suplencias/schemas/suplencia";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { Suplencia } from "@/types/suplencia";

interface Props {
  abierto: boolean;
  suplencia: Suplencia | null;
  horarios: HorarioApi[];
  profesoras: ProfesoraDatos[];
  guardando: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (datos: SuplenciaFormValues) => void;
}

function valoresIniciales(suplencia: Suplencia | null): SuplenciaFormValues {
  return suplencia
    ? { fechaClase: suplencia.fechaClase.slice(0, 10), idHorario: suplencia.idHorario, idProfesoraSuplente: suplencia.suplente.id, motivo: suplencia.motivo ?? "" }
    : { fechaClase: new Date().toISOString().slice(0, 10), idHorario: "", idProfesoraSuplente: "", motivo: "" };
}

export function SuplenciaDialog({ abierto, suplencia, horarios, profesoras, guardando, error, onClose, onSubmit }: Props) {
  const formulario = useForm<SuplenciaFormValues>({
    resolver: zodResolver(suplenciaFormSchema),
    defaultValues: valoresIniciales(suplencia),
  });
  const fecha = useWatch({ control: formulario.control, name: "fechaClase" });
  const idHorario = useWatch({ control: formulario.control, name: "idHorario" });
  const idProfesoraSuplente = useWatch({ control: formulario.control, name: "idProfesoraSuplente" });

  useEffect(() => {
    formulario.reset(valoresIniciales(suplencia));
  }, [formulario, suplencia]);

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
      <DialogContent hideClose className="w-[96vw] sm:w-full max-w-lg md:max-w-xl rounded-3xl p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh] border-slate-200 dark:border-slate-800">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {suplencia ? "Editar suplencia" : "Registrar suplencia"}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
          <Campo label="Fecha de la clase" error={formulario.formState.errors.fechaClase?.message}>
            <Input
              type="date"
              disabled={Boolean(suplencia)}
              {...formulario.register("fechaClase")}
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

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={guardando}
              className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando ? "Guardando..." : "Guardar suplencia"}
            </Button>
          </div>
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
