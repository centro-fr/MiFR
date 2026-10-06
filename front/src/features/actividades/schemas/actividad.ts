import { z } from "zod";

// Contrato de /api/v1/actividades (back: actividad.schemas.ts y actividad.openapi.ts).

export const modalidadActividadSchema = z.enum(["GRUPAL", "PERSONALIZADA"]);

export const actividadApiSchema = z.object({
  id_actividad: z.number().int(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  modalidad: modalidadActividadSchema,
  cupo_maximo: z.number().int().nullable(),
  activo: z.boolean(),
});

export type ActividadApi = z.infer<typeof actividadApiSchema>;

const cupoMaximoSchema = z
  .number({ invalid_type_error: "El cupo tiene que ser un número" })
  .int("El cupo tiene que ser un número entero")
  .positive("El cupo tiene que ser mayor a cero")
  .max(32767, "El cupo es demasiado grande")
  .nullable();

// Mismas reglas que crearActividadSchema del back, con mensajes para el formulario.
export const actividadFormSchema = z
  .object({
    codigo: z.string().trim().min(1, "El código es obligatorio").max(20, "Máximo 20 caracteres"),
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60, "Máximo 60 caracteres"),
    descripcion: z.string().trim().max(255, "Máximo 255 caracteres"),
    modalidad: modalidadActividadSchema,
    cupoMaximo: cupoMaximoSchema,
  })
  .refine((datos) => datos.modalidad !== "PERSONALIZADA" || datos.cupoMaximo !== null, {
    message: "El cupo máximo es obligatorio para la modalidad personalizada",
    path: ["cupoMaximo"],
  });

export type ActividadFormData = z.infer<typeof actividadFormSchema>;

export interface CrearActividadBody {
  codigo: string;
  nombre: string;
  descripcion?: string;
  modalidad: ActividadApi["modalidad"];
  cupo_maximo: number | null;
}

// El código no se puede cambiar: el back no lo acepta en el PATCH.
export type ActualizarActividadBody = Omit<CrearActividadBody, "codigo">;
