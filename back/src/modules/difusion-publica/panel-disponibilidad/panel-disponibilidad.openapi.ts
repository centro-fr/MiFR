import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { respuestaJson } from "../../../shared/openapi/registro.js";
import { horaSchema } from "../../gestion-servicio-entrenamiento/horario/horario.openapi.js";

const horarioPublicoSchema = z
  .object({
    id_horario: z.number().int(),
    dia_semana: z.number().int().min(1).max(6).openapi({ description: "1 = lunes … 6 = sábado" }),
    hora_inicio: horaSchema,
    hora_fin: horaSchema,
    actividad: z.object({
      id_actividad: z.number().int(),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
    }),
    profesora: z.object({ nombre: z.string(), apellido: z.string() }),
    cupo_maximo: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "Cupo del horario o, si no tiene, el de la actividad; null sin cupo" }),
    cupo_disponible: z.number().int().nullable().openapi({ description: "Lugares libres; null sin cupo" }),
    disponibilidad: z.enum(["LIBRE", "CASI_LLENO", "COMPLETO", "SIN_LIMITE"]).openapi({
      description:
        "LIBRE: menos del 60 % ocupado. CASI_LLENO: desde el 60 %. COMPLETO: sin lugares. SIN_LIMITE: sin cupo",
    }),
  })
  .openapi("HorarioPublico");

const panelDisponibilidadSchema = z
  .object({ horarios: z.array(horarioPublicoSchema) })
  .openapi("PanelDisponibilidad");

export function registrarDocumentacionPanelDisponibilidad(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/publico/disponibilidad",
    tags: ["Público"],
    security: [],
    summary: "Panel público de disponibilidad",
    description:
      "No requiere sesión (US-32). Devuelve los horarios vigentes, ordenados por día y hora, con la actividad, " +
      "el nombre de la profesora y los lugares libres. Los lugares ocupados son los de las inscripciones " +
      "activas y las pre-inscripciones con la reserva vigente. No trae ningún dato de alumnos. La respuesta se " +
      "puede reusar durante un minuto (`Cache-Control: public, max-age=60`).",
    responses: {
      200: respuestaJson("Cronograma con la disponibilidad de cada horario", panelDisponibilidadSchema),
    },
  });
}
