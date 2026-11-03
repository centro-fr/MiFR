import { z } from "zod";
import { precioDesdeTexto } from "@/features/planes/schemas/plan";
import { fechaCorta } from "@/features/honorarios/utils/formato-honorarios";
import type { RegistrarTarifaBody } from "@/features/honorarios/schemas/honorarios";
import type { AlcanceTarifa, ConceptoTarifa } from "@/types/honorarios";

// Nueva tarifa de US-23: el porcentaje por alumno a cargo, igual para todos, o lo que cobra un profesor/a
// por hora de suplencia. Replica los CHECK de tarifas_honorario del DER para avisar antes de enviar
// (valor > 0 y porcentaje <= 100) y la regla del back de que la vigencia no empiece en el pasado: una
// tarifa no cambia lo ya liquidado. El back valida igual.

/** DECIMAL(10,2) de tarifas_honorario.valor. */
const VALOR_MAXIMO = 99_999_999.99;

// "50" o "37,5": como el precio, la coma separa decimales.
const FORMATO_PORCENTAJE = /^\d{1,3}(?:,\d{1,2})?$/;

const FORMATO_DECIMAL = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export interface TarifaFormValues {
  /** Texto como lo escribe la persona: un porcentaje ("50" o "37,5") o un monto ("5.000" o "5000,50"). */
  valor: string;
  /** AAAA-MM-DD. */
  desde: string;
}

function tieneHastaDosDecimales(valor: number): boolean {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

function problemaDelMonto(texto: string): string | null {
  const monto = precioDesdeTexto(texto);
  if (Number.isNaN(monto)) return "Usá la coma para los decimales, por ejemplo 5000 o 5.000,50.";
  if (monto <= 0) return "Ingresá un monto mayor a $0.";
  if (monto > VALOR_MAXIMO) return "El monto es demasiado alto.";
  return tieneHastaDosDecimales(monto) ? null : "Usá como máximo dos decimales.";
}

function porcentajeDesdeTexto(texto: string): number {
  return FORMATO_PORCENTAJE.test(texto) ? Number(texto.replace(",", ".")) : Number.NaN;
}

function problemaDelPorcentaje(texto: string): string | null {
  const porcentaje = porcentajeDesdeTexto(texto);
  if (Number.isNaN(porcentaje)) return "Ingresá un porcentaje como 50 o 37,5.";
  if (porcentaje <= 0) return "El porcentaje tiene que ser mayor a 0.";
  return porcentaje > 100 ? "El porcentaje no puede pasar de 100." : null;
}

function problemaDeLaVigencia(desde: string, inicioUltimaTarifa: string | null, hoy: string): string | null {
  if (desde < hoy) return "No puede empezar antes de hoy.";
  // Sin superposiciones: la nueva cierra la anterior, así que tiene que empezar después que ella.
  if (inicioUltimaTarifa && desde <= inicioUltimaTarifa) {
    return `Tiene que ser posterior al ${fechaCorta(inicioUltimaTarifa)}, cuando empieza la tarifa actual.`;
  }
  return null;
}

/** Un valor guardado como se escribe en el campo ("37,5", "5000"): el formulario parte de la tarifa actual. */
export function valorComoTexto(valor: number): string {
  return FORMATO_DECIMAL.format(valor);
}

const VALOR_POR_CONCEPTO: Record<ConceptoTarifa, { faltante: string; problema: (texto: string) => string | null }> = {
  ALUMNO_A_CARGO: { faltante: "Ingresá el porcentaje por alumno.", problema: problemaDelPorcentaje },
  HORA_SUPLENCIA: { faltante: "Ingresá el monto por hora.", problema: problemaDelMonto },
};

/**
 * `inicioUltimaTarifa` es el de la última del mismo alcance y `hoy`, AAAA-MM-DD en Argentina: la vigencia
 * puede empezar desde ese día.
 */
export function crearTarifaFormSchema(concepto: ConceptoTarifa, inicioUltimaTarifa: string | null, hoy: string) {
  const { faltante, problema } = VALOR_POR_CONCEPTO[concepto];
  return z
    .object({
      valor: z.string().trim().min(1, faltante),
      desde: z.string().min(1, "Elegí desde cuándo rige.").date("Ingresá una fecha válida."),
    })
    .superRefine((valores, ctx) => {
      const agregar = (campo: keyof TarifaFormValues, mensaje: string | null) => {
        if (mensaje) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: mensaje });
      };
      // Un campo vacío ya tiene su error: no se le suma otro.
      if (valores.valor) agregar("valor", problema(valores.valor));
      if (valores.desde) agregar("desde", problemaDeLaVigencia(valores.desde, inicioUltimaTarifa, hoy));
    });
}

export function aRegistrarTarifaBody(alcance: AlcanceTarifa, valores: TarifaFormValues): RegistrarTarifaBody {
  const fecha_vigencia_desde = valores.desde;
  if (alcance.concepto === "ALUMNO_A_CARGO") {
    return { concepto: "ALUMNO_A_CARGO", tipo_valor: "PORCENTAJE", valor: porcentajeDesdeTexto(valores.valor.trim()), fecha_vigencia_desde };
  }
  return {
    concepto: "HORA_SUPLENCIA",
    id_profesora: alcance.profesora.id,
    tipo_valor: "MONTO_FIJO",
    valor: precioDesdeTexto(valores.valor),
    fecha_vigencia_desde,
  };
}
