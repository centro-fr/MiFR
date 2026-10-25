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

export const crearProfesoraFormSchema = z.object({
  id_usuario: z.number({ required_error: "Debes seleccionar un usuario" }).positive("Usuario inválido"),
  especialidad: z
    .string()
    .trim()
    .max(80, "La especialidad no puede superar los 80 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CrearProfesoraFormData = z.infer<typeof crearProfesoraFormSchema>;

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
