import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { promocionFormSchema, type PromocionFormValues } from "@/features/promociones/schemas/promocion";
import type { Promocion } from "@/types/promocion";
import type { Plan } from "@/types/plan";

interface Props {
  abierto: boolean;
  promocion: Promocion | null;
  planes: Array<Pick<Plan, "id" | "nombre">>;
  guardando: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (datos: PromocionFormValues) => void;
}

function valoresIniciales(promocion: Promocion | null): PromocionFormValues {
  return promocion
    ? {
        codigo: promocion.codigo,
        nombre: promocion.nombre,
        tipoDescuento: promocion.tipoDescuento,
        valor: String(promocion.valor),
        fechaDesde: promocion.fechaDesde.slice(0, 10),
        fechaHasta: promocion.fechaHasta.slice(0, 10),
        idsPlanes: promocion.planes.map((plan) => plan.id),
      }
    : {
        codigo: "",
        nombre: "",
        tipoDescuento: "PORCENTAJE",
        valor: "",
        fechaDesde: new Date().toISOString().slice(0, 10),
        fechaHasta: "",
        idsPlanes: [],
      };
}

export function PromocionDialog({ abierto, promocion, planes, guardando, error, onClose, onSubmit }: Props) {
  const formulario = useForm<PromocionFormValues>({
    resolver: zodResolver(promocionFormSchema),
    defaultValues: valoresIniciales(promocion),
  });

  useEffect(() => {
    formulario.reset(valoresIniciales(promocion));
  }, [formulario, promocion]);

  const idsPlanes = useWatch({ control: formulario.control, name: "idsPlanes" });
  const tipo = useWatch({ control: formulario.control, name: "tipoDescuento" });

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {promocion ? "Editar promoción" : "Nueva promoción"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Definí el descuento, vigencia y planes aplicables de la promoción.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Campo label="Código" error={formulario.formState.errors.codigo?.message}>
            <Input {...formulario.register("codigo")} className="h-11 rounded-xl" placeholder="VERANO26" />
          </Campo>
          <Campo label="Nombre" error={formulario.formState.errors.nombre?.message}>
            <Input {...formulario.register("nombre")} className="h-11 rounded-xl" placeholder="Promoción de verano" />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Tipo de descuento" error={formulario.formState.errors.tipoDescuento?.message}>
              <Select value={tipo} onValueChange={(value) => formulario.setValue("tipoDescuento", value as PromocionFormValues["tipoDescuento"])}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
                  <SelectItem value="MONTO_FIJO">Monto fijo</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label={tipo === "PORCENTAJE" ? "Descuento (%)" : "Descuento ($)"} error={formulario.formState.errors.valor?.message}>
              <Input {...formulario.register("valor")} inputMode="decimal" className="h-11 rounded-xl" placeholder={tipo === "PORCENTAJE" ? "20" : "5000"} />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Desde" error={formulario.formState.errors.fechaDesde?.message}>
              <Input type="date" {...formulario.register("fechaDesde")} className="h-11 rounded-xl" />
            </Campo>
            <Campo label="Hasta" error={formulario.formState.errors.fechaHasta?.message}>
              <Input type="date" {...formulario.register("fechaHasta")} className="h-11 rounded-xl" />
            </Campo>
          </div>
          <Campo label="Planes asociados" error={formulario.formState.errors.idsPlanes?.message}>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2">
              {planes.map((plan) => {
                const seleccionado = idsPlanes.includes(plan.id);
                return (
                  <label key={plan.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={(event) =>
                        formulario.setValue(
                          "idsPlanes",
                          event.target.checked ? [...idsPlanes, plan.id] : idsPlanes.filter((id) => id !== plan.id),
                          { shouldValidate: true },
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    {plan.nombre}
                  </label>
                );
              })}
            </div>
          </Campo>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
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
              {guardando ? "Guardando..." : "Guardar promoción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold">{label} <span className="text-destructive">*</span></Label>
      {children}
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
