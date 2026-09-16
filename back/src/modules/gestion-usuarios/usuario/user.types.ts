import type { rol, usuario_roles, usuarios } from "@prisma/client";

export type Usuario = usuarios;
export type UsuarioRol = usuario_roles;
export type Rol = rol;

export type UsuarioConRoles = Usuario & { roles: UsuarioRol[] };
