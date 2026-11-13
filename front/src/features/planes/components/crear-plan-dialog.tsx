import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { Textarea } from "@/components/ui/textarea";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import { useCrearPlan, usePlanes } from "@/features/planes/hooks/use-planes";
import {
  aCuerpoCreacion,
  crearPlanFormSchema,
  erroresDe,
  LARGO_MAXIMO_DESCRIPCION,
  LARGO_MAXIMO_NOMBRE,
  MAXIMO_DIAS_GRACIA,
  type ErroresPlanForm,
  type FrecuenciaElegida,
  type PlanFormValues,
} from "@/features/planes/schemas/plan";
import { estaVigente } from "@/features/planes/utils/planes";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, FILA_DE_CAMPOS_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface PropsCrearPlanDialog {
  abierto: boolean;
  onClose: () => void;
  onExito?: () => void;
}

const OPCIONES_FRECUENCIA: { valor: FrecuenciaElegida; label: string }[] = [
  { valor: "1", label: "1 clase por semana" },
  { valor: "2", label: "2 clases por semana" },
  { valor: "3", label: "3 clases por semana" },
  { valor: "4", label: "4 clases por semana" },
  { valor: "5", label: "5 clases por semana" },
  { valor: "6", label: "6 clases por semana" },
  { valor: "7", label: "7 clases por semana" },
  { valor: "LIBRE", label: "Clases libres, sin tope" },
];

