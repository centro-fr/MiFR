import { z } from "zod";
import type { Plan, TipoPlan } from "@/types/plan";

// Contrato de /api/v1/planes (back: plan.schemas.ts y plan.openapi.ts).

// plan_precios.precio es NUMERIC: Prisma lo serializa como texto ("25000").
const precioApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Precio inválido" });

const precioPlanApiSchema = z.object({
  precio: precioApiSchema,
  fecha_vigencia_desde: z.string(),
});

export const precioHistorialApiSchema = z.object({
  id_plan_precio: z.number().int().positive(),
  id_plan: z.number().int().positive(),
  precio: precioApiSchema,
  fecha_vigencia_desde: z.string(),
  fecha_vigencia_hasta: z.string().nullable(),
});

export const tipoPlanSchema = z.enum(["MENSUAL", "CLASE_SUELTA"]);

export const planApiSchema = z.object({
  id_plan: z.number().int(),
  tipo: tipoPlanSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  clases_por_semana: z.number().int().nullable(),
  dias_gracia: z.number().int(),
  id_actividad_exclusiva: z.number().int().nullable(),
  profesora_unica: z.boolean(),
  solo_menores: z.boolean(),
  fecha_baja: z.string().nullable(),
  actividad_exclusiva: z
    .object({ id_actividad: z.number().int(), nombre: z.string(), modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]) })
    .nullable(),
  precio_vigente: precioPlanApiSchema.nullable(),
  precio_programado: precioPlanApiSchema.nullable(),
});

export type PlanApi = z.infer<typeof planApiSchema>;

// ---------- Formulario ----------

// Mismos topes que crearPlanSchema del back (plan.schemas.ts y esquemas-numero.ts).
export const LARGO_MAXIMO_NOMBRE = 40;
export const LARGO_MAXIMO_DESCRIPCION = 255;
export const MAXIMO_DIAS_GRACIA = 365;
const MONTO_MAXIMO = 99_999_999.99;

/** "1" a "7" o "LIBRE" (pase libre, sin tope semanal); "" mientras no se eligió. */
export type FrecuenciaElegida = "" | "LIBRE" | `${1 | 2 | 3 | 4 | 5 | 6 | 7}`;

export interface PlanFormValues {
  nombre: string;
  descripcion: string;
  tipo: TipoPlan | "";
  /** Texto como lo escribe la persona: "28000", "28.000" o "28000,50". */
  precio: string;
  /** "" = cualquier actividad. */
  idActividad: string;
  profesoraUnica: boolean;
  soloMenores: boolean;
  frecuencia: FrecuenciaElegida;
  diasGracia: string;
}

const CARACTER_NO_PERMITIDO = /[\p{Cc}\p{Cf}]/u;
const CARACTER_NO_PERMITIDO_MULTILINEA = /(?![\n\r])[\p{Cc}\p{Cf}]/u;
const TIENE_LETRA = /\p{L}/u;

// "28000", "28.000", "28000,50" o "28.000,50": el punto solo separa miles (de a tres dígitos) y la
// coma, decimales. Así "25000.50" no se lee como $2.500.050: se rechaza y se pide la coma.
const FORMATO_PRECIO = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;

/** "28.000,50" → 28000.5. NaN si el texto no respeta el formato. */
export function precioDesdeTexto(texto: string): number {
  const limpio = texto.trim();
  if (!FORMATO_PRECIO.test(limpio)) return Number.NaN;
  return Number(limpio.replace(/\./g, "").replace(",", "."));
}

function tieneHastaDosDecimales(valor: number): boolean {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre del plan.")
  .max(LARGO_MAXIMO_NOMBRE, `Usá hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`)
  .refine((v) => !CARACTER_NO_PERMITIDO.test(v), "Contiene caracteres no permitidos.")
  .refine((v) => TIENE_LETRA.test(v), "El nombre tiene que tener al menos una letra.");

const descripcionSchema = z
  .string()
  .trim()
  .max(LARGO_MAXIMO_DESCRIPCION, `Usá hasta ${LARGO_MAXIMO_DESCRIPCION} caracteres.`)
  .refine((v) => !CARACTER_NO_PERMITIDO_MULTILINEA.test(v), "Contiene caracteres no permitidos.")
  .refine((v) => v === "" || TIENE_LETRA.test(v), "La descripción tiene que tener al menos una letra.");

/** En la edición no se valida el precio: se cambia con vigencia desde "Actualizar precio" (US-12). */
export function crearPlanFormSchema({ editando }: { editando: boolean }) {
  return z
    .object({
      nombre: nombreSchema,
      descripcion: descripcionSchema,
      tipo: z.enum(["MENSUAL", "CLASE_SUELTA"], { error: "Elegí el tipo de plan." }),
      precio: z.string(),
      idActividad: z.string().regex(/^(\d+)?$/),
      profesoraUnica: z.boolean(),
      soloMenores: z.boolean(),
      frecuencia: z.string(),
      diasGracia: z.string().trim(),
    })
    .superRefine((valores, ctx) => {
      validarPrecio(valores.precio, ctx);
      if (!editando && valores.tipo === "MENSUAL") validarFrecuenciaYGracia(valores, ctx);
    });
}

function problemaDePrecio(texto: string): string | null {
  if (texto.trim() === "") return "Ingresá un precio mayor a $0.";
  if (!FORMATO_PRECIO.test(texto.trim())) return "Usá la coma para los decimales, por ejemplo 28000 o 28.000,50.";
  const precio = precioDesdeTexto(texto);
  if (precio <= 0) return "Ingresá un precio mayor a $0.";
  if (precio > MONTO_MAXIMO) return "El precio es demasiado alto.";
  return tieneHastaDosDecimales(precio) ? null : "Usá como máximo dos decimales.";
}

function validarPrecio(texto: string, ctx: z.RefinementCtx) {
  const problema = problemaDePrecio(texto);
  if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["precio"], message: problema });
}

