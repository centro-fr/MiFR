import { z } from "zod";
import { precioDesdeTexto } from "@/features/planes/schemas/plan";
import type { ConceptoTarifa, TipoValorTarifa } from "@/types/honorarios";
import { fechaCorta } from "@/features/honorarios/utils/formato-honorarios";
import type { RegistrarTarifaBody } from "@/features/honorarios/schemas/honorarios";

// Nueva tarifa de una profesora (US-23). Replica los CHECK de tarifas_honorario del DER para avisar
// antes de enviar: valor > 0, PORCENTAJE <= 100 y HORA_SUPLENCIA sin plan. También las reglas del back
// de que la vigencia no empiece en el pasado (una tarifa no cambia lo ya liquidado) y de que cada
// concepto tenga un solo tipo de valor. El back valida igual.

/** DECIMAL(10,2) de tarifas_honorario.valor. */
const VALOR_MAXIMO = 99_999_999.99;

// "50" o "37,5": como el precio, la coma separa decimales.
const FORMATO_PORCENTAJE = /^\d{1,3}(?:,\d{1,2})?$/;

// Regla de honorarios del Sprint 5: por alumno se paga un porcentaje de lo cobrado y la hora de
// suplencia, un monto fijo. El back rechaza cualquier otra combinación, así que no se elige.
export const TIPO_VALOR_DEL_CONCEPTO: Record<ConceptoTarifa, TipoValorTarifa> = {
  ALUMNO_A_CARGO: "PORCENTAJE",
  HORA_SUPLENCIA: "MONTO_FIJO",
};

export interface TarifaFormValues {
  concepto: ConceptoTarifa;
  /** Texto como lo escribe la persona: "8.000", "8000,50" o "50". */
  valor: string;
  /** AAAA-MM-DD. */
  desde: string;
}

/** Desde cuándo rige la última tarifa de cada concepto: la nueva tiene que empezar después. */
export type UltimoInicioPorConcepto = Record<ConceptoTarifa, string | null>;

function tieneHastaDosDecimales(valor: number): boolean {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

function problemaDelMonto(texto: string): string | null {
  const monto = precioDesdeTexto(texto);
  if (Number.isNaN(monto)) return "Usá la coma para los decimales, por ejemplo 8000 o 8.000,50.";
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

export function valorDesdeTexto(texto: string, tipoValor: TipoValorTarifa): number {
  return tipoValor === "PORCENTAJE" ? porcentajeDesdeTexto(texto.trim()) : precioDesdeTexto(texto);
}

/** `hoy` es AAAA-MM-DD en Argentina: la vigencia puede empezar desde ese día. */
export function crearTarifaFormSchema(ultimoInicio: UltimoInicioPorConcepto, hoy: string) {
  return z
    .object({
      concepto: z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"], { required_error: "Elegí por qué se cobra." }),
      valor: z.string().trim().min(1, "Ingresá el valor de la tarifa."),
      desde: z.string().min(1, "Elegí desde cuándo rige.").date("Ingresá una fecha válida."),
    })
    .superRefine((valores, ctx) => {
      const esPorcentaje = TIPO_VALOR_DEL_CONCEPTO[valores.concepto] === "PORCENTAJE";
      const problema = esPorcentaje ? problemaDelPorcentaje(valores.valor) : problemaDelMonto(valores.valor);
      if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: problema });

      if (valores.desde && valores.desde < hoy) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["desde"], message: "No puede empezar antes de hoy." });
        return;
      }

      // Sin superposiciones: la nueva cierra la anterior, así que tiene que empezar después que ella.
      const inicioAnterior = ultimoInicio[valores.concepto];
      if (inicioAnterior && valores.desde && valores.desde <= inicioAnterior) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["desde"],
          message: `Tiene que ser posterior al ${fechaCorta(inicioAnterior)}, cuando empieza la tarifa actual.`,
        });
      }
    });
}

export function aRegistrarTarifaBody(idProfesora: number, valores: TarifaFormValues): RegistrarTarifaBody {
  const tipoValor = TIPO_VALOR_DEL_CONCEPTO[valores.concepto];
  return {
    id_profesora: idProfesora,
    concepto: valores.concepto,
    id_plan: null,
    tipo_valor: tipoValor,
    valor: valorDesdeTexto(valores.valor, tipoValor),
    fecha_vigencia_desde: valores.desde,
  };
}
