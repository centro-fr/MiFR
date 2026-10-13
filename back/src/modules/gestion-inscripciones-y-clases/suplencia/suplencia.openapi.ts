import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  cambiarSuplenciaSchema,
  listarSuplenciasQuerySchema,
  registrarSuplenciaSchema,
  suplenciaParamSchema,
} from "./suplencia.schemas.js";

const profesoraSchema = z.object({
  id_profesora: z.number().int(),
  usuario: z.object({ nombre: z.string(), apellido: z.string() }),
});

const suplenciaSchema = z
  .object({
    id_clase: z.number().int(),
    id_prof_ausente: z.number().int().openapi({ description: "La titular que faltó" }),
    motivo: z.string().nullable(),
    fecha_registro: fechaSchema,
    id_usuario_registra: z.number().int(),
    clase: z.object({
      id_horario: z.number().int(),
      fecha_clase: fechaSchema,
      id_prof_dictante: z.number().int().openapi({ description: "La suplente" }),
      estado: z.enum(["PROGRAMADA", "DICTADA", "CANCELADA"]),
      horario: z.object({
        dia_semana: z.number().int(),
        hora_inicio: fechaSchema,
        hora_fin: fechaSchema,
        actividad: z.object({ id_actividad: z.number().int(), nombre: z.string() }),
      }),
      profesora: profesoraSchema.openapi({ description: "La suplente" }),
    }),
    profesora_ausente: profesoraSchema,
  })
  .openapi("Suplencia");

const suplenciaRegistradaSchema = z
  .object({
    suplencia: suplenciaSchema,
    advertencia: z.string().nullable().openapi({ description: "Aviso si la clase todavía no se dictó" }),
  })
  .openapi("SuplenciaRegistrada");

export function registrarDocumentacionSuplencias(registro: OpenAPIRegistry): void {
  const tags = ["Suplencias"];
  const security = SEGURIDAD_BEARER;
  const soloPropietaria = "Requiere rol `PROPIETARIA` y el permiso";

  registro.registerPath({
    method: "get",
    path: "/suplencias",
    tags,
    security,
    summary: "Listar suplencias (US-24)",
    description: `${soloPropietaria} \`HONORARIOS_VER_TODOS\`. De la clase más nueva a la más vieja. \`id_profesora\` busca a la profesora como titular o como suplente.`,
    request: { query: listarSuplenciasQuerySchema },
    responses: {
      200: respuestaJson("Suplencias", z.array(suplenciaSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/suplencias",
    tags,
    security,
    summary: "Registrar una suplencia (US-24)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. Crea la clase de ese horario y fecha si todavía no existe, registra a la titular como ausente y deja a la suplente como dictante: ella toma la asistencia. La fecha tiene que ser del día del horario (400). La suplente tiene que ser una profesora activa y distinta de la titular. 409 si la clase está cancelada o ya tiene una suplencia.`,
    request: { body: cuerpoJson(registrarSuplenciaSchema.openapi("RegistrarSuplencia")) },
    responses: {
      201: respuestaJson("Suplencia registrada", suplenciaRegistradaSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/suplencias/{idClase}",
    tags,
    security,
    summary: "Cambiar la suplente o el motivo (US-24)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. La última suplente registrada es la que vale.`,
    request: {
      params: suplenciaParamSchema,
      body: cuerpoJson(cambiarSuplenciaSchema.openapi("CambiarSuplencia")),
    },
    responses: {
      200: respuestaJson("Suplencia actualizada", suplenciaSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/suplencias/{idClase}",
    tags,
    security,
    summary: "Eliminar una suplencia (US-24)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. La clase vuelve a la titular.`,
    request: { params: suplenciaParamSchema },
    responses: {
      204: { description: "Suplencia eliminada" },
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}
