import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import {
  dniSchema,
  direccionSchema,
  emailSchema,
  fechaNacimientoSchema,
  nombreSchema,
  telefonoSchema,
} from "../../../shared/utils/esquemas-persona.js";

// Largos y obligatoriedad según la tabla "usuarios" del DER.
const CODIGOS_ROL = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"] as const;

// El identificador "sub" que entrega Google: alfanumérico, sin espacios.
const google_id = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/, "google_id inválido");

const nombre = nombreSchema;
const dni = dniSchema;
const telefono = telefonoSchema;
const direccion = direccionSchema;
const fecha_nacimiento = fechaNacimientoSchema;

export const crearUsuarioSchema = z.object({
  google_id: google_id.optional(),
  // Opcional: los menores a cargo de un tutor no tienen email.
  email: emailSchema.optional(),
  nombre,
  apellido: nombre,
  dni: dni.optional(),
  telefono: telefono.optional(),
  fecha_nacimiento,
  direccion: direccion.optional(),
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: nombre.optional(),
    apellido: nombre.optional(),
    dni: dni.optional(),
    telefono: telefono.optional(),
    fecha_nacimiento: fecha_nacimiento.optional(),
    direccion: direccion.optional(),
    estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const usuarioIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const asignarRolSchema = z.object({
  rol: z.enum(CODIGOS_ROL),
});

export const rolParamSchema = usuarioIdParamSchema.extend({
  rol: z.enum(CODIGOS_ROL),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
