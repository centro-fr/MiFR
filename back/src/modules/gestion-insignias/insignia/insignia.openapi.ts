import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { alumnoInsigniasParamsSchema, rankingAsistenciaQuerySchema } from "./insignia.schemas.js";

const tipoInsigniaSchema = z.enum(["MES_PERFECTO", "RACHA", "TOTAL_CLASES", "PODIO_MES"]);

const proximoHitoSchema = z
  .object({ umbral: z.number().int(), faltantes: z.number().int() })
  .nullable()
  .openapi({ description: "null si ya alcanzó todos los umbrales" });

const insigniaResumidaSchema = z
  .object({
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    tipo: tipoInsigniaSchema,
    valor_umbral: z.number().int().openapi({
      description: "Clases para RACHA y TOTAL_CLASES, porcentaje para MES_PERFECTO, puestos para PODIO_MES",
    }),
  })
  .openapi("InsigniaResumida");

const insigniaDeFichaSchema = insigniaResumidaSchema
  .extend({
    obtenida: z.boolean(),
    fecha_obtencion: fechaSchema.nullable().openapi({ description: "La primera vez que la obtuvo" }),
    periodos: z
      .array(z.string())
      .openapi({ description: "Meses (AAAA-MM) en que obtuvo una insignia mensual; vacío en las demás" }),
    progreso: z
      .object({ actual: z.number().int(), umbral: z.number().int() })
      .nullable()
      .openapi({ description: "Solo en RACHA y TOTAL_CLASES, por ejemplo 74 de 100" }),
  })
  .openapi("InsigniaDeFicha");

const fichaInsigniasSchema = z
  .object({
    id_alumno: z.number().int(),
    racha: z.object({
      actual: z.number().int(),
      mejor: z.number().int(),
      fecha_inicio: fechaSchema.nullable(),
      proximo_hito: proximoHitoSchema,
    }),
    clases_asistidas: z.number().int(),
    proximo_hito_clases: proximoHitoSchema,
    insignias: z.array(insigniaDeFichaSchema),
  })
  .openapi("FichaInsignias");

const filaRankingSchema = z
  .object({
    posicion: z.number().int(),
    id_alumno: z.number().int(),
    nombre: z.string(),
    apellido: z.string(),
    clases_previstas: z.number().int(),
    clases_asistidas: z.number().int(),
    porcentaje_asistencia: z.number(),
    racha_actual: z.number().int(),
    insignias: z.array(insigniaResumidaSchema),
    es_propia: z.boolean().openapi({ description: "Del alumno que consulta o de un menor a su cargo" }),
  })
  .openapi("FilaRankingAsistencia");

const rankingAsistenciaSchema = z
  .object({
    periodo: z.object({ desde: fechaSchema, hasta: fechaSchema }),
    actividad: z.number().int().nullable(),
    minimo_clases: z.number().int().openapi({ description: "RANKING_MINIMO_CLASES con el que se calculó" }),
    datos: z.array(filaRankingSchema),
    propias: z
      .array(filaRankingSchema)
      .openapi({ description: "Las filas propias, aunque estén fuera de la página pedida" }),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("RankingAsistencia");

const reglasDeAsistencia =
  "Solo cuentan las clases dictadas (cerradas): una cancelada no tiene marcas y no corta la racha, y una " +
  "suplencia es una clase más. Las clases previstas son las marcas, presentes y ausentes, que el cierre " +
  "de la asistencia completa (US-21).";

const cierreMensual =
  "Antes de responder se cierra el mes anterior si todavía no se cerró: Mes perfecto a quien asistió a " +
  "todas sus clases dictadas, y Podio del mes a los tres primeros del ranking, con el mínimo de clases.";

export function registrarDocumentacionInsignia(registro: OpenAPIRegistry): void {
  const tags = ["Insignias"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "get",
    path: "/alumnos/{id}/insignias",
    tags,
    security,
    summary: "Racha e insignias de un alumno (US-31)",
    description:
      "Requiere INSIGNIAS_VER_PROPIAS. El alumno ve las suyas y el tutor las de su menor a cargo; la " +
      "propietaria, las de cualquiera. Un alumno ajeno o inexistente responde 403 por igual. Devuelve el " +
      "catálogo completo con lo obtenido y el progreso. La racha no se reinicia con el mes y una " +
      `inasistencia la lleva a 0. ${reglasDeAsistencia} ${cierreMensual}`,
    request: { params: alumnoInsigniasParamsSchema },
    responses: {
      200: respuestaJson("La ficha de insignias del alumno", fichaInsigniasSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/reportes/ranking-asistencia",
    tags,
    security,
    summary: "Ranking de asistencia (US-30)",
    description:
      "Requiere REPORTES_RANKING_VER: es la misma vista para la propietaria, las profesoras, los alumnos y " +
      "los tutores, sin datos de contacto ni de cuotas. Por defecto, el mes en curso hasta hoy. Solo " +
      "alumnos no dados de baja con al menos RANKING_MINIMO_CLASES clases previstas en el período. Se " +
      "ordena por porcentaje descendente, clases asistidas descendente y apellido y nombre ascendentes. " +
      `${reglasDeAsistencia} ${cierreMensual}`,
    request: { query: rankingAsistenciaQuerySchema },
    responses: {
      200: respuestaJson("El ranking del período", rankingAsistenciaSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });
}