export function crearActualizacionPrecioSchema({ hoy }: { hoy: string }) {
  return z
    .object({
      precio: z.string().trim().superRefine((texto, ctx) => {
        const problema = problemaDePrecio(texto);
        if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problema });
      }),
      fecha_vigencia_desde: z
        .string()
        .min(1, "Elegí una fecha de vigencia.")
        .date("Ingresá una fecha válida.")
        .refine((fecha) => fecha >= hoy, "La fecha de vigencia no puede ser anterior a hoy."),
    })
    .transform(({ precio, fecha_vigencia_desde }) => ({
      precio: precioDesdeTexto(precio),
      fecha_vigencia_desde,
    }));
}

export type RegistrarPrecioBody = z.infer<ReturnType<typeof crearActualizacionPrecioSchema>>;

function validarFrecuenciaYGracia({ frecuencia, diasGracia }: { frecuencia: string; diasGracia: string }, ctx: z.RefinementCtx) {
  if (!/^(LIBRE|[1-7])$/.test(frecuencia)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["frecuencia"], message: "Indicá la frecuencia semanal del plan." });
  }
  if (!/^\d{1,3}$/.test(diasGracia) || Number(diasGracia) > MAXIMO_DIAS_GRACIA) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["diasGracia"],
      message: `Ingresá un número de 0 a ${MAXIMO_DIAS_GRACIA}.`,
    });
  }
}

export type ErroresPlanForm = Partial<Record<keyof PlanFormValues, string>>;

export function erroresDe(error: z.ZodError): ErroresPlanForm {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Record<string, string[] | undefined> };
  return Object.fromEntries(Object.entries(fieldErrors).map(([campo, mensajes]) => [campo, mensajes?.[0]]));
}

// ---------- Cuerpos de la API ----------

/** Los campos del plan que se pueden cambiar con PATCH /planes/:id (actualizarPlanSchema). */
export interface DatosEditablesBody {
  nombre: string;
  descripcion: string | null;
  clases_por_semana: number | null;
  dias_gracia: number;
  id_actividad_exclusiva: number | null;
  profesora_unica: boolean;
  solo_menores: boolean;
}

export type ActualizarPlanBody = Partial<DatosEditablesBody>;

export interface CrearPlanBody extends DatosEditablesBody {
  tipo: TipoPlan;
  precio: number;
}

/** Valores ya validados, como los guarda el back. Una clase suelta no lleva frecuencia ni gracia. */
export function aDatosEditables(valores: PlanFormValues): DatosEditablesBody {
  const esMensual = valores.tipo === "MENSUAL";
  return {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim() || null,
    clases_por_semana: esMensual && valores.frecuencia !== "LIBRE" ? Number(valores.frecuencia) : null,
    dias_gracia: esMensual ? Number(valores.diasGracia) : 0,
    id_actividad_exclusiva: valores.idActividad ? Number(valores.idActividad) : null,
    profesora_unica: valores.profesoraUnica,
    solo_menores: valores.soloMenores,
  };
}

export function aCuerpoCreacion(valores: PlanFormValues): CrearPlanBody {
  return { ...aDatosEditables(valores), tipo: valores.tipo as TipoPlan, precio: precioDesdeTexto(valores.precio) };
}

function datosEditablesDe(plan: Plan): DatosEditablesBody {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion,
    clases_por_semana: plan.clasesPorSemana,
    dias_gracia: plan.diasGracia,
    id_actividad_exclusiva: plan.actividad ? Number(plan.actividad.id) : null,
    profesora_unica: plan.profesoraUnica,
    solo_menores: plan.soloMenores,
  };
}

/** Solo lo que cambió: el back exige al menos un campo y así no pisa datos que no se tocaron. */
export function aCuerpoActualizacion(plan: Plan, valores: PlanFormValues): ActualizarPlanBody {
  const antes = datosEditablesDe(plan);
  const despues = aDatosEditables(valores);
  const campos = Object.keys(despues) as (keyof DatosEditablesBody)[];
  return Object.fromEntries(
    campos
      .filter((campo) => campo !== "clases_por_semana" && campo !== "dias_gracia" && antes[campo] !== despues[campo])
      .map((campo) => [campo, despues[campo]])
  );
}

export function valoresDelPlan(plan: Plan): PlanFormValues {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? "",
    tipo: plan.tipo,
    // Con separador de miles ("28.000"): precioDesdeTexto lo vuelve a leer igual.
    precio: plan.precioVigente === null ? "" : plan.precioVigente.toLocaleString("es-AR"),
    idActividad: plan.actividad?.id ?? "",
    profesoraUnica: plan.profesoraUnica,
    soloMenores: plan.soloMenores,
    frecuencia: plan.tipo === "CLASE_SUELTA" ? "" : plan.clasesPorSemana === null ? "LIBRE" : (String(plan.clasesPorSemana) as FrecuenciaElegida),
    diasGracia: String(plan.diasGracia),
  };
}

export const VALORES_PLAN_NUEVO: PlanFormValues = {
  nombre: "",
  descripcion: "",
  tipo: "MENSUAL",
  precio: "",
  idActividad: "",
  profesoraUnica: false,
  soloMenores: false,
  frecuencia: "",
  // El mismo valor por defecto que crearPlanSchema del back.
  diasGracia: "0",
};
