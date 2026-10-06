import { z } from "zod";
import type { AuthResponse, AuthUser, RoleCode } from "@/types/auth";

// Contrato real del back (rama usuario, módulo sesion):
// POST /api/v1/auth/google { id_token } → { token, usuario, roles, permisos }
// GET  /api/v1/auth/me (Bearer)          → { usuario, roles, permisos }
// Errores: { error: { code, message } } con códigos USUARIO_NO_REGISTRADO,
// FORBIDDEN, UNAUTHORIZED, VALIDATION_ERROR.

export const googleCredentialSchema = z.object({
  id_token: z.string().min(1, "Token de Google requerido"),
});

export const roleSchema = z.enum(["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"]);

// El usuario de Prisma trae campos extra (google_id, estado, roles anidados...);
// solo nos interesan identidad + los roles/permisos efectivos de nivel raíz.
// El email es opcional en el DER (usuarios.email), así que el back puede mandarlo en null.
const backendUsuarioSchema = z
  .object({
    id_usuario: z.number(),
    email: z.string().nullable(),
    nombre: z.string(),
    apellido: z.string(),
  })
  .passthrough();

const backendSessionSchema = z.object({
  token: z.string().min(1).optional(),
  usuario: backendUsuarioSchema,
  roles: z.array(roleSchema),
  permisos: z.array(z.string()),
});

export type BackendSession = z.infer<typeof backendSessionSchema>;

export function normalizeSession(data: unknown): AuthResponse {
  const parsed = backendSessionSchema.parse(data);
  const usuario: AuthUser = {
    id_usuario: parsed.usuario.id_usuario,
    email: parsed.usuario.email,
    nombre: parsed.usuario.nombre,
    apellido: parsed.usuario.apellido,
    roles: parsed.roles as RoleCode[],
    permisos: parsed.permisos,
  };
  return { token: parsed.token ?? "", usuario };
}

export const authUserSchema = z.object({
  id_usuario: z.number(),
  email: z.string().email(),
  nombre: z.string(),
  apellido: z.string(),
  roles: z.array(roleSchema).min(1),
  permisos: z.array(z.string()),
});

export const authResponseSchema = z.object({
  token: z.string().min(1),
  usuario: authUserSchema,
});

export type GoogleCredential = z.infer<typeof googleCredentialSchema>;
