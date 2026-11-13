import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import { respuestaJson } from "../../../shared/openapi/registro.js";

const actividadPublicaSchema = z
  .object({
    id_actividad: z.number().int(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
    dias: z
      .array(z.number().int().min(1).max(6))
      .openapi({ description: "Días con alguna clase, en orden: 1 = lunes … 6 = sábado" }),
    clases_por_semana: z
      .number()
      .int()
      .openapi({ description: "Cantidad de horarios vigentes de la actividad" }),
  })
  .openapi("ActividadPublica");

const actividadesPublicasSchema = z
  .object({ actividades: z.array(actividadPublicaSchema) })
  .openapi("ActividadesPublicas");

export function registrarDocumentacionPanelDisponibilidad(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/publico/actividades",
    tags: ["Público"],
    security: [],
    summary: "Actividades del centro",
    description:
      "No requiere sesión (US-32). Devuelve las actividades que tienen algún horario vigente, con los días en " +
      "que se dan y cuántas clases tienen por semana. No trae horas, profesoras, cupos ni datos de alumnos: la " +
      "grilla de horarios exige sesión (`GET /horarios`). La respuesta se puede reusar durante un minuto " +
      "(`Cache-Control: public, max-age=60`).",
    responses: {
      200: respuestaJson("Actividades con clases vigentes", actividadesPublicasSchema),
    },
  });
}
