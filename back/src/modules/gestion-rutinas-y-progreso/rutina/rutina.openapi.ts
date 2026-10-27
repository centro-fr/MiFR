import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { alumnoRutinasParamsSchema, crearRutinaSchema } from "./rutina.schemas.js";

const ejercicioSchema = z.object({
  nombre: z.string(),
  series: z.number().int(),
  repeticiones: z.string().openapi({ description: 'Texto: admite "12", "8-10" o "30 s"' }),
  notas: z.string().nullable(),
});

const rutinaSchema = z
  .object({
    id_rutina: z.number().int(),
    id_alumno: z.number().int(),
    id_profesora: z.number().int().openapi({ description: "La profesora que la cargó" }),
    nombre: z.string(),
    fecha_desde: fechaSchema,
    fecha_hasta: fechaSchema.nullable(),
    contenido: z.object({
      dias: z.array(z.object({ nombre: z.string(), ejercicios: z.array(ejercicioSchema) })),
    }),
    observaciones: z.string().nullable(),
    activa: z.boolean().openapi({ description: "true en la rutina vigente; las anteriores quedan en el historial" }),
  })
  .openapi("Rutina");

const quienVe =
  "Requiere RUTINAS_VER (propietaria y profesoras) o RUTINAS_VER_PROPIAS (alumno y tutor). La propietaria ve a " +
  "cualquier alumno; la profesora, a los que tiene a cargo; el alumno, la suya, y el tutor, la de su menor a cargo. " +
  "Un alumno ajeno o inexistente responde 403 por igual, salvo a la propietaria, que recibe 404.";

export function registrarDocumentacionRutina(registro: OpenAPIRegistry): void {
  const tags = ["Rutinas"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "post",
    path: "/rutinas",
    tags,
    security,
    summary: "Cargar la rutina de un alumno (US-27)",
    description:
      "Requiere RUTINAS_EDITAR. La propietaria carga a cualquier alumno y la profesora, solo a los que tiene a " +
      "cargo (403 si no). La rutina queda a nombre de la profesora que la carga; la propietaria indica " +
      "id_profesora, salvo que ella también sea profesora (400 si no indica cuál o no existe). La nueva queda " +
      "vigente y la anterior pasa al historial con fecha_hasta el día previo al inicio de la nueva. Un alumno " +
      "tiene una sola rutina vigente.",
    request: {
      body: cuerpoJson(
        crearRutinaSchema.openapi("CrearRutina", {
          example: {
            id_alumno: 5,
            nombre: "Adaptación Fuerza - Mes 1",
            fecha_desde: "2026-11-01",
            contenido: {
              dias: [
                {
                  nombre: "Día 1 - Tren inferior",
                  ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10", notas: "Con barra libre" }],
                },
              ],
            },
          },
        }),
      ),
    },
    responses: {
      201: respuestaJson("Rutina cargada y vigente", rutinaSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/alumnos/{id}/rutinas",
    tags,
    security,
    summary: "Historial de rutinas de un alumno (US-28)",
    description: `${quienVe} Devuelve de la más reciente a la más antigua, con la vigente primero; lista vacía si nunca tuvo una.`,
    request: { params: alumnoRutinasParamsSchema },
    responses: {
      200: respuestaJson("Historial de rutinas", z.array(rutinaSchema)),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/alumnos/{id}/rutinas/vigente",
    tags,
    security,
    summary: "Rutina vigente de un alumno (US-28)",
    description: `${quienVe} Si todavía no tiene rutina responde 200 con null, no 404: el portal lo muestra como estado vacío.`,
    request: { params: alumnoRutinasParamsSchema },
    responses: {
      200: respuestaJson("La rutina vigente, o null si no tiene", rutinaSchema.nullable()),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
