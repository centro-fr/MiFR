import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { useDialogA11y } from "../../hooks/use-dialog-a11y";
import type { Actividad, GrupoActividad } from "../../types/actividad";

interface Props {
  actividad: Actividad | null;
  onClose: () => void;
  onSave: (data: Partial<Actividad>) => void;
}

export const ModalFormActividad: React.FC<Props> = ({
  actividad,
  onClose,
  onSave,
}) => {
  // El estado se inicializa desde la prop una sola vez al montar.
  // El padre pasa key={actividad?.id ?? "nueva"} para remontar el modal
  // con valores frescos cada vez que cambia la actividad a editar.
  const [nombre, setNombre] = useState(actividad?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [grupo, setGrupo] = useState<GrupoActividad>(
    actividad?.grupo ?? "GRUPAL",
  );
  const [cupo, setCupo] = useState(actividad?.cupo ?? "20 alumnos");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ active: true, onClose, dialogRef });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nombre,
      descripcion,
      grupo,
      tipoBadge:
        grupo === "INDIVIDUAL"
          ? "Personalizada"
          : grupo === "HIBRIDA"
            ? "Grupal / Personalizada"
            : "Grupal",
      cupo: grupo === "INDIVIDUAL" ? "1 alumno (Estricto)" : cupo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-overlay-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-actividad-titulo"
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-panel-in dark:bg-surface-low dark:border-white/10"
      >
        {/* Cabecera del Panel */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-white/5 dark:to-surface-low dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-[#E91E82] flex items-center justify-center font-bold text-base shadow-xs">
              ✨
            </div>
            <div>
              <h3
                id="modal-actividad-titulo"
                className="text-base font-extrabold text-slate-900 dark:text-white"
              >
                {actividad ? "Editar Disciplina" : "Nueva Actividad Oficial"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configura los parámetros, modalidad y cupos del centro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            data-autofocus
            className="h-11 w-11 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario (incluye el footer de acciones: el botón submit debe
            estar dentro del form para no depender del atributo form="...") */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col text-sm"
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label
                htmlFor="actividad-nombre"
                className="block font-extrabold text-slate-700 text-sm uppercase tracking-wider dark:text-slate-300"
              >
                Nombre de la Actividad <span className="text-[#E91E82]">*</span>
              </label>
              <input
                id="actividad-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Yoga Vinyasa, Funcional, Posing..."
                className="w-full text-base border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 transition-all outline-none dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label
                htmlFor="actividad-descripcion"
                className="block font-extrabold text-slate-700 text-sm uppercase tracking-wider dark:text-slate-300"
              >
                Descripción Corta{" "}
                <span className="text-slate-400 font-normal lowercase dark:text-slate-500">
                  (opcional)
                </span>
              </label>
              <textarea
                id="actividad-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla brevemente el enfoque de la clase o sus objetivos..."
                className="w-full text-base border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-slate-50/50 focus:bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 transition-all outline-none resize-none leading-relaxed dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
              />
            </div>

            {/* Selector de Modalidad (Cards interactivas) */}
            <div className="space-y-2">
              <span
                id="modalidad-label"
                className="block font-extrabold text-slate-700 text-sm uppercase tracking-wider dark:text-slate-300"
              >
                Modalidad de la Disciplina{" "}
                <span className="text-[#E91E82]">*</span>
              </span>
              <div
                role="radiogroup"
                aria-labelledby="modalidad-label"
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {/* Grupal */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={grupo === "GRUPAL"}
                  onClick={() => setGrupo("GRUPAL")}
                  className={`min-h-[44px] border-2 p-3.5 rounded-2xl flex flex-col justify-between text-left transition-all ${
                    grupo === "GRUPAL"
                      ? "border-[#E91E82] bg-pink-50/60 shadow-sm dark:bg-pink-500/10"
                      : "border-slate-200 hover:border-slate-300 bg-white dark:border-white/15 dark:hover:border-white/25 dark:bg-transparent"
                  }`}
                >
                  <span className="flex items-center justify-between mb-2">
                    <span aria-hidden="true" className="text-base">
                      👥
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${grupo === "GRUPAL" ? "border-[#E91E82]" : "border-slate-300 dark:border-white/25"}`}
                    >
                      {grupo === "GRUPAL" && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#E91E82]" />
                      )}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`block font-bold text-sm ${grupo === "GRUPAL" ? "text-[#BC1266] dark:text-pink-300" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      Grupal
                    </span>
                    <span className="block text-sm text-slate-600 mt-0.5 leading-tight dark:text-slate-400">
                      Clases masivas o tradicionales.
                    </span>
                  </span>
                </button>

                {/* Híbrida */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={grupo === "HIBRIDA"}
                  onClick={() => setGrupo("HIBRIDA")}
                  className={`min-h-[44px] border-2 p-3.5 rounded-2xl flex flex-col justify-between text-left transition-all ${
                    grupo === "HIBRIDA"
                      ? "border-[#E91E82] bg-pink-50/60 shadow-sm dark:bg-pink-500/10"
                      : "border-slate-200 hover:border-slate-300 bg-white dark:border-white/15 dark:hover:border-white/25 dark:bg-transparent"
                  }`}
                >
                  <span className="flex items-center justify-between mb-2">
                    <span aria-hidden="true" className="text-base">
                      🔄
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${grupo === "HIBRIDA" ? "border-[#E91E82]" : "border-slate-300 dark:border-white/25"}`}
                    >
                      {grupo === "HIBRIDA" && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#E91E82]" />
                      )}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`block font-bold text-sm ${grupo === "HIBRIDA" ? "text-[#BC1266] dark:text-pink-300" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      Híbrida
                    </span>
                    <span className="block text-sm text-slate-600 mt-0.5 leading-tight dark:text-slate-400">
                      Grupal o personalizada según turno.
                    </span>
                  </span>
                </button>

                {/* Individual */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={grupo === "INDIVIDUAL"}
                  onClick={() => setGrupo("INDIVIDUAL")}
                  className={`min-h-[44px] border-2 p-3.5 rounded-2xl flex flex-col justify-between text-left transition-all ${
                    grupo === "INDIVIDUAL"
                      ? "border-[#E91E82] bg-pink-50/60 shadow-sm dark:bg-pink-500/10"
                      : "border-slate-200 hover:border-slate-300 bg-white dark:border-white/15 dark:hover:border-white/25 dark:bg-transparent"
                  }`}
                >
                  <span className="flex items-center justify-between mb-2">
                    <span aria-hidden="true" className="text-base">
                      👤
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${grupo === "INDIVIDUAL" ? "border-[#E91E82]" : "border-slate-300 dark:border-white/25"}`}
                    >
                      {grupo === "INDIVIDUAL" && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#E91E82]" />
                      )}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`block font-bold text-sm ${grupo === "INDIVIDUAL" ? "text-[#BC1266] dark:text-pink-300" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      Individual
                    </span>
                    <span className="block text-sm text-slate-600 mt-0.5 leading-tight dark:text-slate-400">
                      1 a 1 estricto (cupo 1).
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Cupo Dinámico según la Modalidad Elegida */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                grupo === "INDIVIDUAL"
                  ? "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200"
                  : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="actividad-cupo"
                  className="font-extrabold text-sm uppercase tracking-wide"
                >
                  Aforo / Cupo Máximo
                </label>
                <span
                  className={`text-sm px-2 py-0.5 rounded-full font-bold ${
                    grupo === "INDIVIDUAL"
                      ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
                      : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  }`}
                >
                  {grupo === "INDIVIDUAL" ? "Bloqueado a 1 Alumno" : "Flexible"}
                </span>
              </div>

              {grupo === "INDIVIDUAL" ? (
                <p className="text-sm text-amber-800 font-medium leading-relaxed dark:text-amber-200">
                  Al tratarse de una disciplina individual o específica, el cupo
                  queda fijado automáticamente en <strong>1 persona</strong> por
                  turno.
                </p>
              ) : (
                <>
                  <input
                    id="actividad-cupo"
                    type="text"
                    value={cupo}
                    onChange={(e) => setCupo(e.target.value)}
                    placeholder="Ej: 20 alumnos, Según horario..."
                    className="w-full text-base border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 outline-none dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
                  />
                  <p className="text-sm text-slate-600 mt-1.5 dark:text-slate-400">
                    Indica la cantidad máxima de asistentes permitida por sala
                    para diagramar los turnos correctamente.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Acciones Inferiores */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex items-center justify-end gap-3 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] bg-[#E91E82] hover:bg-[#BC1266] text-white px-6 rounded-xl text-sm font-extrabold shadow-md shadow-[#E91E82]/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Guardar Actividad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
