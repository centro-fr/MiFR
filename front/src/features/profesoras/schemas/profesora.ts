import { z } from "zod";
import { esMenorDeEdad } from "@/features/alumnos/utils/edad";

export const telefonoRegex = /^\+?[\d(][\d ()-]*$/;

export const profesoraApiSchema = z.object({
  id_profesora: z.number().int(),
  id_usuario: z.number().int(),
  especialidad: z.string().nullable(),
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  usuario: z.object({
    nombre: z.string(),
    apellido: z.string(),
    email: z.string().optional(),
    telefono: z.string().nullable().optional(),
    fecha_nacimiento: z.string().nullable().optional(),
  }),
});

export type ProfesoraApi = z.infer<typeof profesoraApiSchema>;

export const crearProfesoraSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  apellido: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres").max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un correo electrónico válido")
    .max(120),
  telefono: z
    .string()
    .trim()
    .min(1, "El teléfono de contacto es obligatorio")
    .max(20, "Máximo 20 caracteres")
    .regex(telefonoRegex, "El teléfono solo puede contener dígitos, espacios, paréntesis y guiones")
    .refine((val) => {
      const digits = val.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "El teléfono debe tener entre 7 y 15 dígitos"),
  fecha_nacimiento: z
    .string()
    .min(1, "La fecha de nacimiento es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida (dd/mm/aaaa)")
    .refine((val) => {
      const d = new Date(`${val}T00:00:00`);
      return !isNaN(d.getTime()) && d <= new Date();
    }, "La fecha de nacimiento no puede ser futura")
    .refine((val) => !esMenorDeEdad(val), "La profesora debe ser mayor de edad (al menos 18 años)"),
  especialidad: z
    .string()
    .trim()
    .max(80, "La especialidad no puede superar los 80 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CrearProfesoraInput = z.infer<typeof crearProfesoraSchema>;

export interface Profesora {
  id: number;
  idUsuario: number;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  especialidad: string | null;
  fechaAlta: string;
  fechaBaja: string | null;
  activa: boolean;
}

export function normalizarProfesora(api: ProfesoraApi): Profesora {
  return {
    id: api.id_profesora,
    idUsuario: api.id_usuario,
    nombreCompleto: `${api.usuario.nombre} ${api.usuario.apellido}`.trim(),
    nombre: api.usuario.nombre,
    apellido: api.usuario.apellido,
    email: api.usuario.email,
    telefono: api.usuario.telefono ?? null,
    fechaNacimiento: api.usuario.fecha_nacimiento ?? null,
    especialidad: api.especialidad ?? null,
    fechaAlta: api.fecha_alta,
    fechaBaja: api.fecha_baja,
    activa: api.fecha_baja === null,
  };
}

export const usuarioDetalleProfesoraSchema = z.object({
  id_usuario: z.number().int(),
  email: z.string().nullable().optional(),
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  fecha_nacimiento: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  estado: z.string().optional(),
});

export type UsuarioDetalleProfesora = z.infer<typeof usuarioDetalleProfesoraSchema>;

export const actualizarDatosProfesoraSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  apellido: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres").max(60),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener entre 7 y 8 dígitos")
    .optional()
    .or(z.literal("")),
  telefono: z
    .string()
    .trim()
    .min(1, "El teléfono de contacto es obligatorio")
    .max(20, "Máximo 20 caracteres")
    .regex(telefonoRegex, "El teléfono solo puede contener dígitos, espacios, paréntesis y guiones")
    .refine((val) => {
      const digits = val.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "El teléfono debe tener entre 7 y 15 dígitos"),
  fecha_nacimiento: z
    .string()
    .min(1, "La fecha de nacimiento es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida (aaaa-mm-dd)")
    .refine((val) => {
      const d = new Date(`${val}T00:00:00`);
      return !isNaN(d.getTime()) && d <= new Date();
    }, "La fecha de nacimiento no puede ser futura")
    .refine((val) => !esMenorDeEdad(val), "La profesora debe ser mayor de edad (al menos 18 años)"),
  direccion: z
    .string()
    .trim()
    .max(120, "La dirección no puede superar los 120 caracteres")
    .optional()
    .or(z.literal("")),
});

export type ActualizarDatosProfesoraInput = z.infer<typeof actualizarDatosProfesoraSchema>;

export function parsearEspecialidades(especialidad: string | null | undefined): string[] {
  if (!especialidad) return [];
  return especialidad
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function formatearEspecialidades(actividades: string[]): string {
  return actividades.map((a) => a.trim()).filter(Boolean).join(", ");
}
