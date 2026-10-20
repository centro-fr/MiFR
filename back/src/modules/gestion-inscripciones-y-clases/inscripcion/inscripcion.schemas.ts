import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { fechaSchema as fecha } from "../../../shared/utils/esquemas-fecha.js";
import { medidaCorporalSchema } from "../../../shared/utils/esquemas-numero.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";
import { LIMITE_MAXIMO, paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";
import { crearAlumnoSchema } from "../../gestion-personas/alumno/alumno.schemas.js";

// El tope es el máximo de clases por semana de un plan (ck_planes_x1): más horarios no entran en
// ninguno, y sin tope una lista enorme llegaba hasta las consultas de cupo.
const MAXIMO_HORARIOS = 7;

const ids_horarios = z
  .array(idSchema)
  .min(1, "Debe seleccionar al menos un horario")
  .max(MAXIMO_HORARIOS, `No se pueden elegir más de ${MAXIMO_HORARIOS} horarios`)
  .refine((ids) => new Set(ids).size === ids.length, "No se puede repetir un horario");

const datosDePlanYHorarios = {
  id_plan: idSchema,
  id_profesora: idSchema,
  ids_horarios,
  sin_cargo: z.boolean().default(false),
  fecha_fin_estimado: fecha.nullable().optional(),
  observaciones: textoOpcionalSchema(500, { multilinea: true }).optional(),
};

// US-05: obligatorias si alguna actividad de los horarios tiene requiere_medidas (lo decide el service).
const medidas = z.object({
  peso_kg: medidaCorporalSchema("El peso", "kg", 2, 400),
  talla_cm: medidaCorporalSchema("La talla", "cm", 40, 250),
});

export const crearInscripcionSchema = z.object({
  id_alumno: idSchema,
  ...datosDePlanYHorarios,
  fecha_inicio: fecha.optional(),
  medidas: medidas.optional(),
});

// US-05: el alumno nuevo y su pre-inscripción en un solo pedido, para que no quede uno sin la otra.
export const preinscribirSchema = z.object({
  alumno: crearAlumnoSchema,
  inscripcion: crearInscripcionSchema.omit({ id_alumno: true }),
});

export const reactivarAlumnoSchema = z.object(datosDePlanYHorarios);

export const cambiarPlanSchema = z.object(datosDePlanYHorarios);

export const actualizarHorariosSchema = z.object({ ids_horarios });

// CAMBIO_PLAN no se acepta: lo pone el cambio de plan, y un alumno que se va no cambia de plan.
// El detalle explica un motivo OTRO (ck_inscripciones_x2); un texto vacío llega como null y no cuenta.
export const darDeBajaAlumnoSchema = z
  .object({
    motivo_baja: z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "OTRO"]),
    detalle_baja: textoOpcionalSchema(200, { multilinea: true }).optional(),
  })
  .refine((baja) => baja.detalle_baja == null || baja.motivo_baja === "OTRO", {
    message: "El detalle solo se carga con el motivo OTRO",
    path: ["detalle_baja"],
  });

export const listarInscripcionesQuerySchema = z.object({
  id_alumno: idDesdeTextoSchema.optional(),
  id_plan: idDesdeTextoSchema.optional(),
  id_profesora: idDesdeTextoSchema.optional(),
  id_actividad: idDesdeTextoSchema.optional(),
  estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]).optional(),
  ...paginacionSchema(LIMITE_MAXIMO),
});

export const inscripcionIdParamSchema = z.object({ id: idDesdeTextoSchema });
export const alumnoIdParamSchema = z.object({ id: idDesdeTextoSchema });

export type CrearInscripcionInput = z.infer<typeof crearInscripcionSchema>;
export type PreinscribirInput = z.infer<typeof preinscribirSchema>;
export type ReactivarAlumnoInput = z.infer<typeof reactivarAlumnoSchema>;
export type CambiarPlanInput = z.infer<typeof cambiarPlanSchema>;
export type ActualizarHorariosInput = z.infer<typeof actualizarHorariosSchema>;
export type DarDeBajaAlumnoInput = z.infer<typeof darDeBajaAlumnoSchema>;
export type ListarInscripcionesQuery = z.infer<typeof listarInscripcionesQuerySchema>;
