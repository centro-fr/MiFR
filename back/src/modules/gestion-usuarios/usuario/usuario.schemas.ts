import { z } from "zod";

// Largos y obligatoriedad según la tabla "usuarios" del DER.
const CODIGOS_ROL = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"] as const;

const nombre = z.string().trim().min(1).max(60);
const dni = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, "El dni debe tener solo dígitos (máximo 10)");
const telefono = z.string().trim().min(1).max(20);
const direccion = z.string().trim().min(1).max(120);

export const crearUsuarioSchema = z.object({
  google_id: z.string().trim().min(1).max(255).optional(),
  // Opcional: los menores a cargo de un tutor no tienen email.
  email: z.string().trim().toLowerCase().email().max(120).optional(),
  nombre,
  apellido: nombre,
  dni: dni.optional(),
  telefono: telefono.optional(),
  fecha_nacimiento: z.coerce.date(),
  direccion: direccion.optional(),
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: nombre.optional(),
    apellido: nombre.optional(),
    dni: dni.optional(),
    telefono: telefono.optional(),
    fecha_nacimiento: z.coerce.date().optional(),
    direccion: direccion.optional(),
    estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const usuarioIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: "id inválido" }).int("id inválido").positive("id inválido"),
});

export const asignarRolSchema = z.object({
  rol: z.enum(CODIGOS_ROL),
});

export const rolParamSchema = usuarioIdParamSchema.extend({
  rol: z.enum(CODIGOS_ROL),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type AsignarRolInput = z.infer<typeof asignarRolSchema>;
