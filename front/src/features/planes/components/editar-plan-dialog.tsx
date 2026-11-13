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
import { Textarea } from "@/components/ui/textarea";
import {
  useActualizarPlan,
  usePlanes,
  useRegistrarPrecioPlan,
} from "@/features/planes/hooks/use-planes";
import {
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
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

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
  const { data: todosLosPlanes = [] } = usePlanes();
  const actualizar = useActualizarPlan();
  const registrarPrecio = useRegistrarPrecioPlan();

  const [valores, setValores] = useState<PlanFormValues>(() =>
    plan ? valoresDelPlan(plan) : ({} as PlanFormValues)
  );
  const [errores, setErrores] = useState<ErroresPlanForm>({});
  const [guardando, setGuardando] = useState(false);

  if (!plan) return null;

  const nuevoPrecioNum = precioDesdeTexto(valores.precio);
  const precioCambio =
    plan.precioVigente === null
      ? !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum > 0
      : !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum !== plan.precioVigente;
  const nombreCambio = valores.nombre.trim() !== plan.nombre;
  const descCambio = (valores.descripcion ?? "").trim() !== (plan.descripcion ?? "").trim();
  const sinCambios = !precioCambio && !nombreCambio && !descCambio;
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

    const cambios: { nombre?: string; descripcion?: string | null } = {};
    if (valoresAGuardar.nombre.trim() !== plan.nombre) {
      cambios.nombre = valoresAGuardar.nombre.trim();
    }
    const descActual = (plan.descripcion ?? "").trim();
    const descNueva = (valoresAGuardar.descripcion ?? "").trim();
    if (descNueva !== descActual) {
      cambios.descripcion = descNueva === "" ? null : descNueva;
    }
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

  return (
    <Dialog
        open={plan !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !estaCargando) onClose();
        }}
      >
        <DialogContent
          className={cn(CONTENIDO_MODAL, "max-w-lg")}
        >
          {/* Encabezado */}
          <DialogHeader className={CABECERA_MODAL}>
            <DialogTitle className={TITULO_MODAL}>
              Editar plan
            </DialogTitle>
            <DialogDescription className={DESCRIPCION_MODAL}>
              Modificá el nombre, precio o descripción del plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
            <div className={CUERPO_MODAL}>
              {/* Nombre */}
              <div className={CAMPO_MODAL}>
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
                    "h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                    errores.nombre && "border-rose-500"
                  )}
                />
                {errores.nombre && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.nombre}
                  </p>
                )}
              </div>

              {/* Precio */}
              <div className={CAMPO_MODAL}>
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
                      "h-10 rounded-xl pl-8 font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
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

              {/* Descripción (opcional) */}
              <div className={CAMPO_MODAL}>
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
            </div>

            {/* Footer de botones */}
            <DialogFooter className={PIE_MODAL}>
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
  );
}
