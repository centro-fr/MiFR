import { z } from "zod";

export const crearUsuarioSchema = z.object({
  google_id: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email(),
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  dni: z.string().trim().min(1).optional(),
  telefono: z.string().trim().min(1).optional(),
  fecha_nacimiento: z.coerce.date().optional(),
  direccion: z.string().trim().min(1).optional(),
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    apellido: z.string().trim().min(1).optional(),
    dni: z.string().trim().min(1).optional(),
    telefono: z.string().trim().min(1).optional(),
    fecha_nacimiento: z.coerce.date().optional(),
    direccion: z.string().trim().min(1).optional(),
    estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const usuarioIdParamSchema = z.object({
  id: z.string().uuid("id inválido"),
});

export const asignarRolSchema = z.object({
  rol: z.enum(["PROPIETARIO", "PROFESORA", "ALUMNO"]),
});

export const rolParamSchema = z.object({
  id: z.string().uuid("id inválido"),
  rol: z.enum(["PROPIETARIO", "PROFESORA", "ALUMNO"]),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type AsignarRolInput = z.infer<typeof asignarRolSchema>;
