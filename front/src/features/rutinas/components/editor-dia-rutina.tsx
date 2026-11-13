import { useMemo, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  buscarEjerciciosDelCatalogo,
  resolverGifUrl,
  type EjercicioSugerido,
} from "@/features/rutinas/data/catalogo-ejercicios";
import type { EjercicioFormValues, RutinaFormValues } from "@/features/rutinas/schemas/rutina-form";
import { MiniaturaEjercicio } from "@/features/rutinas/components/miniatura-ejercicio";

interface PropsCatalogo {
  catalogo: EjercicioSugerido[] | null;
  cargandoCatalogo: boolean;
  errorCatalogo: boolean;
  onReintentarCatalogo: () => void;
}

interface PropsBuscador extends PropsCatalogo {
  onAgregar: (ejercicio: EjercicioFormValues) => void;
}

function BuscadorDeEjercicios({ catalogo, cargandoCatalogo, errorCatalogo, onReintentarCatalogo, onAgregar }: PropsBuscador) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => buscarEjerciciosDelCatalogo(busqueda, catalogo ?? []), [busqueda, catalogo]);

  function agregar(ejercicio: EjercicioFormValues) {
    onAgregar(ejercicio);
    setBusqueda("");
    setAbierto(false);
  }

  function agregarDelCatalogo(ejercicio: EjercicioSugerido) {
    agregar({
      nombre: ejercicio.nombre,
      series: "3",
      repeticiones: "10-12",
      notas: `${ejercicio.grupo_muscular} · ${ejercicio.equipamiento}`,
      gif_url: ejercicio.gif_url,
    });
  }

  function agregarPropio() {
    if (!busqueda.trim()) return;
    agregar({ nombre: busqueda.trim(), series: "3", repeticiones: "10", notas: "" });
  }

  return (
    <div className="relative pt-1">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-pink-500" />
        <Input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar ejercicio en el catálogo (ej: sentadilla, press, remo)..."
          className="h-10 pl-9 rounded-xl border-slate-200 bg-white text-sm shadow-2xs placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {abierto && busqueda.trim() !== "" && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60">
          {cargandoCatalogo && (
            <p role="status" className="p-2.5 text-xs text-slate-500 dark:text-slate-400">
              Cargando catálogo completo...
            </p>
          )}
          {errorCatalogo && (
            <div role="alert" className="flex items-center justify-between gap-3 p-2.5 text-xs text-rose-700 dark:text-rose-300">
              <span>No se pudo cargar el catálogo completo.</span>
              <button type="button" onClick={onReintentarCatalogo} className="shrink-0 font-bold underline">
                Reintentar
              </button>
            </div>
          )}
          {resultados.map((ej) => (
            <button
              key={ej.id}
              type="button"
              onClick={() => agregarDelCatalogo(ej)}
              className="flex w-full items-center justify-between p-2.5 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MiniaturaEjercicio nombre={ej.nombre} gifUrl={ej.gif_url} className="size-12" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{ej.nombre}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {ej.grupo_muscular} · {ej.equipamiento}
                  </p>
                  {ej.instrucciones?.[0] && (
                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{ej.instrucciones[0]}</p>
                  )}
                </div>
              </div>
            </button>
          ))}

          {!cargandoCatalogo && resultados.length === 0 && (
            <div className="p-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
              No encontramos coincidencias en el catálogo.
            </div>
          )}

          <button
            type="button"
            onClick={agregarPropio}
            className="flex w-full items-center gap-2 rounded-xl p-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <Plus className="size-3.5 text-slate-400 shrink-0" />
            <span>Agregar uno: &quot;{busqueda.trim()}&quot;</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface PropsFilaEjercicio {
  formulario: UseFormReturn<RutinaFormValues>;
  indiceDia: number;
  indice: number;
  catalogo: EjercicioSugerido[] | null;
  onQuitar: () => void;
}

const CAMPO_EJERCICIO =
  "h-8 rounded-lg border-slate-200 bg-white text-xs font-normal shadow-2xs dark:border-slate-700 dark:bg-slate-900";

function FilaEjercicio({ formulario, indiceDia, indice, catalogo, onQuitar }: PropsFilaEjercicio) {
  const ruta = `dias.${indiceDia}.ejercicios.${indice}` as const;
  const nombre = formulario.watch(`${ruta}.nombre`) || "Ejercicio";
  const notas = formulario.watch(`${ruta}.notas`);
  const gifUrl = resolverGifUrl(nombre, formulario.watch(`${ruta}.gif_url`), catalogo ?? []);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
      <div className="flex items-center gap-3 min-w-0">
        <MiniaturaEjercicio nombre={nombre} gifUrl={gifUrl} className="size-11" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{nombre}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{notas || "Sin notas"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Input placeholder="Series" {...formulario.register(`${ruta}.series`)} className={`${CAMPO_EJERCICIO} w-20 px-2 text-center`} />
        <Input placeholder="Reps" {...formulario.register(`${ruta}.repeticiones`)} className={`${CAMPO_EJERCICIO} w-20 px-2 text-center`} />
        <Input placeholder="Peso/nota" {...formulario.register(`${ruta}.notas`)} className={`${CAMPO_EJERCICIO} w-28 px-2.5`} />
        <button
          type="button"
          onClick={onQuitar}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer transition-colors"
          aria-label="Quitar ejercicio"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

interface PropsEditorDiaRutina extends PropsCatalogo {
  formulario: UseFormReturn<RutinaFormValues>;
  indiceDia: number;
  puedeQuitar: boolean;
  onQuitar: () => void;
}

// Edita un solo día. Quien lo usa le pone como key el id del día: al cambiar de pestaña se monta de
// nuevo, con su propio useFieldArray y sus propios inputs. Un useFieldArray al que se le cambia el
// nombre conserva los ejercicios del día anterior y termina escribiéndolos sobre el día nuevo.
export function EditorDiaRutina({ formulario, indiceDia, puedeQuitar, onQuitar, ...catalogo }: PropsEditorDiaRutina) {
  const ejercicios = useFieldArray({ control: formulario.control, name: `dias.${indiceDia}.ejercicios` });
  const errorEjercicios = formulario.formState.errors.dias?.[indiceDia]?.ejercicios;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <Input
          {...formulario.register(`dias.${indiceDia}.nombre`)}
          defaultValue={formulario.getValues(`dias.${indiceDia}.nombre`)}
          aria-label="Nombre del día"
          placeholder={`Día ${indiceDia + 1}`}
          className="h-10 w-44 rounded-lg border-slate-200 bg-white text-sm font-bold shadow-2xs dark:border-slate-700 dark:bg-slate-800"
        />
        {puedeQuitar && (
          <button
            type="button"
            onClick={onQuitar}
            className="text-xs font-semibold text-pink-600 hover:underline dark:text-pink-400 cursor-pointer"
          >
            Quitar día
          </button>
        )}
      </div>

      {ejercicios.fields.length > 0 ? (
        <div className="flex items-center justify-between px-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Ejercicio</span>
          <div className="flex items-center gap-2 pr-7">
            <span className="w-20 text-center">Series</span>
            <span className="w-20 text-center">Reps</span>
            <span className="w-28 text-center">Peso o nota</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
          Todavía no hay ejercicios en este día. Buscá o agregá uno abajo.
        </div>
      )}

      {errorEjercicios && (
        <p className="text-xs font-semibold text-rose-600 px-1">
          {typeof errorEjercicios.message === "string" ? errorEjercicios.message : "Agregá al menos un ejercicio a este día."}
        </p>
      )}

      <div className="space-y-2">
        {ejercicios.fields.map((campo, indice) => (
          <FilaEjercicio
            key={campo.id}
            formulario={formulario}
            indiceDia={indiceDia}
            indice={indice}
            catalogo={catalogo.catalogo}
            onQuitar={() => ejercicios.remove(indice)}
          />
        ))}
      </div>

      <BuscadorDeEjercicios {...catalogo} onAgregar={(ejercicio) => ejercicios.append(ejercicio)} />
    </div>
  );
}
