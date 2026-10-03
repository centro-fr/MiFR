import type { codigo_rol, roles, usuario_roles, usuarios } from "@prisma/client";

export type Usuario = usuarios;
export type Rol = roles;
export type CodigoRol = codigo_rol;
export type UsuarioRol = usuario_roles & { rol: Rol };

export type UsuarioConRoles = Usuario & { roles: UsuarioRol[] };
