import { z } from "zod";
import { roleSchema } from "@/features/auth/schemas/auth";

// Contrato real del back (módulo rol: rol.openapi.ts y rol.schemas.ts):
// GET /seguridad/matriz → { roles, modulos, matriz }
// PUT /seguridad/matriz ← { cambios: [{ rol, permiso, otorgado }] }
//
// Ojo con las diferencias sutiles respecto del back:
// - El GET no exige mínimos ni largos: `matriz` es un record por código de rol
//   (si mañana hay un 5.º rol, no debe romper el parse) y los arrays pueden
//   venir vacíos (la página tiene estado vacío para eso).
// - `codigo` del GET no tiene max: el max(50) vive solo en el PUT.

const permisoMatrizSchema = z.object({
  id_permiso: z.number().int(),
  codigo: z.string().min(1),
  descripcion: z.string().nullable(),
  critico: z.boolean(),
});

const moduloMatrizSchema = z.object({
  modulo: z.string().min(1),
  permisos: z.array(permisoMatrizSchema),
});

const rolMatrizSchema = z.object({
  id_rol: z.number().int(),
  codigo: roleSchema,
  nombre: z.string(),
});

export const matrizResponseSchema = z.object({
  roles: z.array(rolMatrizSchema),
  modulos: z.array(moduloMatrizSchema),
  matriz: z.record(z.array(z.string())),
});

// Espejo del PUT del back (actualizarMatrizSchema): cambios no vacíos, sin
// duplicados por (rol, permiso), permiso en mayúsculas de hasta 50 caracteres.
export const cambioPermisoSchema = z.object({
  rol: roleSchema,
  permiso: z.string().trim().toUpperCase().min(1).max(50),
  otorgado: z.boolean(),
});

export const actualizarMatrizBodySchema = z.object({
  cambios: z
    .array(cambioPermisoSchema)
    .min(1, "Debe enviar al menos un cambio")
    .refine((cambios) => new Set(cambios.map((c) => `${c.rol}:${c.permiso}`)).size === cambios.length, {
      message: "Hay más de un cambio para el mismo rol y permiso",
    }),
});
