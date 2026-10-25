import { z } from "zod";

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
  }),
});

export type ProfesoraApi = z.infer<typeof profesoraApiSchema>;

export const crearProfesoraSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  apellido: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres").max(60),
  email: z.string().trim().toLowerCase().email("Ingresá un correo electrónico válido").max(120),
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
    especialidad: api.especialidad ?? null,
    fechaAlta: api.fecha_alta,
    fechaBaja: api.fecha_baja,
    activa: api.fecha_baja === null,
  };
}
