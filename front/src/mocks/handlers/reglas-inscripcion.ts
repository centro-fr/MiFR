import { z } from "zod";
import { db, siguienteId } from "@/mocks/db";
import { hoyEnArgentina, precioVigenteDePlan } from "@/mocks/precios";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import { errorApi } from "@/mocks/handlers/respuestas";
import { reservaDe } from "@/mocks/handlers/serializar";

// Reglas que el back aplica al inscribir, reactivar o cambiar plan y horarios
// (validarHorarios de inscripcion.service.ts y el control de cupo de su repositorio).

// Mismo tope que MAXIMO_HORARIOS en inscripcion.schemas.ts.
export const idsHorariosSchema = z
  .array(z.number().int().positive())
  .min(1)
  .max(7)
  .refine((ids) => new Set(ids).size === ids.length);

export const planYHorariosSchema = z.object({
  id_plan: z.number().int().positive(),
  id_profesora: z.number().int().positive(),
  ids_horarios: idsHorariosSchema,
  sin_cargo: z.boolean().default(false),
  observaciones: z.string().trim().max(500).nullable().optional(),
});

export type PlanYHorarios = z.infer<typeof planYHorariosSchema>;

// Ocupan lugar las activas y las pre-inscripciones con la reserva vigente (US-07).
function ocupaLugar(inscripcion: InscripcionMock): boolean {
  if (inscripcion.estado === "ACTIVA") return true;
  return inscripcion.estado === "PREINSCRIPTA" && reservaDe(inscripcion)?.vencida === false;
}

function ocupados(idHorario: number, idInscripcionPropia?: number): number {
  return db.inscripciones.filter(
    (i) => i.id_inscripcion !== idInscripcionPropia && ocupaLugar(i) && i.ids_horarios.includes(idHorario),
  ).length;
}

function cupoDe(idHorario: number): number | null {
  const horario = db.horarios.find((h) => h.id_horario === idHorario)!;
  return horario.cupo_maximo ?? db.actividades.find((a) => a.id_actividad === horario.id_actividad)?.cupo_maximo ?? null;
}

/** La respuesta de error del back, o null si el plan, la profesora y los horarios son válidos. */
export function errorDeHorarios(
  { id_plan, id_profesora, ids_horarios }: Pick<PlanYHorarios, "id_plan" | "id_profesora" | "ids_horarios">,
  idInscripcionPropia?: number,
) {
  const plan = db.planes.find((p) => p.id_plan === id_plan && p.fecha_baja === null);
  if (!plan) return errorApi(409, "CONFLICT", "El plan no existe o está dado de baja");
  if (!db.profesoras.some((p) => p.id_profesora === id_profesora && p.fecha_baja === null)) {
    return errorApi(404, "NOT_FOUND", "Profesora no encontrada, inactiva o sin el rol PROFESORA");
  }
  const horarios = db.horarios.filter((h) => ids_horarios.includes(h.id_horario) && h.fecha_baja === null);
  if (horarios.length !== ids_horarios.length) {
    return errorApi(409, "CONFLICT", "Uno o más horarios no existen o están dados de baja");
  }
  if (new Set(horarios.map((h) => h.id_profesora)).size > 1) {
    return errorApi(400, "VALIDATION_ERROR", "Todos los horarios deben pertenecer a una misma profesora");
  }
  if (plan.profesora_unica && horarios.some((h) => h.id_profesora !== id_profesora)) {
    return errorApi(400, "VALIDATION_ERROR", "El plan exige que los horarios sean de la profesora a cargo");
  }
  if (plan.id_actividad_exclusiva !== null && horarios.some((h) => h.id_actividad !== plan.id_actividad_exclusiva)) {
    return errorApi(400, "VALIDATION_ERROR", "Los horarios deben corresponder a la actividad exclusiva del plan");
  }
  if (plan.clases_por_semana !== null && ids_horarios.length > plan.clases_por_semana) {
    return errorApi(400, "VALIDATION_ERROR", "La cantidad de horarios supera las clases por semana del plan");
  }
  const sinCupo = ids_horarios.some((id) => {
    const cupo = cupoDe(id);
    return cupo !== null && ocupados(id, idInscripcionPropia) >= cupo;
  });
  return sinCupo ? errorApi(409, "CONFLICT", "No hay cupo disponible en uno o más horarios") : null;
}

/** Guarda una inscripción nueva con el precio vigente del plan. */
export function guardarInscripcion(
  idAlumno: number,
  datos: PlanYHorarios,
  estado: InscripcionMock["estado"],
  fechaInicio = hoyEnArgentina(),
): InscripcionMock {
  const precio = precioVigenteDePlan(datos.id_plan)!;
  const inscripcion: InscripcionMock = {
    id_inscripcion: siguienteId(db.inscripciones.map((i) => i.id_inscripcion)),
    id_alumno: idAlumno,
    id_plan: datos.id_plan,
    id_plan_precio: precio.id_plan_precio,
    id_profesora: datos.id_profesora,
    id_promocion: null,
    sin_cargo: datos.sin_cargo,
    fecha_inicio: `${fechaInicio}T00:00:00.000Z`,
    fecha_fin_estimado: null,
    estado,
    motivo_baja: null,
    detalle_baja: null,
    observaciones: datos.observaciones ?? null,
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
    ids_horarios: datos.ids_horarios,
  };
  db.inscripciones.push(inscripcion);
  return inscripcion;
}

// Como listarVigentesPorAlumno del back: la más reciente primero.
export function vigentesDe(idAlumno: number): InscripcionMock[] {
  return db.inscripciones
    .filter((i) => i.id_alumno === idAlumno && i.estado !== "BAJA")
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio) || b.id_inscripcion - a.id_inscripcion);
}