export function CrearPlanDialog({ abierto, onClose, onExito }: PropsCrearPlanDialog) {
  const { data: actividades = [] } = useActividades();
  const { data: planes = [] } = usePlanes();
  const crear = useCrearPlan();

  const [valores, setValores] = useState<PlanFormValues>({
    nombre: "",
    descripcion: "",
    tipo: "MENSUAL",
    precio: "",
    idActividad: "",
    profesoraUnica: true,
    frecuencia: "2",
    diasGracia: "5",
  });

  const [errores, setErrores] = useState<ErroresPlanForm>({});

  const cambiar = (cambios: Partial<PlanFormValues>) => {
    setValores((prev) => ({ ...prev, ...cambios }));
    setErrores((prev) => {
      const limpio = { ...prev };
      for (const campo of Object.keys(cambios) as (keyof PlanFormValues)[]) {
        delete limpio[campo];
      }
      return limpio;
    });
  };

  const esMensual = valores.tipo === "MENSUAL";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // 1. Validar nombre repetido contra planes vigentes
    const nombreNormalizado = valores.nombre.trim().toLowerCase();
    const repetido = planes.some(
      (p) => estaVigente(p) && p.nombre.trim().toLowerCase() === nombreNormalizado
    );
    if (repetido) {
      setErrores((prev) => ({
        ...prev,
        nombre: `Ya existe un plan vigente llamado "${valores.nombre.trim()}".`,
      }));
      return;
    }

    // 2. Validación de esquema
    const schema = crearPlanFormSchema({ editando: false });
    const resultado = schema.safeParse(valores);

    if (!resultado.success) {
      setErrores(erroresDe(resultado.error));
      return;
    }

    // 3. Mutación de creación
    crear.mutate(aCuerpoCreacion(valores), {
      onSuccess: (nuevoPlan) => {
        toast.success(`Plan "${nuevoPlan.nombre}" creado exitosamente`);
        onClose();
        onExito?.();
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo crear el plan."));
      },
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(CONTENIDO_MODAL, "max-w-lg md:max-w-xl")}
      >
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            Nuevo plan
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Configurá las condiciones del plan y su precio inicial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className={CUERPO_MODAL}>
          {/* Nombre */}
          <div className={CAMPO_MODAL}>
            <Label htmlFor="nuevo-plan-nombre" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nuevo-plan-nombre"
              autoFocus
              value={valores.nombre}
              maxLength={LARGO_MAXIMO_NOMBRE}
              onChange={(e) => cambiar({ nombre: e.target.value })}
              placeholder="Ej: Básico, Intermedio, Particular, Premium"
              className={cn(
                "h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                errores.nombre && "border-rose-500 focus-visible:ring-rose-500"
              )}
            />
            {errores.nombre && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Modalidad de cobro (Abono mensual / Pase por clase individual) */}
          <div className={CAMPO_MODAL}>
            <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Modalidad de cobro <span className="text-destructive">*</span>
            </Label>
            <div className={FILA_DE_CAMPOS_MODAL}>
              {/* Abono mensual */}
              <button
                type="button"
                onClick={() => cambiar({ tipo: "MENSUAL" })}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors select-none cursor-pointer",
                  esMensual
                    ? "border-slate-900 bg-slate-50 font-semibold text-slate-900 dark:border-white/80 dark:bg-slate-800 dark:text-white"
                    : "border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    esMensual ? "border-primary" : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {esMensual && <div className="size-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm">Abono mensual</span>
              </button>

              {/* Pase por clase individual */}
              <button
                type="button"
                onClick={() => cambiar({ tipo: "CLASE_SUELTA" })}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors select-none cursor-pointer",
                  !esMensual
                    ? "border-slate-900 bg-slate-50 font-semibold text-slate-900 dark:border-white/80 dark:bg-slate-800 dark:text-white"
                    : "border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    !esMensual ? "border-primary" : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {!esMensual && <div className="size-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm">Pase por clase individual</span>
              </button>
            </div>
          </div>

          {/* Frecuencia y Días de gracia (si es mensual) */}
          {esMensual && (
            <div className={FILA_DE_CAMPOS_MODAL}>
              {/* Clases por semana */}
              <div className={CAMPO_MODAL}>
                <Label htmlFor="nuevo-plan-frecuencia" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clases por semana <span className="text-destructive">*</span>
                </Label>
                <SelectorDesplegable
                  id="nuevo-plan-frecuencia"
                  aria-label="Clases por semana *"
                  valor={valores.frecuencia}
                  opciones={OPCIONES_FRECUENCIA.map((opcion) => ({
                    valor: opcion.valor,
                    texto: opcion.label,
                  }))}
                  onChange={(val) => cambiar({ frecuencia: val as FrecuenciaElegida })}
                  variante="formulario"
                />
                {errores.frecuencia && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.frecuencia}
                  </p>
                )}
              </div>

              {/* Días de gracia */}
              <div className={CAMPO_MODAL}>
                <Label htmlFor="nuevo-plan-gracia" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Días de gracia <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nuevo-plan-gracia"
                  type="number"
                  min={0}
                  max={MAXIMO_DIAS_GRACIA}
                  value={valores.diasGracia}
                  onChange={(e) => cambiar({ diasGracia: e.target.value })}
                  className={cn(
                    "h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                    errores.diasGracia && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                />
                {errores.diasGracia && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.diasGracia}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actividad y Precio en grid de 2 columnas */}
          <div className={FILA_DE_CAMPOS_MODAL}>
            {/* Actividad */}
            <div className={CAMPO_MODAL}>
              <Label htmlFor="nuevo-plan-actividad" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Actividad
              </Label>
              <SelectorDesplegable
                id="nuevo-plan-actividad"
                aria-label="Actividad"
                valor={valores.idActividad}
                todos="Cualquier actividad"
                opciones={actividades.filter((a) => a.activo).map((act) => ({
                  valor: act.id,
                  texto: act.nombre,
                }))}
                onChange={(val) => cambiar({ idActividad: val })}
                variante="formulario"
              />
            </div>

            {/* Precio inicial */}
            <div className={CAMPO_MODAL}>
              <Label htmlFor="nuevo-plan-precio" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Precio inicial <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">
                  $
                </span>
                <Input
                  id="nuevo-plan-precio"
                  value={valores.precio}
                  onChange={(e) => cambiar({ precio: e.target.value })}
                  placeholder="35000"
                  className={cn(
                    "h-10 rounded-xl pl-8 font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                    errores.precio && "border-rose-500 focus-visible:ring-rose-500"
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
          <div className={CAMPO_MODAL}>
            <div className="flex items-center justify-between">
              <Label htmlFor="nuevo-plan-descripcion" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {valores.descripcion.length}/{LARGO_MAXIMO_DESCRIPCION}
              </span>
            </div>
            <Textarea
              id="nuevo-plan-descripcion"
              value={valores.descripcion}
              maxLength={LARGO_MAXIMO_DESCRIPCION}
              onChange={(e) => cambiar({ descripcion: e.target.value })}
              placeholder="Detalles sobre lo que incluye, niveles recomendados, etc."
              rows={2}
              className={cn(
                "rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 resize-none",
                errores.descripcion && "border-rose-500 focus-visible:ring-rose-500"
              )}
            />
            {errores.descripcion && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errores.descripcion}
              </p>
            )}
          </div>

          </div>

          <DialogFooter className={PIE_MODAL}>
            <Button
              type="button"
              variant="outline"
              disabled={crear.isPending}
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={crear.isPending}
              className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
            >
              {crear.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creando plan…
                </>
              ) : (
                "Crear plan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
