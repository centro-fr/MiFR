import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { actividadFormSchema, type ActividadFormData } from "@/features/actividades/schemas/actividad";
import type { Actividad, ModalidadActividad } from "@/types/actividad";

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
  "w-full text-base border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 transition-all outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10";

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-extrabold text-slate-700 text-sm uppercase tracking-wider dark:text-slate-300">
        {etiqueta}
      </label>
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
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ active: true, onClose, dialogRef });

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
    <div
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-overlay-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-actividad-titulo"
        className="w-full max-w-[640px] my-auto max-h-[90dvh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-modal-in dark:bg-surface-low dark:border-white/10"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-white/5 dark:to-surface-low dark:border-white/10">
          <div>
            <h3 id="modal-actividad-titulo" className="text-base font-extrabold text-slate-900 dark:text-white">
              {actividad ? "Editar actividad" : "Nueva actividad"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Datos, modalidad y cupo de la disciplina.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-11 w-11 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col text-sm">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {errorGuardado && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {errorGuardado}
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Campo
                id="actividad-codigo"
                etiqueta={<>Código <span className="text-[#E91E82]">*</span></>}
                error={errores.codigo}
              >
                <input
                  id="actividad-codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  disabled={actividad !== null}
                  maxLength={20}
                  placeholder="Ej: FUNCIONAL"
                  aria-invalid={Boolean(errores.codigo)}
                  aria-describedby={errores.codigo ? "actividad-codigo-error" : undefined}
                  {...(actividad === null ? { "data-autofocus": true } : {})}
                  className={CLASE_INPUT}
                />
              </Campo>

              <Campo
                id="actividad-nombre"
                etiqueta={<>Nombre <span className="text-[#E91E82]">*</span></>}
                error={errores.nombre}
              >
                <input
                  id="actividad-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={60}
                  placeholder="Ej: Funcional Grupal"
                  aria-invalid={Boolean(errores.nombre)}
                  aria-describedby={errores.nombre ? "actividad-nombre-error" : undefined}
                  {...(actividad !== null ? { "data-autofocus": true } : {})}
                  className={CLASE_INPUT}
                />
              </Campo>
            </div>

            <Campo
              id="actividad-descripcion"
              etiqueta={<>Descripción <span className="text-slate-400 font-normal lowercase">(opcional)</span></>}
              error={errores.descripcion}
            >
              <textarea
                id="actividad-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={255}
                className={`${CLASE_INPUT} resize-none font-normal leading-relaxed`}
              />
            </Campo>

            <fieldset className="space-y-2">
              <legend className="block font-extrabold text-slate-700 text-sm uppercase tracking-wider dark:text-slate-300">
                Modalidad <span className="text-[#E91E82]">*</span>
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {MODALIDADES.map(({ valor, titulo, detalle, icono }) => (
                  <label
                    key={valor}
                    className={`min-h-[44px] cursor-pointer border-2 p-3.5 rounded-2xl flex items-start gap-3 transition-all ${
                      modalidad === valor
                        ? "border-[#E91E82] bg-pink-50/60 shadow-sm dark:bg-pink-500/10"
                        : "border-slate-200 hover:border-slate-300 bg-white dark:border-white/15 dark:bg-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalidad"
                      value={valor}
                      checked={modalidad === valor}
                      onChange={() => setModalidad(valor)}
                      className="mt-1 accent-[#E91E82]"
                    />
                    <span>
                      <span className="block font-bold text-sm text-slate-800 dark:text-slate-200">
                        <span aria-hidden="true">{icono}</span> {titulo}
                      </span>
                      <span className="block text-sm text-slate-600 mt-0.5 leading-tight dark:text-slate-400">{detalle}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Campo
              id="actividad-cupo"
              etiqueta={
                modalidad === "PERSONALIZADA" ? (
                  <>Cupo máximo <span className="text-[#E91E82]">*</span></>
                ) : (
                  <>Cupo máximo <span className="text-slate-400 font-normal lowercase">(vacío = sin límite)</span></>
                )
              }
              error={errores.cupoMaximo}
            >
              <input
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

          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center px-5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center bg-[#E91E82] hover:bg-[#BC1266] disabled:opacity-60 text-white px-6 rounded-xl text-sm font-extrabold shadow-md shadow-[#E91E82]/30 transition-all"
            >
              {guardando ? "Guardando..." : "Guardar actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
