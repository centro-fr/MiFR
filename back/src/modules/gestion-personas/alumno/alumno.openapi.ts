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

const paginaAlumnosSchema = z
  .object({
    datos: z.array(alumnoSchema),
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
  const temporalmentePropietaria =
    "Por ahora solo la propietaria: la profesora va a ver a los alumnos a su cargo cuando existan las " +
    "inscripciones.";

  registro.registerPath({
    method: "get",
    path: "/alumnos",
    tags,
    security,
    summary: "Buscar alumnos",
    description:
      `Requiere el permiso \`ALUMNOS_VER\`. ${temporalmentePropietaria} \`busqueda\` encuentra coincidencias ` +
      "parciales en el nombre y el apellido del alumno o de su tutor, sin distinguir acentos ni mayúsculas. " +
      "`dni` busca el DNI exacto. Los dados de baja no salen salvo con `incluirBajas=true` o `estado=BAJA`. " +
      "Paginado con `limit` (por defecto 20, máximo 100) y `offset`.",
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
      "de otro usuario.",
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
    description: `Requiere el permiso \`ALUMNOS_VER\`. ${temporalmentePropietaria}`,
    request: { params: alumnoIdParamSchema },
    responses: { 200: alumno, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/alumnos/{id}",
    tags,
    security,
    summary: "Modificar los datos de un alumno",
    description:
      `Requiere el permiso \`ALUMNOS_EDITAR\`. ${temporalmentePropietaria} ${reglasDeEdad} Las reglas se ` +
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
