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
  actualizarAlumnoSchema,
  alumnoIdParamSchema,
  crearAlumnoSchema,
  listarAlumnoQuerySchema,
} from "./alumno.schemas.js";
import {
  inscripcionSchema,
  resumenInscripcionSchema,
} from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.openapi.js";

const datosPersonalesSchema = z
  .object({
    id_usuario: z.number().int(),
    nombre: z.string(),
    apellido: z.string(),
    dni: z.string().nullable(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    fecha_nacimiento: fechaSchema,
    direccion: z.string().nullable(),
    estado: z.enum(["ACTIVO", "INACTIVO"]),
  })
  .openapi("DatosPersonales");

export const alumnoSchema = z
  .object({
    id_alumno: z.number().int(),
    id_usuario: z.number().int(),
    id_usuario_responsable: z.number().int().nullable(),
    cont_emerg_nombre: z.string().nullable(),
    cont_emerg_telefono: z.string().nullable(),
    apto_medico: z.boolean(),
    fecha_apto_medico: fechaSchema.nullable(),
    observaciones: z.string().nullable(),
    estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]).openapi({
      description: "INACTIVO mientras está pre-inscripto, hasta que se confirma el primer pago",
    }),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    usuario: datosPersonalesSchema,
    responsable: datosPersonalesSchema.nullable().openapi({ description: "Tutor, si es menor de edad" }),
  })
  .openapi("Alumno");

const situacionCuotaSchema = z
  .object({
    estado: z
      .enum([
        "AL_DIA",
        "POR_VENCER",
        "VENCIDA",
        "CLASE_SUELTA_VIGENTE",
        "CLASE_SUELTA_VENCIDA",
        "PENDIENTE_DE_PAGO",
      ])
      .openapi({
        description:
          "POR_VENCER: dentro de los días de gracia del plan. PENDIENTE_DE_PAGO: sin ninguna cuota paga " +
          "(pre-inscripto, o con la única transferencia rechazada)",
      }),
    fecha_vencimiento: fechaSchema.nullable().openapi({
      description: "Vencimiento de la última cuota paga; null sin cuotas pagas",
    }),
    dias_restantes: z.number().int().nullable().openapi({
      description: "Días hasta el vencimiento: 0 el mismo día, negativo si ya venció (días de atraso)",
    }),
    puede_asistir: z.boolean().openapi({
      description:
        "Según el estado y el parámetro VENCIDOS_PUEDEN_ASISTIR; una transferencia pendiente nunca bloquea",
    }),
    tiene_pago_pendiente: z.boolean().openapi({
      description: "Hay una transferencia informada que la propietaria todavía no revisó",
    }),
  })
  .openapi("SituacionCuota", {
    description:
      "Se calcula en cada consulta. En una inscripción dada de baja se calcula al día de la baja: muestra lo " +
      "que debía el alumno al irse",
  });

const inscripcionConSituacionSchema = inscripcionSchema.extend({
  situacion_cuota: situacionCuotaSchema.nullable(),
});

const alumnoEnListadoSchema = alumnoSchema
  .extend({
    inscripcion: resumenInscripcionSchema.nullable().openapi({
      description: "Plan y profesora de la inscripción vigente más reciente; null si no tiene",
    }),
    situacion_cuota: situacionCuotaSchema.nullable().openapi({
      description: "La de la inscripción de `inscripcion`; null si no tiene una vigente",
    }),
  })
  .openapi("AlumnoEnListado");

const fichaAlumnoSchema = alumnoSchema
  .extend({
    inscripciones: z.array(inscripcionConSituacionSchema).openapi({
      description:
        "Inscripciones vigentes (pre-inscriptas o activas) con plan, precio, horarios y situación de cuota",
    }),
    inscripciones_de_la_baja: z.array(inscripcionConSituacionSchema).openapi({
      description:
        "Solo en un alumno dado de baja (vacío en los demás): las inscripciones que cerró su última baja, con " +
        "la situación de cuota al día de la baja, para advertir una deuda antes de reactivarlo",
    }),
  })
  .openapi("FichaAlumno");

