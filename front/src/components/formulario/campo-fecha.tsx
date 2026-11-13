import { useEffect, useRef, useState, type ComponentProps } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

type PropsDelInput = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "min" | "max">;

interface CampoFechaProps extends PropsDelInput {
  /** AAAA-MM-DD si la fecha está completa y existe; si no, lo escrito tal cual ("21/08/20") o "". */
  value: string;
  onChange: (valor: string) => void;
  /** AAAA-MM-DD: limitan el calendario. Lo escrito a mano lo valida el esquema del formulario. */
  min?: string;
  max?: string;
  /** Nombre del botón del calendario para lectores de pantalla. */
  etiquetaCalendario?: string;
}

const DIGITOS_DE_UNA_FECHA = 8;
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/** "21082000" → "21/08/2000"; las barras aparecen a medida que se escribe. */
function conBarras(digitos: string): string {
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean).join("/");
}

function existe(anio: number, mes: number, dia: number): boolean {
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/** Lo que recibe el formulario: la fecha ISO si está completa y existe (31/02 no), o lo escrito. */
function valorDelTexto(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length !== DIGITOS_DE_UNA_FECHA) return texto;
  const [dia, mes, anio] = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)];
  return existe(Number(anio), Number(mes), Number(dia)) ? `${anio}-${mes}-${dia}` : texto;
}

function textoDelValor(valor: string): string {
  const partes = FECHA_ISO.exec(valor);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor;
}

