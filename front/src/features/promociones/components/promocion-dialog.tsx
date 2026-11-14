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
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { promocionFormSchema, type PromocionFormValues } from "@/features/promociones/schemas/promocion";
import type { Promocion } from "@/types/promocion";
import type { Plan } from "@/types/plan";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import { registroFiltrado, soloDecimal } from "@/utils/entrada-numerica";

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
  const esPermanente = Boolean(
    promocion && (promocion.fechaHasta.startsWith("2099") || promocion.fechaHasta >= "2099-01-01")
  );
  return promocion
    ? {
        nombre: promocion.nombre,
        tipoDescuento: promocion.tipoDescuento,
        valor: String(promocion.valor),
        fechaDesde: promocion.fechaDesde.slice(0, 10),
        fechaHasta: esPermanente ? "2099-12-31" : promocion.fechaHasta.slice(0, 10),
        permanente: esPermanente,
        idsPlanes: promocion.planes.map((plan) => plan.id),
      }
    : {
        nombre: "",
        tipoDescuento: "PORCENTAJE",
        valor: "",
        fechaDesde: new Date().toISOString().slice(0, 10),
        fechaHasta: "",
        permanente: false,
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

  const idsPlanes = useWatch({ control: formulario.control, name: "idsPlanes" }) ?? [];
  const tipo = useWatch({ control: formulario.control, name: "tipoDescuento" });
  const permanente = useWatch({ control: formulario.control, name: "permanente" }) ?? false;
  const fechaHastaValue = useWatch({ control: formulario.control, name: "fechaHasta" });

  const todosSeleccionados = planes.length > 0 && planes.every((p) => idsPlanes.includes(p.id));

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(CONTENIDO_MODAL, "max-w-lg")}
      >
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            {promocion ? "Editar promoción" : "Nueva promoción"}
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Definí el descuento, vigencia y planes aplicables de la promoción.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formulario.handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className={CUERPO_MODAL}>
            <Campo id="promocion-nombre" label="Nombre" error={formulario.formState.errors.nombre?.message}>
              <Input id="promocion-nombre" {...formulario.register("nombre")} className="h-10 rounded-xl" placeholder="Promoción de verano" />
            </Campo>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo id="promocion-tipo-descuento" label="Tipo de descuento" error={formulario.formState.errors.tipoDescuento?.message}>
                <SelectorDesplegable
                  id="promocion-tipo-descuento"
                  aria-label="Tipo de descuento"
                  valor={tipo}
                  opciones={[
                    { valor: "PORCENTAJE", texto: "Porcentaje" },
                    { valor: "MONTO_FIJO", texto: "Monto fijo" },
                  ]}
                  onChange={(value) =>
                    formulario.setValue("tipoDescuento", value as PromocionFormValues["tipoDescuento"], { shouldValidate: true })
                  }
                  variante="formulario"
                />
              </Campo>
              <Campo
                id="promocion-valor"
                label={tipo === "PORCENTAJE" ? "Descuento (%)" : "Descuento ($)"}
                error={formulario.formState.errors.valor?.message}
              >
                <Input
                  id="promocion-valor"
                  {...registroFiltrado(formulario.register("valor"), (valor) => soloDecimal(valor))}
                  inputMode="decimal"
                  className="h-10 rounded-xl"
                  placeholder={tipo === "PORCENTAJE" ? "20" : "5000"}
                />
              </Campo>
            </div>

            {/* Fechas de vigencia */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo id="promocion-desde" label="Desde" error={formulario.formState.errors.fechaDesde?.message}>
                <CampoFecha
                  id="promocion-desde"
                  value={formulario.watch("fechaDesde") ?? ""}
                  onChange={(v) => formulario.setValue("fechaDesde", v, { shouldValidate: true })}
                  className="h-10 rounded-xl"
                />
              </Campo>

              <div className={CAMPO_MODAL}>
                <Campo
                  id="promocion-hasta"
                  label="Hasta"
                  opcional={permanente}
                  error={!permanente ? formulario.formState.errors.fechaHasta?.message : undefined}
                >
                  <CampoFecha
                    id="promocion-hasta"
                    disabled={permanente}
                    value={permanente ? "" : (fechaHastaValue ?? "")}
                    onChange={(v) => {
                      formulario.setValue("fechaHasta", v, { shouldValidate: true });
                    }}
                    className={cn(
                      "h-10 rounded-xl",
                      permanente && "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50",
                    )}
                  />
                </Campo>
                <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={permanente}
                    onChange={(event) => {
                      const esPerm = event.target.checked;
                      formulario.setValue("permanente", esPerm, { shouldValidate: true });
                      formulario.setValue("fechaHasta", esPerm ? "2099-12-31" : "", {
                        shouldValidate: true,
                      });
                      if (esPerm) {
                        formulario.clearErrors("fechaHasta");
                      }
                    }}
                    className="size-4 accent-primary"
                  />
                  Descuento permanente
                </label>
              </div>
            </div>

            {/* Planes y actividades asociados con 'Todas las actividades' */}
            <Campo label="Planes asociados" error={formulario.formState.errors.idsPlanes?.message}>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2">
                <label className="sm:col-span-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={(event) =>
                      formulario.setValue(
                        "idsPlanes",
                        event.target.checked ? planes.map((p) => p.id) : [],
                        { shouldValidate: true }
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  Todas las actividades
                </label>
                {planes.map((plan) => {
                  const seleccionado = idsPlanes.includes(plan.id);
                  return (
                    <label
                      key={plan.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={(event) =>
                          formulario.setValue(
                            "idsPlanes",
                            event.target.checked ? [...idsPlanes, plan.id] : idsPlanes.filter((id) => id !== plan.id),
                            { shouldValidate: true }
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

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              >
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
              {guardando ? "Guardando..." : "Guardar promoción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  label,
  error,
  opcional,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={CAMPO_MODAL}>
      <Label htmlFor={id} className="text-sm font-bold">
        {label} {!opcional && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
