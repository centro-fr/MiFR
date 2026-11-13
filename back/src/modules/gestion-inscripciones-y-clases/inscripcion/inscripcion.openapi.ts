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
  actualizarHorariosSchema,
  cambiarPlanSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  inscripcionIdParamSchema,
  listarInscripcionesQuerySchema,
  preinscribirSchema,
  reactivarAlumnoSchema,
} from "./inscripcion.schemas.js";

const estadoInscripcionSchema = z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]);
const horarioSchema = z.object({
  id_horario: z.number().int(),
  id_actividad: z.number().int(),
  id_profesora: z.number().int(),
  dia_semana: z.number().int(),
  hora_inicio: fechaSchema,
  hora_fin: fechaSchema,
  cupo_maximo: z.number().int().nullable(),
  fecha_alta: fechaSchema,
  fecha_baja: fechaSchema.nullable(),
  actividad: z.object({
    id_actividad: z.number().int(),
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
    cupo_maximo: z.number().int().nullable(),
    activo: z.boolean(),
  }),
  profesora: z.object({
    id_profesora: z.number().int(),
    usuario: z.object({ nombre: z.string(), apellido: z.string() }),
  }),
});

export const inscripcionSchema = z
  .object({
    id_inscripcion: z.number().int(),
    id_alumno: z.number().int(),
    id_plan: z.number().int(),
    id_plan_precio: z.number().int(),
    id_profesora: z.number().int(),
    id_promocion: z.number().int().nullable(),
    sin_cargo: z.boolean(),
    fecha_inicio: fechaSchema,
    fecha_fin_estimado: fechaSchema.nullable(),
    estado: estadoInscripcionSchema,
    motivo_baja: z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "CAMBIO_PLAN", "OTRO"]).nullable(),
    detalle_baja: z.string().nullable(),
    observaciones: z.string().nullable(),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    alumno: z.object({
      id_alumno: z.number().int(),
      estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
    plan: z.object({
      id_plan: z.number().int(),
      tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      clases_por_semana: z.number().int().nullable(),
      dias_gracia: z.number().int(),
      id_actividad_exclusiva: z.number().int().nullable(),
      profesora_unica: z.boolean(),
      fecha_alta: fechaSchema,
      fecha_baja: fechaSchema.nullable(),
    }),
    plan_precio: z.object({
      id_plan_precio: z.number().int(),
      id_plan: z.number().int(),
      precio: z.union([z.number(), z.string()]),
      fecha_vigencia_desde: fechaSchema,
      fecha_vigencia_hasta: fechaSchema.nullable(),
    }),
    profesora: z.object({
      id_profesora: z.number().int(),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
    horarios: z.array(
      z.object({
        id_inscripcion: z.number().int(),
        id_horario: z.number().int(),
        fecha_desde: fechaSchema,
        fecha_hasta: fechaSchema.nullable(),
        horario: horarioSchema,
      }),
    ),
    reserva: z
      .object({
        vence: fechaSchema.openapi({
          description: "Último día en que la pre-inscripción guarda su lugar sin el primer pago",
        }),
        vencida: z.boolean().openapi({
          description: "true si ese día ya pasó: el lugar queda libre hasta que se confirme el primer pago",
        }),
      })
      .nullable()
      .openapi({
        description:
          "Solo en las PREINSCRIPTA (null en las demás). Vence DIAS_RESERVA_PREINSCRIPCION días después del inicio, un parámetro del sistema",
      }),
  })
  .openapi("Inscripcion");

export const resumenInscripcionSchema = z
  .object({
    id_alumno: z.number().int(),
    id_inscripcion: z.number().int(),
    estado: estadoInscripcionSchema,
    id_plan: z.number().int(),
    nombre_plan: z.string(),
    id_profesora: z.number().int(),
    nombre_profesora: z.string(),
    ids_horarios: z.array(z.number().int()),
  })
  .openapi("ResumenInscripcion");

const respuestas = respuestaJson("Inscripcion", inscripcionSchema);
const propietariaEditar = "Requiere sesión, rol PROPIETARIA y permiso `ALUMNOS_EDITAR`.";
const reglasDeAlta =
  "El plan debe estar vigente y tener precio vigente; los horarios deben estar activos, ser de la misma profesora, " +
  "respetar la actividad exclusiva y no superar el cupo disponible. Las pre-inscripciones con la reserva vencida " +
  "no ocupan cupo.";

const cambioPlanProgramadoSchema = z
  .object({
    id_inscripcion: z.number().int(),
    id_plan: z.number().int(),
    nombre_plan: z.string(),
    id_profesora: z.number().int(),
    nombre_profesora: z.string(),
    ids_horarios: z.array(z.number().int()),
    fecha_aplicacion: fechaSchema.openapi({
      description: "El día siguiente al último de gracia de la cuota que corre",
    }),
  })
  .openapi("CambioPlanProgramado");

export function registrarDocumentacionInscripciones(registro: OpenAPIRegistry): void {
  const tags = ["Inscripciones"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "get",
    path: "/inscripciones",
    tags,
    security,
    summary: "Listar inscripciones",
    description:
      "Requiere el permiso `ALUMNOS_VER`. Admite filtros por alumno, plan, profesora, actividad y estado. " +
      "Una profesora solo recibe las inscripciones que tiene a cargo; la propietaria, todas. Paginado con " +
      "`limit` (por defecto y como máximo 100) y `offset`.",
    request: { query: listarInscripcionesQuerySchema },
    responses: {
      200: respuestaJson("Inscripciones", z.array(inscripcionSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/inscripciones",
    tags,
    security,
    summary: "Crear una pre-inscripción",
    description:
      `Requiere el permiso \`ALUMNOS_EDITAR\`. Una profesora solo pre-inscribe a su propio nombre ` +
      "(`id_profesora` es su perfil), sin cargo no, y alumnos que no tienen una inscripción vigente con otra " +
      `profesora; si no, 403. ${reglasDeAlta} ` +
      "Si alguna actividad de los horarios tiene `requiere_medidas`, `medidas` (peso en kg y talla en cm) es " +
      "obligatorio (400 si falta); se guarda como la primera medición del alumno, a nombre de la profesora a cargo.",
    request: {
      body: cuerpoJson(
        crearInscripcionSchema.openapi("CrearInscripcion", {
          example: {
            id_alumno: 1,
            id_plan: 1,
            id_profesora: 1,
            ids_horarios: [1, 2],
            medidas: { peso_kg: 62.5, talla_cm: 168 },
          },
        }),
      ),
    },
    responses: { 201: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/preinscripciones",
    tags,
    security,
    summary: "Dar de alta un alumno y pre-inscribirlo (US-05)",
    description:
      "Requiere el permiso `ALUMNOS_EDITAR`. Hace en un solo pedido lo de `POST /alumnos` y `POST /inscripciones`, " +
      "con las mismas reglas y los mismos errores; si cualquier parte falla (sin cupo, sin precio, medidas que " +
      "faltan, DNI o email repetidos, un corte), no se guarda nada. Una profesora solo pre-inscribe a su propio " +
      `nombre, sin cargo no, y carga un tutor nuevo con sus datos: elegir una cuenta existente es de la propietaria (403). ${reglasDeAlta}`,
    request: {
      body: cuerpoJson(
        preinscribirSchema.openapi("Preinscribir", {
          example: {
            alumno: {
              nombre: "Tomás",
              apellido: "Pérez",
              email: "tomas.perez@gmail.com",
              fecha_nacimiento: "1998-04-12",
              dni: "40111222",
              cont_emerg_nombre: "Laura Pérez",
              cont_emerg_telefono: "3794 112233",
            },
            inscripcion: { id_plan: 1, id_profesora: 1, ids_horarios: [1, 2] },
          },
        }),
      ),
    },
    responses: {
      201: respuestaJson(
        "Alumno y pre-inscripción creados",
        z.object({ id_alumno: z.number().int(), id_inscripcion: z.number().int() }).openapi("Preinscripcion"),
      ),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/inscripciones/{id}",
    tags,
    security,
    summary: "Obtener una inscripción",
    description:
      "Requiere el permiso `ALUMNOS_VER`. Una profesora solo ve las inscripciones que tiene a cargo (si no, 403).",
    request: { params: inscripcionIdParamSchema },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "post",
    path: "/alumnos/{id}/baja",
    tags,
    security,
    summary: "Dar de baja al alumno",
    description:
      `${propietariaEditar} La baja es lógica: conserva la inscripción y cierra sus horarios vigentes. ` +
      "`detalle_baja` (opcional, hasta 200 caracteres) explica un motivo `OTRO`; con otro motivo responde 400.",
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(darDeBajaAlumnoSchema),
    },
    responses: {
      200: respuestaJson("Alumno dado de baja", z.object({ mensaje: z.string() })),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/alumnos/{id}/reactivar",
    tags,
    security,
    summary: "Reactivar un alumno",
    description:
      `${propietariaEditar} Crea una inscripción nueva y valida nuevamente el cupo. ${reglasDeAlta} ` +
      "Si el alumno ya tuvo algún pago confirmado, la inscripción queda ACTIVA y el alumno, ACTIVO. Si nunca " +
      "pagó, la inscripción queda PREINSCRIPTA (con su reserva de cupo) y el alumno, INACTIVO: el primer pago le da el alta.",
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(reactivarAlumnoSchema),
    },
    responses: { 201: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/inscripciones/{id}/cambio-plan",
    tags,
    security,
    summary: "Cambiar el plan de una inscripción",
    description:
      `${propietariaEditar} Con el plan vigente (inscripción activa con la cuota paga y la gracia corriendo) el ` +
      "cambio queda programado para el día siguiente al último de gracia y responde 202 con el cambio; pedir otro " +
      "lo reemplaza. Si no, se aplica en el momento y responde 200 con la inscripción nueva: es transaccional y " +
      `conserva los cobros que apuntan a la inscripción anterior. ${reglasDeAlta}`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(cambiarPlanSchema),
    },
    responses: {
      200: respuestas,
      202: respuestaJson("Cambio de plan programado", cambioPlanProgramadoSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/inscripciones/{id}/cambio-plan",
    tags,
    security,
    summary: "Cancelar el cambio de plan programado",
    description: `${propietariaEditar} 404 si la inscripción no tiene un cambio programado.`,
    request: { params: inscripcionIdParamSchema },
    responses: { 204: { description: "Cambio cancelado" }, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/inscripciones/{id}/horarios",
    tags,
    security,
    summary: "Modificar los horarios de una inscripción",
    description: `${propietariaEditar} Cierra los horarios que salen y valida el cupo de los nuevos.`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(actualizarHorariosSchema),
    },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });
}
