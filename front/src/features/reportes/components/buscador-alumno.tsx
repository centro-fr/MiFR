import { useId, useState, type KeyboardEvent } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useSugerenciasDeAlumnos } from "@/features/reportes/hooks/use-reportes";
import { cn } from "@/utils/cn";

// Autocompletado de alumno para el filtro del informe (patrón combobox de WAI-ARIA): se escribe el
// nombre o el DNI y se elige de la lista con el mouse o las flechas.

export interface AlumnoElegido {
  id: number;
  nombre: string;
}

interface PropsBuscador {
  id: string;
  elegido: AlumnoElegido | null;
  onElegir: (alumno: AlumnoElegido | null) => void;
  className: string;
}

export function BuscadorAlumno({ id, elegido, onElegir, className }: PropsBuscador) {
  const idLista = useId();
  const [texto, setTexto] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const consulta = useSugerenciasDeAlumnos(texto);
  const opciones = texto.trim().length >= 2 ? (consulta.data?.items ?? []) : [];

  if (elegido) {
    return (
      <div className={cn(className, "flex items-center justify-between gap-2")}>
        <span className="truncate">{elegido.nombre}</span>
        <button
          type="button"
          onClick={() => onElegir(null)}
          aria-label={`Quitar el filtro por ${elegido.nombre}`}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary dark:hover:bg-slate-800"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  function elegir(indice: number) {
    const opcion = opciones[indice];
    if (!opcion) return;
    onElegir({ id: opcion.id_alumno, nombre: opcion.nombre_completo });
    setTexto("");
    setAbierta(false);
    setActiva(-1);
  }

  function moverConTeclado(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      setAbierta(false);
      return;
    }
    if (evento.key === "Enter" && abierta && activa >= 0) {
      evento.preventDefault();
      elegir(activa);
      return;
    }
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    evento.preventDefault();
    setAbierta(true);
    const paso = evento.key === "ArrowDown" ? 1 : -1;
    setActiva((actual) => (opciones.length === 0 ? -1 : (actual + paso + opciones.length) % opciones.length));
  }

  const mostrarLista = abierta && texto.trim().length >= 2;
  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        maxLength={60}
        placeholder="Nombre o DNI (opcional)"
        aria-expanded={mostrarLista}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={mostrarLista && activa >= 0 ? `${idLista}-${activa}` : undefined}
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setAbierta(true);
          setActiva(-1);
        }}
        onKeyDown={moverConTeclado}
        onBlur={() => setAbierta(false)}
        className={cn(className, "pl-9")}
      />
      {mostrarLista && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Alumnos encontrados"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg dark:bg-slate-900"
        >
          {consulta.isFetching && opciones.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Buscando…
            </li>
          )}
          {!consulta.isFetching && opciones.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-500">No hay alumnos con ese nombre o DNI.</li>}
          {opciones.map((opcion, indice) => (
            <li
              key={opcion.id_alumno}
              id={`${idLista}-${indice}`}
              role="option"
              aria-selected={indice === activa}
              // mousedown en vez de click: el blur del input cerraría la lista antes del click.
              onMouseDown={(evento) => {
                evento.preventDefault();
                elegir(indice);
              }}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-3 py-1.5 text-sm",
                indice === activa ? "bg-pink-50 dark:bg-primary/15" : "hover:bg-slate-50 dark:hover:bg-white/5",
              )}
            >
              <span className="font-semibold text-slate-900 dark:text-white">{opcion.nombre_completo}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {opcion.dni ? `DNI ${opcion.dni}` : "Sin DNI"}
                {opcion.estado === "BAJA" && " · dado de baja"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
