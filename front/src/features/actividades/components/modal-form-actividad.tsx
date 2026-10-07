import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { actividadFormSchema, type ActividadFormData } from "@/features/actividades/schemas/actividad";
import type { Actividad, ModalidadActividad } from "@/types/actividad";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";

interface Props {
  actividad: Actividad | null;
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: ActividadFormData) => void;
}

type ErroresCampo = Partial<Record<keyof ActividadFormData, string>>;

const MODALIDADES: { valor: ModalidadActividad; titulo: string; detalle: string; icono: string }[] = [
  { valor: "GRUPAL", titulo: "Grupal", detalle: "Cupo opcional: vacío es sin límite.", icono: "👥" },
  { valor: "PERSONALIZADA", titulo: "Personalizada", detalle: "Cupo máximo obligatorio.", icono: "👤" },
];

const CLASE_INPUT =
  "rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 font-semibold text-slate-800 focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 focus:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10";

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="block text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {etiqueta}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function ModalFormActividad({ actividad, guardando, errorGuardado, onClose, onSave }: Props) {
  // El padre pasa key={actividad?.id ?? "nueva"}: cada apertura monta el formulario con valores frescos.
  const [codigo, setCodigo] = useState(actividad?.codigo ?? "");
  const [nombre, setNombre] = useState(actividad?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [modalidad, setModalidad] = useState<ModalidadActividad>(actividad?.modalidad ?? "GRUPAL");
  const [cupo, setCupo] = useState(actividad?.cupoMaximo?.toString() ?? "");
  const [errores, setErrores] = useState<ErroresCampo>({});

  // Foco inicial: código al crear, nombre al editar (reemplaza data-autofocus).
  const codigoRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const resultado = actividadFormSchema.safeParse({
      codigo,
      nombre,
      descripcion,
      modalidad,
      cupoMaximo: cupo.trim() === "" ? null : Number(cupo),
    });
    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors;
      setErrores(Object.fromEntries(Object.entries(porCampo).map(([campo, mensajes]) => [campo, mensajes?.[0]])));
      return;
    }
    setErrores({});
    onSave(resultado.data);
  };

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        hideClose
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          (actividad === null ? codigoRef : nombreRef).current?.focus();
        }}
        className="my-auto flex max-h-[90dvh] w-full max-w-[640px] flex-col gap-0 overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-surface-low"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6 dark:border-white/10 dark:from-white/5 dark:to-surface-low">
          <div>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
              {actividad ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Datos, modalidad y cupo de la disciplina.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-11 w-11 shrink-0 rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white [&_svg]:size-5"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col text-sm">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {errorGuardado && (
              <Alert className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                <AlertDescription className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {errorGuardado}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Campo
                id="actividad-codigo"
                etiqueta={<>Código <span className="text-[#E91E82]">*</span></>}
                error={errores.codigo}
              >
                <Input
                  id="actividad-codigo"
                  ref={codigoRef}
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  disabled={actividad !== null}
                  maxLength={20}
                  placeholder="Ej: FUNCIONAL"
                  aria-invalid={Boolean(errores.codigo)}
                  aria-describedby={errores.codigo ? "actividad-codigo-error" : undefined}
                  className={CLASE_INPUT}
                />
              </Campo>

              <Campo
                id="actividad-nombre"
                etiqueta={<>Nombre <span className="text-[#E91E82]">*</span></>}
                error={errores.nombre}
              >
                <Input
                  id="actividad-nombre"
                  ref={nombreRef}
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={60}
                  placeholder="Ej: Funcional Grupal"
                  aria-invalid={Boolean(errores.nombre)}
                  aria-describedby={errores.nombre ? "actividad-nombre-error" : undefined}
                  className={CLASE_INPUT}
                />
              </Campo>
            </div>

            <Campo
              id="actividad-descripcion"
              etiqueta={<>Descripción <span className="font-normal lowercase text-slate-400">(opcional)</span></>}
              error={errores.descripcion}
            >
              <Textarea
                id="actividad-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={255}
                className={cn(CLASE_INPUT, "resize-none font-normal leading-relaxed")}
              />
            </Campo>

            <fieldset className="space-y-2">
              <legend className="block text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Modalidad <span className="text-[#E91E82]">*</span>
              </legend>
              <RadioGroup
                value={modalidad}
                onValueChange={(valor) => setModalidad(valor as ModalidadActividad)}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {MODALIDADES.map(({ valor, titulo, detalle, icono }) => (
                  <Label
                    key={valor}
                    htmlFor={`modalidad-${valor}`}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all",
                      modalidad === valor
                        ? "border-[#E91E82] bg-pink-50/60 shadow-sm dark:bg-pink-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/15 dark:bg-transparent",
                    )}
                  >
                    <RadioGroupItem value={valor} id={`modalidad-${valor}`} className="mt-1" />
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        <span aria-hidden="true">{icono}</span> {titulo}
                      </span>
                      <span className="mt-0.5 block text-sm leading-tight text-slate-600 dark:text-slate-400">{detalle}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <Campo
              id="actividad-cupo"
              etiqueta={
                modalidad === "PERSONALIZADA" ? (
                  <>Cupo máximo <span className="text-[#E91E82]">*</span></>
                ) : (
                  <>Cupo máximo <span className="font-normal lowercase text-slate-400">(vacío = sin límite)</span></>
                )
              }
              error={errores.cupoMaximo}
            >
              <Input
                id="actividad-cupo"
                type="number"
                inputMode="numeric"
                min={1}
                max={32767}
                value={cupo}
                // Solo dígitos: ni "-", ni "-0", ni "e" llegan al estado (Zod valida al guardar).
                onChange={(e) => setCupo(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                aria-invalid={Boolean(errores.cupoMaximo)}
                aria-describedby={errores.cupoMaximo ? "actividad-cupo-error" : undefined}
                className={CLASE_INPUT}
              />
            </Campo>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-white/10 dark:bg-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-slate-200 px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:w-auto dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#E91E82] px-6 text-sm font-extrabold text-white shadow-md shadow-[#E91E82]/30 transition-all hover:bg-[#BC1266] sm:w-auto"
            >
              {guardando ? "Guardando..." : "Guardar actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