const paginaAlumnosSchema = z
  .object({
    datos: z.array(alumnoEnListadoSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("PaginaAlumnos");

const reglasDeEdad =
  "Un menor de 18 años lleva tutor y no lleva email (entra al sistema su tutor); un mayor lleva email " +
  "y no lleva tutor. El tutor se indica con `{ id_usuario }` o con sus datos: si ya existe un usuario con " +
  "ese DNI o email, se reutiliza.";

export function registrarDocumentacionAlumnos(registro: OpenAPIRegistry): void {
  const tags = ["Alumnos"];
  const security = SEGURIDAD_BEARER;
  const alumno = respuestaJson("Alumno", alumnoSchema);
  const aCargo =
    "La propietaria ve a todos; una profesora, solo a los alumnos con una inscripción vigente a su cargo.";

  registro.registerPath({
    method: "get",
    path: "/alumnos",
    tags,
    security,
    summary: "Buscar alumnos",
    description:
      `Requiere el permiso \`ALUMNOS_VER\`. ${aCargo} \`busqueda\` encuentra coincidencias ` +
      "parciales en el nombre y el apellido del alumno o de su tutor, sin distinguir acentos ni mayúsculas. " +
      "`dni` busca el DNI exacto. Los dados de baja no salen salvo con `incluirBajas=true` o `estado=BAJA`. " +
      "`id_plan`, `id_profesora` e `id_actividad` filtran por la inscripción vigente. Cada fila trae su plan y " +
      "profesora y la situación de cuota de esa inscripción. Paginado con `limit` (por defecto 20, máximo 100) y `offset`.",
    request: { query: listarAlumnoQuerySchema },
    responses: {
      200: respuestaJson("Página de alumnos", paginaAlumnosSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/alumnos",
    tags,
    security,
    summary: "Dar de alta un alumno (pre-inscripción)",
    description:
      "Requiere el permiso `ALUMNOS_EDITAR` (propietaria y profesora). El alumno queda INACTIVO y sin acceso " +
      `hasta que se confirma el primer pago; la inscripción se carga aparte. ${reglasDeEdad} Responde 409 con ` +
      "el código `ALUMNO_EXISTENTE` si el DNI ya es de un alumno, y 409 `CONFLICT` si el DNI o el email ya son " +
      "de otro usuario. Un tutor cargado con sus datos reusa la cuenta existente solo si el DNI y el email son de " +
      "la misma cuenta (si no, 409). Una profesora no puede indicar el tutor por `id_usuario` (403) y del tutor " +
      "recibe solo `id_usuario`, `nombre` y `apellido`.",
    request: {
      body: cuerpoJson(
        crearAlumnoSchema.openapi("CrearAlumno", {
          example: {
            nombre: "Tomás",
            apellido: "Pérez",
            dni: "50111222",
            fecha_nacimiento: "2014-05-10",
            cont_emerg_nombre: "Laura Pérez",
            cont_emerg_telefono: "3794 112233",
            tutor: {
              nombre: "Laura",
              apellido: "Pérez",
              dni: "30111222",
              telefono: "3794 112233",
              email: "laura.perez@example.com",
              fecha_nacimiento: "1985-03-02",
            },
          },
        }),
      ),
    },
    responses: { 201: alumno, ...respuestasDeError(400, 401, 403, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/alumnos/{id}",
    tags,
    security,
    summary: "Ficha de un alumno",
    description:
      `Requiere el permiso \`ALUMNOS_VER\`. ${aCargo} Con un alumno que no tiene a cargo, la profesora ` +
      "recibe 403. La ficha trae las inscripciones vigentes con su plan, precio, profesora, horarios y situación " +
      "de cuota; la de un alumno dado de baja, también las inscripciones de su última baja.",
    request: { params: alumnoIdParamSchema },
    responses: {
      200: respuestaJson("Ficha del alumno", fichaAlumnoSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/alumnos/{id}",
    tags,
    security,
    summary: "Modificar los datos de un alumno",
    description:
      `Requiere el permiso \`ALUMNOS_EDITAR\`. ${aCargo} La profesora solo modifica contacto (\`telefono\`, ` +
      "`direccion`, `cont_emerg_nombre`, `cont_emerg_telefono`) y `observaciones`; otro campo responde 403. " +
      `${reglasDeEdad} Las reglas se ` +
      "revisan con los datos que resultan del cambio: si el alumno ya es mayor, el tutor se quita. El plan y " +
      "los horarios se cambian desde la inscripción. Queda registrado quién hizo el cambio.",
    request: {
      params: alumnoIdParamSchema,
      body: cuerpoJson(
        actualizarAlumnoSchema.openapi("ActualizarAlumno", { example: { telefono: "3794 445566" } }),
      ),
    },
    responses: { 200: alumno, ...respuestasDeError(400, 401, 403, 404, 409) },
  });
}
