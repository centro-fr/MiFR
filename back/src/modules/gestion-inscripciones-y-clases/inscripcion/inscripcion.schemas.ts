import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";

const fecha = z
  .string({ invalid_type_error: "La fecha debe tener formato AAAA-MM-DD" })
  .date("La fecha debe tener formato AAAA-MM-DD")
  .transform((valor) => new Date(`${valor}T00:00:00Z`));

const ids_horarios = z
  .array(idSchema)
  .min(1, "Debe seleccionar al menos un horario")
  .refine((ids) => new Set(ids).size === ids.length, "No se puede repetir un horario");

const datosDePlanYHorarios = {
  id_plan: idSchema,
  id_profesora: idSchema,
  ids_horarios,
  sin_cargo: z.boolean().default(false),
  fecha_fin_estimado: fecha.nullable().optional(),
  observaciones: textoOpcionalSchema(500, { multilinea: true }).optional(),
};

export const crearInscripcionSchema = z.object({
  id_alumno: idSchema,
  ...datosDePlanYHorarios,
  fecha_inicio: fecha.optional(),
});

export const reactivarAlumnoSchema = z.object(datosDePlanYHorarios);

export const cambiarPlanSchema = z.object(datosDePlanYHorarios);

export const actualizarHorariosSchema = z.object({ ids_horarios });

export const darDeBajaAlumnoSchema = z.object({
  motivo_baja: z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "CAMBIO_PLAN", "OTRO"]),
});

export const listarInscripcionesQuerySchema = z.object({
  id_alumno: idDesdeTextoSchema.optional(),
  id_plan: idDesdeTextoSchema.optional(),
  id_profesora: idDesdeTextoSchema.optional(),
  id_actividad: idDesdeTextoSchema.optional(),
  estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]).optional(),
});

export const inscripcionIdParamSchema = z.object({ id: idDesdeTextoSchema });
export const alumnoIdParamSchema = z.object({ id: idDesdeTextoSchema });

export type CrearInscripcionInput = z.infer<typeof crearInscripcionSchema>;
export type ReactivarAlumnoInput = z.infer<typeof reactivarAlumnoSchema>;
export type CambiarPlanInput = z.infer<typeof cambiarPlanSchema>;
export type ActualizarHorariosInput = z.infer<typeof actualizarHorariosSchema>;
export type DarDeBajaAlumnoInput = z.infer<typeof darDeBajaAlumnoSchema>;
export type ListarInscripcionesQuery = z.infer<typeof listarInscripcionesQuerySchema>;
