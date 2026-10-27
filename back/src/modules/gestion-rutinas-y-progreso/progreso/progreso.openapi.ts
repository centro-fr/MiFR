import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { CODIGOS_MEDIDA, MEDIDAS } from "./medida.catalogo.js";
import { alumnoProgresoParamsSchema, registrarProgresoSchema } from "./progreso.schemas.js";

const registroSchema = z
  .object({
    id_registro: z.number().int(),
    id_alumno: z.number().int(),
    id_profesora: z.number().int().openapi({ description: "La profesora que cargó la medición" }),
    fecha: fechaSchema,
    observaciones: z.string().nullable(),
    medidas: z.array(
      z.object({
        codigo: z.enum(CODIGOS_MEDIDA),
        unidad: z.string().openapi({ example: "kg" }),
        valor: z.number().openapi({ example: 62.5 }),
      }),
    ),
  })
  .openapi("RegistroDeProgreso");

const rangos = Object.entries(MEDIDAS)
  .map(([codigo, { unidad, minimo, maximo }]) => `${codigo} (${minimo} a ${maximo} ${unidad})`)
  .join(", ");

export function registrarDocumentacionProgreso(registro: OpenAPIRegistry): void {
  const tags = ["Progreso"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "post",
    path: "/progreso",
    tags,
    security,
    summary: "Registrar la evolución física de un alumno (US-27)",
    description:
      "Requiere RUTINAS_EDITAR. La propietaria registra a cualquier alumno y la profesora, solo a los que tiene a " +
      "cargo (403 si no); la medición queda a nombre de la profesora, y la propietaria indica id_profesora salvo " +
      "que ella también lo sea. Todas las medidas se guardan juntas o no se guarda ninguna. Cada valor tiene que " +
      "ser mayor a 0, con hasta 2 decimales y dentro del rango de su medida: " +
      `${rangos}. La unidad la fija el sistema. No se repite una medida en el mismo registro. Sin fecha se ` +
      "registra la de hoy; una fecha futura responde 400.",
    request: {
      body: cuerpoJson(
        registrarProgresoSchema.openapi("RegistrarProgreso", {
          example: {
            id_alumno: 5,
            fecha: "2026-11-02",
            observaciones: "Control mensual",
            medidas: [
              { codigo: "PESO", valor: 62.5 },
              { codigo: "CINTURA", valor: 70 },
            ],
          },
        }),
      ),
    },
    responses: {
      201: respuestaJson("Medición registrada", registroSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/alumnos/{id}/progreso",
    tags,
    security,
    summary: "Evolución física de un alumno (US-28)",
    description:
      "Requiere RUTINAS_VER (propietaria y profesoras) o RUTINAS_VER_PROPIAS (alumno y tutor). La propietaria ve a " +
      "cualquier alumno; la profesora, a los que tiene a cargo; el alumno, el suyo, y el tutor, el de su menor a " +
      "cargo. Un alumno ajeno o inexistente responde 403 por igual, salvo a la propietaria, que recibe 404. " +
      "Devuelve las mediciones de la más reciente a la más antigua; lista vacía si todavía no hay ninguna.",
    request: { params: alumnoProgresoParamsSchema },
    responses: {
      200: respuestaJson("Mediciones del alumno", z.array(registroSchema)),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
