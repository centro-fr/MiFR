import { z } from "zod";

export const googleCredentialSchema = z.object({
  idToken: z.string().min(1, "Token de Google requerido"),
});

export const roleSchema = z.enum(["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"]);

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
