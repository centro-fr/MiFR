import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const actividadesGrupales = actividades.filter((a) => a.modalidad === "GRUPAL" && a.activo);
  const actividadesPersonalizadas = actividades.filter((a) => a.modalidad === "PERSONALIZADA" && a.activo);

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
        hideClose
        className="w-[96vw] sm:w-full max-w-lg md:max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-3 text-left">
          <div className="space-y-0.5">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Nuevo plan
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Configurá las condiciones del plan y su precio inicial.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Cerrar formulario"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-plan-nombre" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nuevo-plan-nombre"
              autoFocus
              value={valores.nombre}
              maxLength={LARGO_MAXIMO_NOMBRE}
              onChange={(e) => cambiar({ nombre: e.target.value })}
              placeholder="Ej: Pase Libre, Funcional 3 días, Pilates Dupla"
              className={cn(
                "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                errores.nombre && "border-rose-500 focus-visible:ring-rose-500"
              )}
            />
            {errores.nombre && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Tipo de plan (Mensual / Suelta) */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Tipo de plan <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Mensual */}
              <button
                type="button"
                onClick={() => cambiar({ tipo: "MENSUAL" })}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-2xl border transition-colors select-none text-left cursor-pointer",
                  esMensual
                    ? "border-2 border-primary bg-pink-50/40 dark:bg-primary/10 text-slate-900 dark:text-white font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-medium hover:bg-slate-100/60"
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
                <span className="text-sm">Mensual</span>
              </button>

              {/* Suelta */}
              <button
                type="button"
                onClick={() => cambiar({ tipo: "CLASE_SUELTA" })}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-2xl border transition-colors select-none text-left cursor-pointer",
                  !esMensual
                    ? "border-2 border-primary bg-pink-50/40 dark:bg-primary/10 text-slate-900 dark:text-white font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-medium hover:bg-slate-100/60"
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
                <span className="text-sm">Clase suelta</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground pt-0.5">
              {esMensual
                ? "Abono recurrente con cuota periódica y frecuencia semanal."
                : "Se abona por cada clase individual asistida."}
            </p>
          </div>

          {/* Frecuencia y Días de gracia (si es mensual) */}
          {esMensual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Clases por semana */}
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-plan-frecuencia" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clases por semana <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={valores.frecuencia}
                  onValueChange={(val) => cambiar({ frecuencia: val as FrecuenciaElegida })}
                >
                  <SelectTrigger
                    id="nuevo-plan-frecuencia"
                    aria-label="Clases por semana *"
                    className={cn(
                      "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                      errores.frecuencia && "border-rose-500"
                    )}
                  >
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_FRECUENCIA.map((opcion) => (
                      <SelectItem key={opcion.valor} value={opcion.valor}>
                        {opcion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errores.frecuencia && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.frecuencia}
                  </p>
                )}
              </div>

              {/* Días de gracia */}
              <div className="space-y-1.5">
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
                    "h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold",
                    errores.diasGracia && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                />
                <p className="text-xs text-muted-foreground">Tolerancia para abonar la cuota.</p>
                {errores.diasGracia && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {errores.diasGracia}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actividad y Precio en grid de 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Actividad */}
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-plan-actividad" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Actividad
              </Label>
              <Select
                value={valores.idActividad}
                onValueChange={(val) => cambiar({ idActividad: val === "TODAS" ? "" : val })}
              >
                <SelectTrigger
                  id="nuevo-plan-actividad"
                  aria-label="Actividad"
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                >
                  <SelectValue placeholder="Cualquier actividad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Cualquier actividad</SelectItem>
                  {actividadesGrupales.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-primary">Grupales</SelectLabel>
                      {actividadesGrupales.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {actividadesPersonalizadas.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-primary">Personalizadas</SelectLabel>
                      {actividadesPersonalizadas.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground pt-0.5">
                {valores.idActividad ? "Abono exclusivo para la disciplina seleccionada." : "El alumno puede cursar cualquier disciplina."}
              </p>
            </div>

            {/* Precio inicial */}
            <div className="space-y-1.5">
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
                    "h-11 rounded-xl pl-8 font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                    errores.precio && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {esMensual ? "Valor de la cuota mensual." : "Valor por cada clase."}
              </p>
              {errores.precio && (
                <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errores.precio}
                </p>
              )}
            </div>
          </div>

          {/* Descripción (opcional) */}
          <div className="space-y-1.5">
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

          {/* Acciones del pie */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={crear.isPending}
              onClick={onClose}
              className="rounded-xl min-h-[44px] px-4 font-bold border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={crear.isPending}
              className="rounded-xl min-h-[44px] px-5 font-black bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/25 transition-transform active:scale-95"
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
