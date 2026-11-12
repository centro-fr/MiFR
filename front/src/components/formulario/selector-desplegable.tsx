import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface OpcionSelectorBase {
  valor: string;
  texto: string;
  grupo?: string;
  disabled?: boolean;
}

export type OpcionEntrada =
  | OpcionSelectorBase
  | { id: string | number; nombre?: string; etiqueta?: string }
  | string;

export interface SelectorDesplegableProps {
  id?: string;
  name?: string;
  etiqueta?: string;
  valor: string;
  opciones: OpcionEntrada[];
  onChange: (valor: string) => void;
  todos?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  botonClassName?: string;
  variante?: "pildora" | "formulario";
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  icono?: ReactNode;
  conOpcionesNativas?: boolean;
}

function normalizarOpciones(opciones: OpcionEntrada[], todos?: string): OpcionSelectorBase[] {
  const lista: OpcionSelectorBase[] = [];

  if (todos !== undefined) {
    lista.push({ valor: "", texto: todos });
  }

  for (const op of opciones) {
    if (typeof op === "string") {
      lista.push({ valor: op, texto: op });
    } else if ("valor" in op && "texto" in op) {
      lista.push(op);
    } else if ("id" in op) {
      const texto = (op as { etiqueta?: string; nombre?: string }).etiqueta ?? (op as { nombre?: string }).nombre ?? String(op.id);
      lista.push({ valor: String(op.id), texto });
    }
  }

  return lista;
}

export function SelectorDesplegable({
  id,
  name,
  etiqueta,
  valor,
  opciones,
  onChange,
  todos,
  placeholder = "Seleccionar…",
  disabled = false,
  className,
  botonClassName,
  variante = "pildora",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  icono,
  conOpcionesNativas = true,
}: SelectorDesplegableProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const selectNativoRef = useRef<HTMLSelectElement>(null);

  const opcionesNormalizadas = normalizarOpciones(opciones, todos);
  const opcionSeleccionada = opcionesNormalizadas.find((o) => o.valor === valor);
  const textoAMostrar = opcionSeleccionada?.texto ?? placeholder;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, [abierto]);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    function alPresionarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
      }
    }
    document.addEventListener("keydown", alPresionarEscape);
    return () => document.removeEventListener("keydown", alPresionarEscape);
  }, [abierto]);

  function seleccionar(nuevoValor: string) {
    onChange(nuevoValor);
    setAbierto(false);
  }

  // Clases según la variante
  const esPildora = variante === "pildora";

  return (
    <div
      ref={contenedorRef}
      className={cn(
        "relative",
        esPildora
          ? "h-10 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs transition-colors hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-slate-700 dark:bg-slate-900"
          : "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {/* Etiqueta visible en la píldora si fue provista */}
      {esPildora && etiqueta && (
        <label
          htmlFor={id}
          className="mr-2 text-xs font-semibold text-slate-500 whitespace-nowrap select-none dark:text-slate-400 cursor-pointer"
          onClick={() => !disabled && setAbierto((prev) => !prev)}
        >
          {etiqueta}
        </label>
      )}

      {/* Botón trigger elegante */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={() => setAbierto((prev) => !prev)}
        className={cn(
          "flex items-center justify-between gap-2 outline-none select-none transition-colors",
          esPildora
            ? "cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200"
            : "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer",
          botonClassName,
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {icono}
          <span className="truncate">{textoAMostrar}</span>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-200",
            abierto && "rotate-180 text-primary",
          )}
        />
      </button>

      {/* Select nativo para accesibilidad total (combobox nativo), lectores de pantalla y pruebas automatizadas */}
      <select
        ref={selectNativoRef}
        id={id}
        name={name}
        aria-label={ariaLabel || undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={valor}
        disabled={disabled}
        tabIndex={0}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 size-full opacity-0"
      >
        {conOpcionesNativas ? (
          opcionesNormalizadas.map((op) => (
            <option key={op.valor} value={op.valor} disabled={op.disabled}>
              {op.texto}
            </option>
          ))
        ) : valor ? (
          <option value={valor}>{textoAMostrar}</option>
        ) : null}
      </select>

      {/* Menú flotante desplegable estilizado con el color de marca #E91E82 */}
      {abierto && (
        <div
          role="listbox"
          aria-label={ariaLabel || etiqueta}
          className={cn(
            "absolute z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-900",
            esPildora ? "top-full left-0 min-w-[200px]" : "top-full left-0 w-full min-w-[180px]",
          )}
        >
          {opcionesNormalizadas.map((op) => {
            const estaSeleccionado = op.valor === valor;
            const estaDeshabilitado = op.disabled;
            return (
              <div
                key={op.valor}
                role="option"
                aria-selected={estaSeleccionado}
                aria-disabled={estaDeshabilitado}
                onClick={() => !estaDeshabilitado && seleccionar(op.valor)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors select-none",
                  estaDeshabilitado
                    ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                    : estaSeleccionado
                      ? "cursor-pointer bg-primary/10 font-bold text-primary dark:bg-primary/20 dark:text-pink-400"
                      : "cursor-pointer text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-slate-200",
                )}
              >
                <span className="truncate">{op.texto}</span>
                {estaSeleccionado && <Check className="ml-2 size-4 shrink-0 text-primary" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
