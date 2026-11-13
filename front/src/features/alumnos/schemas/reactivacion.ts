import { z } from "zod";

// Contrato de la reactivación (US-08). Back: plan.openapi.ts, inscripcion.openapi.ts
// (POST /alumnos/:id/reactivar) y reactivarAlumnoSchema de inscripcion.schemas.ts.

// plan_precios.precio es NUMERIC: Prisma lo serializa como texto ("25000").
const precioApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Precio inválido" });

// Plan del back, solo con lo que usa el formulario para elegir y validar horarios.
export const planApiSchema = z.object({
  id_plan: z.number().int(),
  nombre: z.string(),
  clases_por_semana: z.number().int().nullable(),
  id_actividad_exclusiva: z.number().int().nullable(),
  precio_vigente: z.object({ precio: precioApiSchema }).nullable(),
});

export type PlanApi = z.infer<typeof planApiSchema>;

// Inscripción dada de baja: de ahí salen el plan, la profesora y los horarios que se proponen.
export const inscripcionAnteriorApiSchema = z.object({
  id_plan: z.number().int(),
  id_profesora: z.number().int(),
  horarios: z.array(z.object({ id_horario: z.number().int() })),
});

// Mismo tope que el back (MAXIMO_HORARIOS en inscripcion.schemas.ts).
const MAXIMO_HORARIOS = 7;

// El back exige enteros positivos (idSchema): solo dígitos para no mandar NaN.
const idSeleccionado = (mensaje: string) => z.string().regex(/^\d+$/, mensaje);

/** Valida el formulario. Las clases por semana dependen del plan elegido, por eso es una fábrica. */
export function crearReactivacionSchema(clasesPorSemana: number | null) {
  const tope = Math.min(clasesPorSemana ?? MAXIMO_HORARIOS, MAXIMO_HORARIOS);
  const requeridas = clasesPorSemana ?? 1;
  return z.object({
    idPlan: idSeleccionado("Elegí el plan."),
    idProfesora: idSeleccionado("Elegí la profesora."),
    idsHorarios: z
      .array(z.string())
      .min(requeridas, `Elegí exactamente ${requeridas} ${requeridas === 1 ? "horario" : "horarios"} para este plan.`)
      .max(tope, `Elegí exactamente ${tope} ${tope === 1 ? "horario" : "horarios"} para este plan.`),
  });
}

export type ReactivacionFormValues = z.input<ReturnType<typeof crearReactivacionSchema>>;

// Cuerpo de POST /alumnos/:id/reactivar.
export interface ReactivarAlumnoBody {
  id_plan: number;
  id_profesora: number;
  ids_horarios: number[];
}

export function aCuerpoReactivacion(valores: ReactivacionFormValues): ReactivarAlumnoBody {
  return {
    id_plan: Number(valores.idPlan),
    id_profesora: Number(valores.idProfesora),
    ids_horarios: valores.idsHorarios.map(Number),
  };
}
