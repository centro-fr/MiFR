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
  actualizarUsuarioSchema,
  asignarRolSchema,
  crearUsuarioSchema,
  rolParamSchema,
  usuarioIdParamSchema,
} from "./usuario.schemas.js";

const codigoRolSchema = z.enum(["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"]);

export const usuarioConRolesSchema = z
  .object({
    id_usuario: z.number().int(),
    google_id: z.string().nullable(),
    email: z.string().email().nullable(),
    nombre: z.string(),
    apellido: z.string(),
    dni: z.string().nullable(),
    telefono: z.string().nullable(),
    fecha_nacimiento: fechaSchema,
    direccion: z.string().nullable(),
    estado: z.enum(["ACTIVO", "INACTIVO"]),
    fecha_alta: fechaSchema,
    fecha_actualizacion: fechaSchema,
    roles: z.array(
      z.object({
        id_usuario: z.number().int(),
        id_rol: z.number().int(),
        fecha_asignacion: fechaSchema,
        rol: z.object({
          id_rol: z.number().int(),
          codigo: codigoRolSchema,
          nombre: z.string(),
          descripcion: z.string().nullable(),
        }),
      }),
    ),
  })
  .openapi("UsuarioConRoles");

export function registrarDocumentacionUsuarios(registro: OpenAPIRegistry): void {
  const tags = ["Usuarios"];
  const security = SEGURIDAD_BEARER;
  const usuario = respuestaJson("Usuario con sus roles", usuarioConRolesSchema);

  registro.registerPath({
    method: "post",
    path: "/usuarios",
    tags,
    security,
    summary: "Dar de alta un usuario",
    description: "Requiere el permiso `USUARIOS_EDITAR`.",
    request: { body: cuerpoJson(crearUsuarioSchema.openapi("CrearUsuario")) },
    responses: { 201: usuario, ...respuestasDeError(400, 401, 403, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/usuarios",
    tags,
    security,
    summary: "Listar usuarios",
    description: "Requiere el permiso `USUARIOS_VER`.",
    responses: {
      200: respuestaJson("Usuarios con sus roles", z.array(usuarioConRolesSchema)),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/usuarios/{id}",
    tags,
    security,
    summary: "Obtener un usuario",
    description: "Cada usuario puede ver sus propios datos; para ver los de otro requiere `USUARIOS_VER`.",
    request: { params: usuarioIdParamSchema },
    responses: { 200: usuario, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/usuarios/{id}",
    tags,
    security,
    summary: "Modificar un usuario",
    description:
      "Cada usuario puede editar sus propios datos; para editar los de otro requiere `USUARIOS_EDITAR`. " +
      "Cambiar `estado` requiere siempre `USUARIOS_EDITAR`.",
    request: {
      params: usuarioIdParamSchema,
      body: cuerpoJson(actualizarUsuarioSchema.openapi("ActualizarUsuario")),
    },
    responses: { 200: usuario, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "delete",
    path: "/usuarios/{id}",
    tags,
    security,
    summary: "Eliminar un usuario",
    description: "Requiere el permiso `USUARIOS_EDITAR`.",
    request: { params: usuarioIdParamSchema },
    responses: { 204: { description: "Usuario eliminado" }, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "post",
    path: "/usuarios/{id}/roles",
    tags,
    security,
    summary: "Asignar un rol a un usuario",
    description: "Requiere el permiso `USUARIOS_EDITAR`.",
    request: { params: usuarioIdParamSchema, body: cuerpoJson(asignarRolSchema.openapi("AsignarRol")) },
    responses: { 201: usuario, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "delete",
    path: "/usuarios/{id}/roles/{rol}",
    tags,
    security,
    summary: "Quitar un rol a un usuario",
    description: "Requiere el permiso `USUARIOS_EDITAR`.",
    request: { params: rolParamSchema },
    responses: { 200: usuario, ...respuestasDeError(400, 401, 403, 404) },
  });
}
