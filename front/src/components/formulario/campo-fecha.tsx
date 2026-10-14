import { useRef, useState, type ComponentProps } from "react";
import { CalendarDays } from "lucide-react";
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
  etiquetaCalendario: string;
}

const DIGITOS_DE_UNA_FECHA = 8;
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

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

/**
 * Fecha que se escribe como dd/mm/aaaa. Reemplaza al input date nativo porque en él, con el año
 * completo, un dígito de más vuelve a empezar el año desde cero ("2000" → "0000"); acá se ignora.
 * El ícono abre el mismo calendario nativo de antes.
 */
export function CampoFecha({ value, onChange, min, max, etiquetaCalendario, className, disabled, ...props }: CampoFechaProps) {
  const [texto, setTexto] = useState(() => textoDelValor(value));
  const calendario = useRef<HTMLInputElement>(null);

  // Si el valor cambia desde afuera (el calendario, o el formulario que se reinicia), se muestra ese.
  if (value !== valorDelTexto(texto)) setTexto(textoDelValor(value));

  const escribir = (escrito: string) => {
    const nuevo = conBarras(escrito.replace(/\D/g, "").slice(0, DIGITOS_DE_UNA_FECHA));
    setTexto(nuevo);
    onChange(valorDelTexto(nuevo));
  };

  const abrirCalendario = () => {
    try {
      calendario.current?.showPicker();
    } catch {
      // Navegador sin showPicker (anterior a 2022): queda escribir la fecha, que siempre funciona.
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        disabled={disabled}
        onChange={(e) => escribir(e.target.value)}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        disabled={disabled}
        aria-label={etiquetaCalendario}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <CalendarDays aria-hidden="true" className="size-4" />
      </button>
      {/* Solo para abrir el calendario nativo. Invisible y sin clics, pero del mismo tamaño y en el
          mismo lugar que el campo: el navegador ubica el calendario según su ícono interno, y con
          un input de 1 px ese ícono no se dibuja y el calendario se abre en la esquina de la ventana. */}
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        value={FECHA_ISO.test(value) ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  );
}
