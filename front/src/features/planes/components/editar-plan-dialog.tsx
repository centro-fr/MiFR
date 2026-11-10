import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import { ModalBajaPlan } from "@/features/planes/components/modales-plan";
import {
  useActualizarPlan,
  useDarDeBajaPlan,
  usePlanes,
  useRegistrarPrecioPlan,
} from "@/features/planes/hooks/use-planes";
import {
  aCuerpoActualizacion,
  crearPlanFormSchema,
  erroresDe,
  precioDesdeTexto,
  valoresDelPlan,
  type ErroresPlanForm,
  type PlanFormValues,
} from "@/features/planes/schemas/plan";
import { nombreRepetido } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { cn } from "@/utils/cn";

interface PropsEditarPlanDialog {
  plan: Plan | null;
  onClose: () => void;
  onExito?: () => void;
}

function hoyEnArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

export function EditarPlanDialog({ plan, onClose, onExito }: PropsEditarPlanDialog) {
  const { data: actividades = [] } = useActividades();
  const { data: todosLosPlanes = [] } = usePlanes();
  const actualizar = useActualizarPlan();
  const registrarPrecio = useRegistrarPrecioPlan();
  const darDeBaja = useDarDeBajaPlan();

  const [valores, setValores] = useState<PlanFormValues>(() =>
    plan ? valoresDelPlan(plan) : ({} as PlanFormValues)
  );
  const [errores, setErrores] = useState<ErroresPlanForm>({});
  const [bajaAbierta, setBajaAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);

  if (!plan) return null;

  const esMensual = valores.tipo === "MENSUAL";
  const nuevoPrecioNum = precioDesdeTexto(valores.precio);
  const precioCambio =
    plan.precioVigente === null
      ? !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum > 0
      : !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum !== plan.precioVigente;
  const cambiosPlan = aCuerpoActualizacion(plan, valores);
  const hayCambiosPlan = Object.keys(cambiosPlan).length > 0;
  const sinCambios = !precioCambio && !hayCambiosPlan;
  const estaCargando = guardando || actualizar.isPending || registrarPrecio.isPending;

  const cambiar = (cambio: Partial<PlanFormValues>) => {
    setValores((prev) => ({ ...prev, ...cambio }));
    setErrores((prev) => ({
      ...prev,
      ...Object.fromEntries(Object.keys(cambio).map((c) => [c, undefined])),
    }));
  };

  const validar = (): boolean => {
    const resultado = crearPlanFormSchema({ editando: true }).safeParse(valores);
    const nuevos = resultado.success ? {} : erroresDe(resultado.error);
    if (!nuevos.nombre && nombreRepetido(todosLosPlanes, valores.nombre, plan.id)) {
      nuevos.nombre = "Ya existe un plan vigente con ese nombre.";
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async (valoresAGuardar: PlanFormValues) => {
    setGuardando(true);
    const nuevoPrecio = precioDesdeTexto(valoresAGuardar.precio);
    const cambioPrecio =
      plan.precioVigente === null
        ? !Number.isNaN(nuevoPrecio) && nuevoPrecio > 0
        : !Number.isNaN(nuevoPrecio) && nuevoPrecio !== plan.precioVigente;
    const cambios = aCuerpoActualizacion(plan, valoresAGuardar);
    const hayCambios = Object.keys(cambios).length > 0;

    try {
      if (hayCambios) {
        await actualizar.mutateAsync({ id: plan.id, cambios });
      }
      if (cambioPrecio) {
        await registrarPrecio.mutateAsync({
          id: plan.id,
          cuerpo: {
            precio: nuevoPrecio,
            fecha_vigencia_desde: hoyEnArgentina(),
          },
        });
      }
      toast.success(`Cambios guardados en "${valoresAGuardar.nombre}"`);
      onExito?.();
      onClose();
    } catch (err) {
      toast.error(mensajeDeErrorApi(err, "No se pudieron guardar los cambios."));
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    void guardar(valores);
  };

  const confirmarBaja = async () => {
    try {
      await darDeBaja.mutateAsync(plan.id);
      toast.info(`Plan "${plan.nombre}" dado de baja`);
      setBajaAbierta(false);
      onExito?.();
      onClose();
    } catch {
      // El error se muestra en el modal de baja
    }
  };

  return (
    <>
      <Dialog
        open={plan !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !estaCargando) onClose();
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Encabezado */}
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Editar plan {plan.nombre}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Modificá las características, actividades y reglas del plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-nombre" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan-nombre"
                  name="nombre"
                  value={valores.nombre}
                  maxLength={40}
                  required
                  onChange={(e) => cambiar({ nombre: e.target.value })}
                  placeholder="Nombre del plan"
                  className={cn(
                    "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                    errores.nombre && "border-rose-500"
                  )}
                />
                {errores.nombre && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.nombre}
                  </p>
                )}
              </div>

              {/* Modalidad de cobro */}
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Modalidad de cobro <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Abono mensual */}
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border transition-colors select-none",
                      esMensual
                        ? "border-2 border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 text-slate-900 dark:text-white font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-medium"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        esMensual ? "border-slate-900 dark:border-white" : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {esMensual && <div className="size-2 rounded-full bg-slate-900 dark:bg-white" />}
                    </div>
                    <div>
                      <span className="text-sm block">Abono mensual</span>
                      <span className="text-[11px] text-muted-foreground block font-normal">Cuota periódica mensual</span>
                    </div>
                  </div>

                  {/* Pase por clase individual */}
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border transition-colors select-none",
                      !esMensual
                        ? "border-2 border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 text-slate-900 dark:text-white font-bold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-medium"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        !esMensual ? "border-slate-900 dark:border-white" : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {!esMensual && <div className="size-2 rounded-full bg-slate-900 dark:bg-white" />}
                    </div>
                    <div>
                      <span className="text-sm block">Pase por clase individual</span>
                      <span className="text-[11px] text-muted-foreground block font-normal">Sin cuota fija mensual</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actividad y Precio en grid de 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Actividad */}
                <div className="space-y-1.5">
                  <Label htmlFor="plan-actividad" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Actividad
                  </Label>
                  <Select
                    value={valores.idActividad || "todas"}
                    onValueChange={(val) => cambiar({ idActividad: val === "todas" ? "" : val })}
                  >
                    <SelectTrigger
                      id="plan-actividad"
                      aria-label="Actividad"
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    >
                      <SelectValue placeholder="Cualquier actividad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Cualquier actividad</SelectItem>
                      {actividades.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Precio */}
                <div className="space-y-1.5">
                  <Label htmlFor="plan-precio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Precio <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">
                      $
                    </span>
                    <Input
                      id="plan-precio"
                      name="precio"
                      value={valores.precio}
                      onChange={(e) => cambiar({ precio: e.target.value })}
                      placeholder="35000"
                      className={cn(
                        "h-11 rounded-xl pl-8 font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                        errores.precio && "border-rose-500"
                      )}
                    />
                  </div>
                  {errores.precio && (
                    <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {errores.precio}
                    </p>
                  )}
                </div>
              </div>

              {/* Descripción (opcional) */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-descripcion" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="plan-descripcion"
                  name="descripcion"
                  rows={3}
                  value={valores.descripcion}
                  maxLength={255}
                  onChange={(e) => cambiar({ descripcion: e.target.value })}
                  placeholder="Para chicos de 6 a 12 años"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Botón Dar de baja el plan */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBajaAbierta(true)}
                  className="rounded-xl border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-xs sm:text-sm h-10 px-4"
                >
                  Dar de baja el plan
                </Button>
              </div>
            </div>

            {/* Footer de botones */}
            <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={estaCargando}
                className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={estaCargando || sinCambios}
                className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
              >
                {estaCargando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmación de baja */}
      {bajaAbierta && (
        <ModalBajaPlan
          nombre={plan.nombre}
          dandoDeBaja={darDeBaja.isPending}
          error={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja el plan.") : null}
          onClose={() => setBajaAbierta(false)}
          onConfirm={() => void confirmarBaja()}
        />
      )}
    </>
  );
}
