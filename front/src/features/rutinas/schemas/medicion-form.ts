import { z } from "zod";
import { CODIGOS_MEDIDA, MEDIDAS, type CodigoMedida } from "@/features/rutinas/schemas/medidas";
import type { RegistrarMedicionBody } from "@/features/rutinas/schemas/rutinas";
import { problemaDelTexto, textoOpcional } from "@/features/rutinas/schemas/texto-libre";

// Nueva medición de un alumno (US-27). Replica registrarProgresoSchema del back: al menos una medida,
// cada una dentro de su rango y con hasta dos decimales, y la fecha no puede ser futura.

const OBSERVACIONES_MAXIMO = 500;

// "62,4" o "62.4": en las medidas no hay miles, así que el punto también es decimal.
const FORMATO_MEDIDA = /^\d{1,3}(?:[.,]\d{1,2})?$/;

export type TextosDeMedidas = Record<CodigoMedida, string>;

export interface MedicionFormValues {
  /** AAAA-MM-DD. */
  fecha: string;
  /** Texto como lo escribe la persona; vacío si esa medida no se tomó. */
  medidas: TextosDeMedidas;
  observaciones: string;
}

export const MEDIDAS_VACIAS = Object.fromEntries(CODIGOS_MEDIDA.map((codigo) => [codigo, ""])) as TextosDeMedidas;

function valorDesdeTexto(texto: string): number {
  return FORMATO_MEDIDA.test(texto) ? Number(texto.replace(",", ".")) : Number.NaN;
}

function problemaDeLaMedida(codigo: CodigoMedida, texto: string): string | null {
  const { etiqueta, unidad, minimo, maximo } = MEDIDAS[codigo];
  const valor = valorDesdeTexto(texto);
  if (Number.isNaN(valor)) return "Ingresá un número con hasta dos decimales, por ejemplo 62,4.";
  return valor < minimo || valor > maximo ? `${etiqueta}: entre ${minimo} y ${maximo} ${unidad}.` : null;
}

function medidasCargadas(textos: TextosDeMedidas): [CodigoMedida, string][] {
  return CODIGOS_MEDIDA.map((codigo) => [codigo, textos[codigo].trim()] as [CodigoMedida, string]).filter(([, texto]) => texto !== "");
}

const medidasSchema = z.object(
  Object.fromEntries(CODIGOS_MEDIDA.map((codigo) => [codigo, z.string()])) as Record<CodigoMedida, z.ZodString>,
);

/** `hoy` es AAAA-MM-DD en Argentina: la medición puede ser de hoy o de antes. */
export function crearMedicionFormSchema(hoy: string) {
  return z
    .object({
      fecha: z.string().min(1, "Elegí la fecha de la medición.").date("Ingresá una fecha válida."),
      medidas: medidasSchema,
      observaciones: z.string(),
    })
    .superRefine((valores, ctx) => {
      if (valores.fecha > hoy) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fecha"], message: "No puede ser una fecha futura." });
      }

      const cargadas = medidasCargadas(valores.medidas);
      if (cargadas.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["medidas"], message: "Cargá al menos una medida." });
      }
      for (const [codigo, texto] of cargadas) {
        const problema = problemaDeLaMedida(codigo, texto);
        if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["medidas", codigo], message: problema });
      }

      const observaciones = valores.observaciones.trim();
      const problema = observaciones && problemaDelTexto(observaciones, { maximo: OBSERVACIONES_MAXIMO, multilinea: true });
      if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["observaciones"], message: problema });
    });
}

export function aRegistrarMedicionBody(idAlumno: number, valores: MedicionFormValues): RegistrarMedicionBody {
  return {
    id_alumno: idAlumno,
    fecha: valores.fecha,
    observaciones: textoOpcional(valores.observaciones),
    medidas: medidasCargadas(valores.medidas).map(([codigo, texto]) => ({ codigo, valor: valorDesdeTexto(texto) })),
  };
}
