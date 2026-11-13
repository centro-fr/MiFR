import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  camposDePromocion,
  camposEditablesDePromocion,
  listarPromocionesQuerySchema,
  promocionIdParamSchema,
} from "./promocion.schemas.js";

const promocionSchema = z
  .object({
    id_promocion: z.number().int(),
    nombre: z.string(),
    tipo_descuento: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
    valor: z.number().openapi({ description: "Porcentaje (menor a 100) o monto fijo en pesos" }),
    fecha_desde: fechaSchema,
    fecha_hasta: fechaSchema,
    activo: z.boolean(),
    planes: z.array(z.object({ id_plan: z.number().int(), nombre: z.string() })),
    estado: z.enum(["ACTIVA", "PROGRAMADA", "VENCIDA", "DESACTIVADA"]).openapi({
      description: "Se calcula con las fechas (días de Argentina, inclusive) y `activo`; no se guarda",
    }),
  })
  .openapi("Promocion");

export function registrarDocumentacionPromociones(registro: OpenAPIRegistry): void {
  const tags = ["Promociones"];
  const security = SEGURIDAD_BEARER;
  const promocion = respuestaJson("Promoción", promocionSchema);
  const soloPropietaria = "Solo la propietaria: rol `PROPIETARIA` y el permiso `PLANES_EDITAR`.";
  const reglas =
    "Un porcentaje va de más de 0 a menos de 100; un monto fijo tiene que ser menor que el precio vigente de cada uno de sus " +
    "planes a `fecha_desde` (400). Los planes tienen que existir y estar vigentes (400). Dos promociones " +
    "activas no se superponen en fechas sobre un mismo plan (409).";

  registro.registerPath({
    method: "get",
    path: "/promociones",
    tags,
    security,
    summary: "Listar promociones (US-13)",
    description:
      "Requiere el permiso `PLANES_VER`. Filtros por `estado` y por plan (`id_plan`); de la más nueva a la más " +
      "vieja, paginado con `limit` (máximo 100) y `offset`.",
    request: { query: listarPromocionesQuerySchema },
    responses: {
      200: respuestaJson("Promociones", z.array(promocionSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/promociones/{id}",
    tags,
    security,
    summary: "Detalle de una promoción (US-13)",
    description: "Requiere el permiso `PLANES_VER`.",
    request: { params: promocionIdParamSchema },
    responses: { 200: promocion, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "post",
    path: "/promociones",
    tags,
    security,
    summary: "Crear una promoción (US-13)",
    description:
      `${soloPropietaria} Nace activa. ${reglas} La fecha hasta no puede ser anterior a hoy. Aplica a las ` +
      "inscripciones que se pre-inscriben mientras está vigente, y cada cobro la descuenta si ese día sigue vigente.",
    request: {
      body: cuerpoJson(
        camposDePromocion.openapi("CrearPromocion", {
          example: {
            nombre: "Verano 2026",
            tipo_descuento: "PORCENTAJE",
            valor: 20,
            fecha_desde: "2026-12-01",
            fecha_hasta: "2027-02-28",
            ids_planes: [1, 2],
          },
        }),
      ),
    },
    responses: { 201: promocion, ...respuestasDeError(400, 401, 403, 409) },
  });

  registro.registerPath({
    method: "patch",
    path: "/promociones/{id}",
    tags,
    security,
    summary: "Modificar una promoción (US-13)",
    description:
      `${soloPropietaria} Una vencida o desactivada no se edita (409). ${reglas} \`ids_planes\` reemplaza los ` +
      "planes. Lo ya cobrado no cambia.",
    request: {
      params: promocionIdParamSchema,
      body: cuerpoJson(camposEditablesDePromocion.openapi("ActualizarPromocion", { example: { valor: 15 } })),
    },
    responses: { 200: promocion, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/promociones/{id}/desactivar",
    tags,
    security,
    summary: "Desactivar una promoción (US-13)",
    description:
      `${soloPropietaria} Baja lógica: deja de aplicar en el momento, también a las inscripciones que ya la ` +
      "tenían. Una ya desactivada responde 409.",
    request: { params: promocionIdParamSchema },
    responses: { 200: promocion, ...respuestasDeError(400, 401, 403, 404, 409) },
  });
}
