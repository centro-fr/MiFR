import { useRef, useState, type ComponentProps } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { soloDigitos } from "@/utils/entrada-numerica";
import { cn } from "@/utils/cn";

type PropsDelInput = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "min" | "max">;

interface CampoHoraProps extends PropsDelInput {
  /** HH:MM si la hora está completa y existe; si no, lo escrito tal cual ("9", "09:3") o "". */
  value: string;
  onChange: (valor: string) => void;
  /** HH:MM: limitan las opciones del selector. Lo escrito a mano lo valida el esquema del formulario. */
  min?: string;
  max?: string;
  /** Nombre del botón del selector para lectores de pantalla. */
  etiquetaSelector?: string;
}

const HORA_COMPLETA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PASO_MINUTOS = 5;
const HORAS = Array.from({ length: 24 }, (_, hora) => String(hora).padStart(2, "0"));
const MINUTOS = Array.from({ length: 60 / PASO_MINUTOS }, (_, i) => String(i * PASO_MINUTOS).padStart(2, "0"));

/** "0930" → "09:30"; los dos puntos aparecen a medida que se escribe. */
function conDosPuntos(digitos: string): string {
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2, 4)}` : digitos;
}

function fueraDeRango(hora: string, min?: string, max?: string): boolean {
  return Boolean((min && hora < min) || (max && hora > max));
}

const CLASE_OPCION =
  "flex h-8 w-full shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors";

interface ColumnaProps {
  titulo: string;
  opciones: string[];
  seleccionada: string | undefined;
  deshabilitada: (opcion: string) => boolean;
  onElegir: (opcion: string) => void;
}

function ColumnaDeOpciones({ titulo, opciones, seleccionada, deshabilitada, onElegir }: ColumnaProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">{titulo}</span>
      <div role="listbox" aria-label={titulo} className="relative flex max-h-52 flex-col gap-1 overflow-y-auto overscroll-contain pr-1">
        {opciones.map((opcion) => {
          const elegida = opcion === seleccionada;
          return (
            <button
              key={opcion}
              type="button"
              role="option"
              aria-selected={elegida}
              disabled={deshabilitada(opcion)}
              onClick={() => onElegir(opcion)}
              ref={(boton) => {
                // Centra la opción elegida moviendo solo la columna: scrollIntoView movería también el modal.
                const lista = boton?.parentElement;
                if (elegida && boton && lista) lista.scrollTop = boton.offsetTop - (lista.clientHeight - boton.offsetHeight) / 2;
              }}
              className={cn(
                CLASE_OPCION,
                elegida
                  ? "bg-primary font-bold text-white shadow-sm shadow-primary/40 hover:bg-primary-dark"
                  : "text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-slate-200",
                "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
              )}
            >
              {opcion}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Campo de hora con el mismo diseño que CampoFecha: se escribe HH:MM (solo dígitos, los dos puntos
 * se ponen solos) o se elige en un selector de horas y minutos.
 */
export function CampoHora({
  value,
  onChange,
  min,
  max,
  etiquetaSelector = "Elegir la hora",
  className,
  disabled,
  ...props
}: CampoHoraProps) {
  const [texto, setTexto] = useState(value);
  const [abierto, setAbierto] = useState(false);
  const inputVisibleRef = useRef<HTMLInputElement>(null);

  // El formulario recibe lo escrito tal cual: si cambia desde afuera, el campo lo muestra.
  if (value !== texto) {
    setTexto(value);
  }

  const partes = HORA_COMPLETA.exec(value);
  const horaElegida = partes?.[1];
  const minutoElegido = partes?.[2];

  const escribir = (escrito: string) => {
    const nuevo = conDosPuntos(soloDigitos(escrito, 4));
    setTexto(nuevo);
    onChange(nuevo);
  };

  const elegir = (hora: string, minuto: string, cerrar: boolean) => {
    const nueva = `${hora}:${minuto}`;
    setTexto(nueva);
    onChange(nueva);
    if (cerrar) setAbierto(false);
  };

  // Una hora queda deshabilitada si ninguno de sus minutos entra en el rango.
  const horaDeshabilitada = (hora: string) => fueraDeRango(`${hora}:59`, min) || fueraDeRango(`${hora}:00`, undefined, max);
  const minutoDeshabilitado = (minuto: string) => fueraDeRango(`${horaElegida ?? "00"}:${minuto}`, min, max);

  const { id, name, "aria-label": ariaLabel, required, ...restoProps } = props;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={inputVisibleRef}
            type="text"
            id={id ? `${id}-visible` : undefined}
            inputMode="numeric"
            autoComplete="off"
            placeholder="hh:mm"
            maxLength={5}
            value={texto}
            disabled={disabled}
            onChange={(e) => escribir(e.target.value)}
            className={cn("pr-11 font-semibold tabular-nums", className)}
            {...restoProps}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={etiquetaSelector}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Clock aria-hidden="true" className="size-4" />
            </button>
          </PopoverTrigger>

          {/* Input nativo para compatibilidad con pruebas y formularios (getByLabelText, .value HH:MM, fireEvent.change) */}
          <input
            id={id}
            name={name}
            aria-label={ariaLabel}
            required={required}
            disabled={disabled}
            type="time"
            tabIndex={-1}
            min={min}
            max={max}
            value={HORA_COMPLETA.test(value) ? value : ""}
            onFocus={() => inputVisibleRef.current?.focus()}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="pointer-events-none absolute inset-0 size-full opacity-0"
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        aria-label="Selector de hora"
        className="max-h-[var(--radix-popover-content-available-height)] w-[220px] overflow-y-auto overscroll-contain p-3.5"
      >
        <div className="flex gap-2">
          <ColumnaDeOpciones
            titulo="Hora"
            opciones={HORAS}
            seleccionada={horaElegida}
            deshabilitada={horaDeshabilitada}
            onElegir={(hora) => elegir(hora, minutoElegido ?? "00", false)}
          />
          <ColumnaDeOpciones
            titulo="Minutos"
            opciones={MINUTOS}
            seleccionada={minutoElegido}
            deshabilitada={minutoDeshabilitado}
            onElegir={(minuto) => elegir(horaElegida ?? HORAS.find((hora) => !horaDeshabilitada(hora)) ?? "00", minuto, true)}
          />
        </div>

        <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cerrar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
