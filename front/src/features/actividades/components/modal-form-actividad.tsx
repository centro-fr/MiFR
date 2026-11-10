import { useRef, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import {
  actividadFormSchema,
  CUPO_MAXIMO_GRUPAL,
  CUPO_MAXIMO_PERSONALIZADA,
  type ActividadFormData,
} from "@/features/actividades/schemas/actividad";
import type { Actividad, ModalidadActividad } from "@/types/actividad";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

interface Props {
  actividad: Actividad | null;
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: ActividadFormData) => void;
  onDarDeBaja?: () => void;
}

type ErroresCampo = Partial<Record<keyof ActividadFormData, string>>;

export function ModalFormActividad({
  actividad,
  guardando,
  errorGuardado,
  onClose,
  onSave,
  onDarDeBaja,
}: Props) {
  const [codigo, setCodigo] = useState(actividad?.codigo ?? "");
  const [nombre, setNombre] = useState(actividad?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [modalidad, setModalidad] = useState<ModalidadActividad>(actividad?.modalidad ?? "GRUPAL");
  const [cupo, setCupo] = useState(actividad?.cupoMaximo?.toString() ?? "");
  const [pidePesoTalla, setPidePesoTalla] = useState(actividad?.requiereMedidas ?? false);
  const activa = actividad?.activo ?? true;
  const [errores, setErrores] = useState<ErroresCampo>({});

  const nombreRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const resultado = actividadFormSchema.safeParse({
      codigo: codigo.trim() || undefined,
      nombre,
      descripcion,
      modalidad,
      cupoMaximo: cupo.trim() === "" ? null : Number(cupo),
      requiereMedidas: pidePesoTalla,
      activo: activa,
    });

    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors;
      setErrores(Object.fromEntries(Object.entries(porCampo).map(([campo, mensajes]) => [campo, mensajes?.[0]])));
      return;
    }
    setErrores({});
    onSave(resultado.data);
  };

  const tituloModal = actividad ? `Editar ${actividad.nombre}` : "Nueva actividad";

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !guardando) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="flex max-h-[90dvh] w-[96vw] sm:w-full max-w-lg md:max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Cabecera modal con línea separadora */}
        <DialogHeader className="shrink-0 flex flex-row items-start justify-between border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-white/5">
          <div className="space-y-0.5 pr-4">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {tituloModal}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {actividad
                ? "Modificá la modalidad, cupos o características de la disciplina."
                : "Definí una nueva disciplina para el centro y su esquema de cupos."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar formulario"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          {errorGuardado && (
            <Alert className="rounded-xl border-rose-300 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
              <AlertDescription className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                {errorGuardado}
              </AlertDescription>
            </Alert>
          )}

          {/* Campo código accesible para tests y backend */}
          <div className="sr-only">
            <Label htmlFor="actividad-codigo">Código</Label>
            <Input
              id="actividad-codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="actividad-nombre" className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Nombre <span className="text-primary">*</span>
            </Label>
            <Input
              id="actividad-nombre"
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              placeholder={actividad ? "" : "Ej: Funcional"}
              className={cn(
                "h-11 rounded-xl border px-3.5 py-2 font-bold text-slate-900 dark:text-slate-100 transition-colors focus:border-primary",
                errores.nombre
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
              )}
            />
            {errores.nombre && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Descripción (opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="actividad-descripcion" className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Descripción <span className="font-normal text-slate-500">(opcional)</span>
            </Label>
            <Input
              id="actividad-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={255}
              placeholder={actividad ? "" : "Lo que ven los alumnos en la web"}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors focus:border-primary"
            />
          </div>

          {/* Modalidad * (Tarjetas limpias con selección neutra) */}
          <div className="space-y-1.5">
            <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Modalidad <span className="text-primary">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Grupal */}
              <label
                htmlFor="modalidad-grupal"
                onClick={() => setModalidad("GRUPAL")}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer select-none",
                  modalidad === "GRUPAL"
                    ? "border-slate-900 bg-slate-50 shadow-xs dark:border-white dark:bg-white/10 text-slate-900 dark:text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60",
                )}
              >
                <input
                  id="modalidad-grupal"
                  name="modalidad"
                  type="radio"
                  checked={modalidad === "GRUPAL"}
                  onChange={() => setModalidad("GRUPAL")}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    modalidad === "GRUPAL"
                      ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white text-white"
                      : "border-slate-300 dark:border-slate-600",
                  )}
                >
                  {modalidad === "GRUPAL" && <span className="size-1.5 rounded-full bg-white dark:bg-slate-900" />}
                </span>
                <div>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Grupal</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 leading-snug font-medium">
                    Varios alumnos en la misma clase.
                  </span>
                </div>
              </label>

              {/* Personalizada */}
              <label
                htmlFor="modalidad-personalizada"
                onClick={() => setModalidad("PERSONALIZADA")}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer select-none",
                  modalidad === "PERSONALIZADA"
                    ? "border-slate-900 bg-slate-50 shadow-xs dark:border-white dark:bg-white/10 text-slate-900 dark:text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60",
                )}
              >
                <input
                  id="modalidad-personalizada"
                  name="modalidad"
                  type="radio"
                  checked={modalidad === "PERSONALIZADA"}
                  onChange={() => setModalidad("PERSONALIZADA")}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    modalidad === "PERSONALIZADA"
                      ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white text-white"
                      : "border-slate-300 dark:border-slate-600",
                  )}
                >
                  {modalidad === "PERSONALIZADA" && <span className="size-1.5 rounded-full bg-white dark:bg-slate-900" />}
                </span>
                <div>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Personalizada</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 leading-snug font-medium">
                    Pocos alumnos, rutina para cada uno.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Cupo por clase * */}
          <div className="space-y-1.5">
            <Label htmlFor="actividad-cupo" className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Cupo por clase {modalidad === "PERSONALIZADA" && <span className="text-primary">*</span>}
            </Label>
            <Input
              id="actividad-cupo"
              aria-label="Cupo máximo"
              type="number"
              inputMode="numeric"
              min={1}
              max={modalidad === "PERSONALIZADA" ? CUPO_MAXIMO_PERSONALIZADA : CUPO_MAXIMO_GRUPAL}
              placeholder={modalidad === "GRUPAL" ? "Sin límite" : "Requerido"}
              value={cupo}
              onChange={(e) => setCupo(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              className={cn(
                "h-11 w-36 rounded-xl border px-3.5 py-2 font-bold text-slate-900 dark:text-slate-100 transition-colors focus:border-primary",
                errores.cupoMaximo
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
              )}
            />
            <p className="text-xs text-muted-foreground font-medium">
              {modalidad === "GRUPAL"
                ? "Opcional en grupales: cuántos alumnos entran a la vez con el/la profesor/a."
                : "Obligatorio en personalizadas: máximo de alumnos por rutina."}
            </p>
            {errores.cupoMaximo && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {errores.cupoMaximo}
              </p>
            )}
          </div>

          {/* Checkbox Pide peso y talla */}
          <div className="flex items-start gap-3 pt-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={pidePesoTalla}
              onClick={() => setPidePesoTalla(!pidePesoTalla)}
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                pidePesoTalla
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
              )}
            >
              {pidePesoTalla && <Check className="size-3.5 stroke-[3]" />}
            </button>
            <div className="cursor-pointer select-none" onClick={() => setPidePesoTalla(!pidePesoTalla)}>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                Pide peso y talla al inscribirse
              </span>
              <span className="block text-xs text-muted-foreground font-medium">
                Para armar la rutina desde la primera clase.
              </span>
            </div>
          </div>

          {/* Acción opcional de dar de baja la actividad */}
          {actividad && onDarDeBaja && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onDarDeBaja}
                className="rounded-xl border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-xs sm:text-sm h-10 px-4"
              >
                Dar de baja la actividad
              </Button>
            </div>
          )}

          {/* Footer estándar de botones */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={guardando}
              className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              aria-label="Guardar actividad"
              className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando
                ? "Guardando…"
                : actividad
                  ? "Guardar cambios"
                  : "Crear actividad"}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
