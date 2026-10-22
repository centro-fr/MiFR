import { useEffect } from "react";
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
  const horariosDisponibles = horarios.filter((horario) => horario.dia_semana === dia);
  const horarioSeleccionado = horarios.find((horario) => String(horario.id_horario) === idHorario);
  const profesorasDisponibles = profesoras.filter((profesora) => String(profesora.id) !== String(horarioSeleccionado?.id_profesora));

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose bottomSheetOnMobile className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] p-5 sm:rounded-3xl sm:p-7">
        <DialogHeader className="flex flex-row items-center justify-between text-left">
          <DialogTitle className="text-xl font-black tracking-tight">{suplencia ? "Editar suplencia" : "Registrar suplencia"}</DialogTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar formulario"><X className="size-4" /></Button>
        </DialogHeader>
        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2">
          <Campo label="Fecha de la clase" error={formulario.formState.errors.fechaClase?.message}><Input type="date" disabled={Boolean(suplencia)} {...formulario.register("fechaClase")} className="h-11 rounded-xl" /></Campo>
          <Campo label="Horario" error={formulario.formState.errors.idHorario?.message}>
            <Select value={idHorario} onValueChange={(value) => formulario.setValue("idHorario", value, { shouldValidate: true })}>
              <SelectTrigger disabled={Boolean(suplencia)} className="h-11 rounded-xl"><SelectValue placeholder="Elegí actividad y horario" /></SelectTrigger>
              <SelectContent>{horariosDisponibles.map((horario) => <SelectItem key={horario.id_horario} value={String(horario.id_horario)}>{horario.actividad.nombre} · {horario.hora_inicio.slice(11, 16)} hs · {horario.profesora.usuario.nombre} {horario.profesora.usuario.apellido}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Profesora suplente" error={formulario.formState.errors.idProfesoraSuplente?.message}>
            <Select value={idProfesoraSuplente} onValueChange={(value) => formulario.setValue("idProfesoraSuplente", value, { shouldValidate: true })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Elegí una profesora" /></SelectTrigger>
              <SelectContent>{profesorasDisponibles.map((profesora) => <SelectItem key={profesora.id} value={profesora.id}>{profesora.nombre} {profesora.apellido}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Motivo" error={formulario.formState.errors.motivo?.message} obligatorio={false}><Textarea {...formulario.register("motivo")} className="min-h-24 rounded-xl" placeholder="Opcional" /></Campo>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={guardando} className="h-11 rounded-xl font-bold">Cancelar</Button>
            <Button type="submit" disabled={guardando} className="h-11 flex-1 rounded-xl bg-primary font-bold text-white hover:bg-primary-dark">{guardando ? "Guardando..." : "Guardar suplencia"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, error, obligatorio = true, children }: { label: string; error?: string; obligatorio?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm font-bold">{label} {obligatorio && <span className="text-destructive">*</span>}</Label>{children}{error && <p className="text-xs font-semibold text-destructive">{error}</p>}</div>;
}
