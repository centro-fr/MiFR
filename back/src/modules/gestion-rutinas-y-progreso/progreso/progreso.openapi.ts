import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { CODIGOS_MEDIDA, MEDIDAS } from "./medida.catalogo.js";
import {
  actualizarProgresoSchema,
  alumnoProgresoParamsSchema,
  registrarProgresoSchema,
  registroProgresoParamsSchema,
} from "./progreso.schemas.js";

const registroSchema = z
  .object({
    id_registro: z.number().int(),
    id_alumno: z.number().int(),
    id_profesora: z.number().int().openapi({ description: "La profesora que cargó la medición" }),
    fecha: fechaSchema,
    observaciones: z.string().nullable().openapi({
      description:
        "Notas de la profesora: solo las ven la propietaria y la profesora a cargo; al alumno y al tutor les llega null",
    }),
    fecha_modificacion: z
      .string()
      .datetime()
      .nullable()
      .openapi({ description: "Cuándo se corrigió por última vez; null si nunca se corrigió" }),
    id_usuario_modifica: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "Quién lo corrigió por última vez; null si nunca se corrigió" }),
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
      "Devuelve las mediciones de la más reciente a la más antigua, sin las dadas de baja; lista vacía si todavía no hay ninguna.",
    request: { params: alumnoProgresoParamsSchema },
    responses: {
      200: respuestaJson("Mediciones del alumno", z.array(registroSchema)),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/progreso/{id}",
    tags,
    security,
    summary: "Corregir una medición (US-27)",
    description:
      "Requiere RUTINAS_EDITAR. {id} es el id_registro. La propietaria corrige cualquier medición y la profesora, " +
      "solo las de los alumnos que tiene a cargo (403 si no; también 403 si el registro no existe o ya está dado de " +
      "baja, salvo a la propietaria, que recibe 404). Va el mismo contenido que al registrar, pero todo es " +
      "opcional y debe venir al menos un dato: fecha (no futura), observaciones (null o vacía la borra) y medidas. " +
      "Si vienen medidas, reemplazan a todas las anteriores del registro, con las mismas validaciones y rangos; no " +
      "se puede cambiar el alumno ni la profesora que lo cargó. Todo se guarda junto o no se guarda nada. Queda " +
      "registrado quién lo corrigió y cuándo (id_usuario_modifica y fecha_modificacion). Devuelve el registro " +
      "corregido.",
    request: {
      params: registroProgresoParamsSchema,
      body: cuerpoJson(
        actualizarProgresoSchema.openapi("ActualizarProgreso", {
          example: { medidas: [{ codigo: "PESO", valor: 62.4 }] },
        }),
      ),
    },
    responses: {
      200: respuestaJson("Medición corregida", registroSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/progreso/{id}",
    tags,
    security,
    summary: "Dar de baja una medición (US-27)",
    description:
      "Requiere RUTINAS_EDITAR. {id} es el id_registro. Es una baja lógica: el registro y sus medidas quedan en " +
      "la base con quién y cuándo lo dio de baja, pero dejan de aparecer en GET /alumnos/{id}/progreso y ya no se " +
      "pueden corregir ni volver a dar de baja. Mismos permisos que PATCH: la propietaria cualquiera y la " +
      "profesora, solo las de sus alumnos a cargo.",
    request: { params: registroProgresoParamsSchema },
    responses: {
      204: { description: "Medición dada de baja" },
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
