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
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";

interface Props {
  actividad: Actividad | null;
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: ActividadFormData) => void;
}

type ErroresCampo = Partial<Record<keyof ActividadFormData, string>>;

export function ModalFormActividad({ actividad, guardando, errorGuardado, onClose, onSave }: Props) {
  const [codigo, setCodigo] = useState(actividad?.codigo ?? "");
  const [nombre, setNombre] = useState(actividad?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [modalidad, setModalidad] = useState<ModalidadActividad>(actividad?.modalidad ?? "GRUPAL");
  const [cupo, setCupo] = useState(actividad?.cupoMaximo?.toString() ?? "");
  const [pidePesoTalla, setPidePesoTalla] = useState(actividad?.requiereMedidas ?? false);
  const [activa, setActiva] = useState(actividad?.activo ?? true);
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
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="w-full sm:max-w-[560px] rounded-3xl border border-border bg-white p-0 shadow-2xl dark:bg-surface-low overflow-hidden"
      >
        {/* Cabecera limpia con título y botón cerrar X */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {tituloModal}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar"
            className="size-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="size-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col text-sm">
          <div className="space-y-5 px-6 py-4 max-h-[calc(85vh-130px)] overflow-y-auto">
            {errorGuardado && (
              <Alert className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                <AlertDescription className="text-sm font-semibold text-rose-700 dark:text-rose-300">
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
              <Label htmlFor="actividad-nombre" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
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
                  "rounded-xl border px-3.5 py-2.5 font-medium text-foreground transition-all focus:ring-2",
                  errores.nombre
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                    : "border-slate-200 bg-white focus:border-primary focus:ring-pink-100 dark:border-white/15 dark:bg-white/5",
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
              <Label htmlFor="actividad-descripcion" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Descripción <span className="font-normal text-slate-500">(opcional)</span>
              </Label>
              <Input
                id="actividad-descripcion"
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={255}
                placeholder={actividad ? "" : "Lo que ven los alumnos en la web"}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-medium text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-pink-100 dark:border-white/15 dark:bg-white/5"
              />
            </div>

            {/* Modalidad * (Tarjetas horizontales) */}
            <div className="space-y-2">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Modalidad <span className="text-primary">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Grupal */}
                <label
                  htmlFor="modalidad-grupal"
                  onClick={() => setModalidad("GRUPAL")}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer",
                    modalidad === "GRUPAL"
                      ? "border-primary bg-pink-50/20 shadow-xs dark:bg-primary/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/15 dark:bg-transparent",
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
                      modalidad === "GRUPAL" ? "border-primary" : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {modalidad === "GRUPAL" && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Grupal</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                      Varios alumnos con la misma clase.
                    </span>
                  </div>
                </label>

                {/* Personalizada */}
                <label
                  htmlFor="modalidad-personalizada"
                  onClick={() => setModalidad("PERSONALIZADA")}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer",
                    modalidad === "PERSONALIZADA"
                      ? "border-primary bg-pink-50/20 shadow-xs dark:bg-primary/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/15 dark:bg-transparent",
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
                      modalidad === "PERSONALIZADA" ? "border-primary" : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {modalidad === "PERSONALIZADA" && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Personalizada</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                      Pocos alumnos, rutina para cada uno.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Cupo por clase * */}
            <div className="space-y-1.5">
              <Label htmlFor="actividad-cupo" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Cupo por clase <span className="text-primary">*</span>
              </Label>
              <Input
                id="actividad-cupo"
                aria-label="Cupo máximo"
                type="number"
                inputMode="numeric"
                min={1}
                max={modalidad === "PERSONALIZADA" ? CUPO_MAXIMO_PERSONALIZADA : CUPO_MAXIMO_GRUPAL}
                placeholder=""
                value={cupo}
                onChange={(e) => setCupo(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                className={cn(
                  "w-36 rounded-xl border px-3.5 py-2.5 font-medium transition-all focus:ring-2",
                  errores.cupoMaximo
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                    : "border-slate-200 bg-white focus:border-primary focus:ring-pink-100 dark:border-white/15 dark:bg-white/5",
                )}
              />
              <p className="text-xs text-muted-foreground">
                Cuántos alumnos entran a la vez con la profesora.
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
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  pidePesoTalla
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-transparent",
                )}
              >
                {pidePesoTalla && <Check className="size-3.5 stroke-[3]" />}
              </button>
              <div className="cursor-pointer select-none" onClick={() => setPidePesoTalla(!pidePesoTalla)}>
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  Pide peso y talla al inscribirse
                </span>
                <span className="block text-xs text-muted-foreground">
                  Para armar la rutina desde la primera clase.
                </span>
              </div>
            </div>

            {/* Switch Activa (solo en modo edición) */}
            {actividad && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="pr-4">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Activa</span>
                  <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">
                    Si la desactivás, no se puede elegir en nuevas inscripciones. Las clases ya dadas quedan guardadas.
                  </span>
                </div>
                <Switch
                  checked={activa}
                  onCheckedChange={setActiva}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Footer de botones */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-white/10 dark:bg-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              aria-label="Guardar actividad"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-extrabold text-white shadow-md shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
            >
              {guardando
                ? "Guardando…"
                : actividad
                  ? "Guardar cambios"
                  : "Crear actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
