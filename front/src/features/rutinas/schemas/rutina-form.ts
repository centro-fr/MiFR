import { z } from "zod";
import type { CrearRutinaBody } from "@/features/rutinas/schemas/rutinas";
import { problemaDelTexto, textoOpcional } from "@/features/rutinas/schemas/texto-libre";
import type { Rutina } from "@/types/rutinas";

// Nueva rutina de un alumno (US-27). Replica crearRutinaSchema del back: de 1 a 7 días, de 1 a 30
// ejercicios por día, series de 1 a 20 y la fecha de fin no anterior a la de inicio.

export const MAXIMO_DIAS = 7;
export const MAXIMO_EJERCICIOS = 30;
const SERIES_MAXIMO = 20;

const LARGO = { nombre: 100, dia: 60, ejercicio: 80, repeticiones: 30, notas: 200, observaciones: 500 } as const;

/** Todos los campos como texto, como los escribe la persona: se convierten al armar el pedido. */
export interface EjercicioFormValues {
  nombre: string;
  series: string;
  repeticiones: string;
  notas: string;
}

export interface DiaFormValues {
  nombre: string;
  ejercicios: EjercicioFormValues[];
}

export interface RutinaFormValues {
  nombre: string;
  /** AAAA-MM-DD. */
  desde: string;
  /** AAAA-MM-DD o vacío si no tiene fecha de fin. */
  hasta: string;
  dias: DiaFormValues[];
  observaciones: string;
}

export function ejercicioVacio(): EjercicioFormValues {
  return { nombre: "", series: "", repeticiones: "", notas: "" };
}

export function diaVacio(numero: number): DiaFormValues {
  return { nombre: `Día ${numero}`, ejercicios: [ejercicioVacio()] };
}

/**
 * El back no edita rutinas: cambiarla es cargar una nueva. Por eso se parte de la vigente (si hay) y
 * la persona solo toca lo que cambia. Rige desde hoy, porque la anterior se cierra el día previo.
 */
export function valoresIniciales(hoy: string, vigente: Rutina | null): RutinaFormValues {
  if (!vigente) return { nombre: "", desde: hoy, hasta: "", dias: [diaVacio(1)], observaciones: "" };
  return {
    nombre: vigente.nombre,
    desde: hoy,
    hasta: "",
    dias: vigente.dias.map((dia) => ({
      nombre: dia.nombre,
      ejercicios: dia.ejercicios.map((ejercicio) => ({
        nombre: ejercicio.nombre,
        series: String(ejercicio.series),
        repeticiones: ejercicio.repeticiones,
        notas: ejercicio.notas ?? "",
      })),
    })),
    observaciones: vigente.observaciones ?? "",
  };
}

type Problema = [path: (string | number)[], mensaje: string];

function problemaObligatorio(texto: string, faltante: string, opciones: Parameters<typeof problemaDelTexto>[1]): string | null {
  const limpio = texto.trim();
  return limpio === "" ? faltante : problemaDelTexto(limpio, opciones);
}

function problemaOpcional(texto: string, opciones: Parameters<typeof problemaDelTexto>[1]): string | null {
  const limpio = texto.trim();
  return limpio === "" ? null : problemaDelTexto(limpio, opciones);
}

function problemaDeLasSeries(texto: string): string | null {
  const series = /^\d{1,2}$/.test(texto.trim()) ? Number(texto.trim()) : Number.NaN;
  return series >= 1 && series <= SERIES_MAXIMO ? null : `De 1 a ${SERIES_MAXIMO}.`;
}

function problemasDelEjercicio(ejercicio: EjercicioFormValues, base: (string | number)[]): Problema[] {
  const problemas: [string, string | null][] = [
    ["nombre", problemaObligatorio(ejercicio.nombre, "Escribí el ejercicio.", { maximo: LARGO.ejercicio })],
    ["series", problemaDeLasSeries(ejercicio.series)],
    ["repeticiones", problemaObligatorio(ejercicio.repeticiones, "Escribí las repeticiones.", { maximo: LARGO.repeticiones, exigeLetra: false })],
    ["notas", problemaOpcional(ejercicio.notas, { maximo: LARGO.notas, multilinea: true })],
  ];
  return problemas.filter((par): par is [string, string] => par[1] !== null).map(([campo, mensaje]) => [[...base, campo], mensaje]);
}

function problemasDeLosDias(dias: DiaFormValues[]): Problema[] {
  return dias.flatMap((dia, indiceDia) => {
    const problemaNombre = problemaObligatorio(dia.nombre, "Ponele un nombre al día.", { maximo: LARGO.dia });
    return [
      ...(problemaNombre ? [[["dias", indiceDia, "nombre"], problemaNombre] as Problema] : []),
      ...dia.ejercicios.flatMap((ejercicio, indice) => problemasDelEjercicio(ejercicio, ["dias", indiceDia, "ejercicios", indice])),
    ];
  });
}

function problemasDeLaRutina(valores: RutinaFormValues): Problema[] {
  const problemas: Problema[] = [];
  const nombre = problemaObligatorio(valores.nombre, "Ponele un nombre a la rutina.", { maximo: LARGO.nombre });
  if (nombre) problemas.push([["nombre"], nombre]);
  if (valores.hasta && valores.desde && valores.hasta < valores.desde) {
    problemas.push([["hasta"], "No puede ser anterior al inicio."]);
  }
  const observaciones = problemaOpcional(valores.observaciones, { maximo: LARGO.observaciones, multilinea: true });
  if (observaciones) problemas.push([["observaciones"], observaciones]);
  return [...problemas, ...problemasDeLosDias(valores.dias)];
}

const ejercicioSchema = z.object({ nombre: z.string(), series: z.string(), repeticiones: z.string(), notas: z.string() });

export const rutinaFormSchema = z
  .object({
    nombre: z.string(),
    desde: z.string().min(1, "Elegí desde cuándo rige.").date("Ingresá una fecha válida."),
    hasta: z.union([z.literal(""), z.string().date("Ingresá una fecha válida.")]),
    dias: z
      .array(z.object({ nombre: z.string(), ejercicios: z.array(ejercicioSchema).min(1).max(MAXIMO_EJERCICIOS) }))
      .min(1)
      .max(MAXIMO_DIAS),
    observaciones: z.string(),
  })
  .superRefine((valores, ctx) => {
    for (const [path, message] of problemasDeLaRutina(valores)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    }
  });

export function aCrearRutinaBody(idAlumno: number, valores: RutinaFormValues): CrearRutinaBody {
  return {
    id_alumno: idAlumno,
    nombre: valores.nombre.trim(),
    fecha_desde: valores.desde,
    fecha_hasta: valores.hasta || null,
    contenido: {
      dias: valores.dias.map((dia) => ({
        nombre: dia.nombre.trim(),
        ejercicios: dia.ejercicios.map((ejercicio) => ({
          nombre: ejercicio.nombre.trim(),
          series: Number(ejercicio.series.trim()),
          repeticiones: ejercicio.repeticiones.trim(),
          notas: textoOpcional(ejercicio.notas),
        })),
      })),
    },
    observaciones: textoOpcional(valores.observaciones),
  };
}
