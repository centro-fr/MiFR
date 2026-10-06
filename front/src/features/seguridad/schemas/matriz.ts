import { z } from "zod";
import { roleSchema } from "@/features/auth/schemas/auth";

const permisoMatrizSchema = z.object({
  id_permiso: z.number(),
  codigo: z.string().min(1).max(50),
  descripcion: z.string().nullable(),
  critico: z.boolean(),
});

const moduloMatrizSchema = z.object({
  modulo: z.string().min(1),
  permisos: z.array(permisoMatrizSchema),
});

const rolMatrizSchema = z.object({
  id_rol: z.number(),
  codigo: roleSchema,
  nombre: z.string(),
});

export const matrizResponseSchema = z.object({
  roles: z.array(rolMatrizSchema).min(1),
  modulos: z.array(moduloMatrizSchema).min(1),
  matriz: z.object({
    PROPIETARIA: z.array(z.string()),
    PROFESORA: z.array(z.string()),
    ALUMNO: z.array(z.string()),
    TUTOR: z.array(z.string()),
  }),
});