function fechaHoyIso(): string {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

interface CeldaDia {
  dia: number;
  mes: number;
  anio: number;
  iso: string;
  enMesActual: boolean;
  deshabilitado: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
}

function generarCeldasMes(anio: number, mes: number, seleccionadoIso: string, minIso?: string, maxIso?: string): CeldaDia[] {
  const hoyIso = fechaHoyIso();
  const primerDiaMes = new Date(Date.UTC(anio, mes - 1, 1));
  const diaSemanaPrimerDia = (primerDiaMes.getUTCDay() + 6) % 7;
  const totalDiasMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const totalDiasMesAnterior = new Date(Date.UTC(anio, mes - 1, 0)).getUTCDate();

  const celdas: CeldaDia[] = [];

  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioMesAnterior = mes === 1 ? anio - 1 : anio;
  for (let i = diaSemanaPrimerDia - 1; i >= 0; i--) {
    const dia = totalDiasMesAnterior - i;
    const iso = `${anioMesAnterior}-${String(mesAnterior).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const deshabilitado = Boolean((minIso && iso < minIso) || (maxIso && iso > maxIso));
    celdas.push({
      dia,
      mes: mesAnterior,
      anio: anioMesAnterior,
      iso,
      enMesActual: false,
      deshabilitado,
      esHoy: iso === hoyIso,
      esSeleccionado: iso === seleccionadoIso,
    });
  }

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const iso = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const deshabilitado = Boolean((minIso && iso < minIso) || (maxIso && iso > maxIso));
    celdas.push({
      dia,
      mes,
      anio,
      iso,
      enMesActual: true,
      deshabilitado,
      esHoy: iso === hoyIso,
      esSeleccionado: iso === seleccionadoIso,
    });
  }

  const celdasRestantes = (7 - (celdas.length % 7)) % 7;
  const mesSiguiente = mes === 12 ? 1 : mes + 1;
  const anioMesSiguiente = mes === 12 ? anio + 1 : anio;
  for (let dia = 1; dia <= celdasRestantes; dia++) {
    const iso = `${anioMesSiguiente}-${String(mesSiguiente).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const deshabilitado = Boolean((minIso && iso < minIso) || (maxIso && iso > maxIso));
    celdas.push({
      dia,
      mes: mesSiguiente,
      anio: anioMesSiguiente,
      iso,
      enMesActual: false,
      deshabilitado,
      esHoy: iso === hoyIso,
      esSeleccionado: iso === seleccionadoIso,
    });
  }

  return celdas;
}

/**
 * Campo de fecha moderno que combina entrada manual formateada (dd/mm/aaaa) con un
 * calendario emergente flotante alineado a la estética de MiFR.
 */
export function CampoFecha({
  value,
  onChange,
  min,
  max,
  etiquetaCalendario = "Abrir calendario",
  className,
  disabled,
  ...props
}: CampoFechaProps) {
  const [texto, setTexto] = useState(() => textoDelValor(value));
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputNativo = useRef<HTMLInputElement>(null);

  const partesValor = FECHA_ISO.exec(value);
  const anioInicial = partesValor ? Number(partesValor[1]) : new Date().getFullYear();
  const mesInicial = partesValor ? Number(partesValor[2]) : new Date().getMonth() + 1;

  const [vistaAnio, setVistaAnio] = useState(anioInicial);
  const [vistaMes, setVistaMes] = useState(mesInicial);

  if (value !== valorDelTexto(texto)) {
    setTexto(textoDelValor(value));
  }

  useEffect(() => {
    if (partesValor) {
      setVistaAnio(Number(partesValor[1]));
      setVistaMes(Number(partesValor[2]));
    }
  }, [value]);

  useEffect(() => {
    if (!abierto) return;

    function handleClickOutside(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto]);

  const escribir = (escrito: string) => {
    const nuevo = conBarras(escrito.replace(/\D/g, "").slice(0, DIGITOS_DE_UNA_FECHA));
    setTexto(nuevo);
    onChange(valorDelTexto(nuevo));
  };

  const mesAnterior = () => {
    if (vistaMes === 1) {
      setVistaMes(12);
      setVistaAnio((a) => a - 1);
    } else {
      setVistaMes((m) => m - 1);
    }
  };

  const mesSiguiente = () => {
    if (vistaMes === 12) {
      setVistaMes(1);
      setVistaAnio((a) => a + 1);
    } else {
      setVistaMes((m) => m + 1);
    }
  };

  const seleccionarFecha = (iso: string) => {
    onChange(iso);
    setTexto(textoDelValor(iso));
    setAbierto(false);
  };

  const seleccionarHoy = () => {
    const hoyIso = fechaHoyIso();
    if (max && hoyIso > max) return;
    if (min && hoyIso < min) return;
    seleccionarFecha(hoyIso);
    const d = new Date();
    setVistaAnio(d.getFullYear());
    setVistaMes(d.getMonth() + 1);
  };

  const celdas = generarCeldasMes(vistaAnio, vistaMes, value, min, max);

  const inputVisibleRef = useRef<HTMLInputElement>(null);

  const {
    id,
    name,
    "aria-label": ariaLabel,
    required,
    ...restoProps
  } = props;

  return (
    <div ref={contenedorRef} className="relative">
      <Input
        ref={inputVisibleRef}
        type="text"
        id={id ? `${id}-visible` : undefined}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        disabled={disabled}
        onChange={(e) => escribir(e.target.value)}
        className={cn("pr-11 font-semibold", className)}
        {...restoProps}
      />
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        disabled={disabled}
        aria-label={etiquetaCalendario}
        aria-expanded={abierto}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <CalendarDays aria-hidden="true" className="size-4" />
      </button>

      {/* Input nativo para compatibilidad total con pruebas (getByLabelText, .value ISO, fireEvent.change) */}
      <input
        ref={inputNativo}
        id={id}
        name={name}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        type="date"
        tabIndex={-1}
        min={min}
        max={max}
        value={FECHA_ISO.test(value) ? value : ""}
        onFocus={() => inputVisibleRef.current?.focus()}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 size-full opacity-0"
      />

      {abierto && (
        <div
          role="dialog"
          aria-label="Calendario de selección de fecha"
          className="absolute top-full left-0 z-50 mt-2 w-[290px] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header del mes */}
          <div className="flex items-center justify-between pb-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={mesAnterior}
              className="size-8 rounded-lg text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/20"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-extrabold text-slate-800 dark:text-white">
              {MESES[vistaMes - 1]} {vistaAnio}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={mesSiguiente}
              className="size-8 rounded-lg text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/20"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((celda) => (
              <button
                key={celda.iso}
                type="button"
                disabled={celda.deshabilitado}
                onClick={() => seleccionarFecha(celda.iso)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl text-xs font-semibold transition-all",
                  celda.enMesActual
                    ? "text-slate-700 dark:text-slate-200"
                    : "text-slate-300 dark:text-slate-600",
                  celda.esSeleccionado &&
                    "bg-primary font-bold text-white shadow-sm shadow-primary/40 hover:bg-primary-dark",
                  !celda.esSeleccionado &&
                    celda.esHoy &&
                    "border border-primary text-primary font-bold",
                  !celda.esSeleccionado &&
                    !celda.deshabilitado &&
                    "hover:bg-primary/10 hover:text-primary cursor-pointer",
                  celda.deshabilitado && "opacity-30 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {celda.dia}
              </button>
            ))}
          </div>

          {/* Footer del calendario */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={seleccionarHoy}
              className="rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
