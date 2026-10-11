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

export const CUPO_MAXIMO_PERSONALIZADA = 40;
export const CUPO_MAXIMO_GRUPAL = 60;

const cupoMaximoSchema = z
  .number({ invalid_type_error: "El cupo tiene que ser un número" })
  .int("El cupo tiene que ser un número entero")
  .positive("El cupo tiene que ser mayor a cero")
  .max(CUPO_MAXIMO_GRUPAL, `El cupo máximo no puede superar los ${CUPO_MAXIMO_GRUPAL} alumnos`)
  .nullable();

const CARACTER_NO_PERMITIDO = /[\p{Cc}\p{Cf}]/u;
const CARACTER_NO_PERMITIDO_MULTILINEA = /(?![\n\r])[\p{Cc}\p{Cf}]/u;
const TIENE_LETRA = /\p{L}/u;

// Mismas reglas que crearActividadSchema del back, con mensajes para el formulario.
export const actividadFormSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "El código es obligatorio")
      .max(20, "Máximo 20 caracteres")
      .regex(
        /^(?=.*[A-Z])[A-Z0-9_-]+$/,
        "El código solo puede tener letras sin acento, números, guion y guion bajo, con al menos una letra",
      ),
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(60, "Máximo 60 caracteres")
      .refine((v) => !CARACTER_NO_PERMITIDO.test(v), "Contiene caracteres no permitidos")
      .refine((v) => TIENE_LETRA.test(v), "El nombre debe contener al menos una letra"),
    descripcion: z
      .string()
      .trim()
      .max(255, "Máximo 255 caracteres")
      .refine((v) => v === "" || !CARACTER_NO_PERMITIDO_MULTILINEA.test(v), "Contiene caracteres no permitidos")
      .refine((v) => v === "" || TIENE_LETRA.test(v), "La descripción debe contener al menos una letra"),
    modalidad: modalidadActividadSchema,
    cupoMaximo: cupoMaximoSchema,
  })
  .refine((datos) => datos.modalidad !== "PERSONALIZADA" || datos.cupoMaximo !== null, {
    message: "El cupo máximo es obligatorio para la modalidad personalizada",
    path: ["cupoMaximo"],
  })
  .refine(
    (datos) =>
      datos.modalidad !== "PERSONALIZADA" ||
      datos.cupoMaximo === null ||
      datos.cupoMaximo <= CUPO_MAXIMO_PERSONALIZADA,
    {
      message: `El cupo máximo no puede superar los ${CUPO_MAXIMO_PERSONALIZADA} alumnos para clases personalizadas`,
      path: ["cupoMaximo"],
    },
  )
  .refine(
    (datos) =>
      datos.modalidad !== "GRUPAL" ||
      datos.cupoMaximo === null ||
      datos.cupoMaximo <= CUPO_MAXIMO_GRUPAL,
    {
      message: `El cupo máximo no puede superar los ${CUPO_MAXIMO_GRUPAL} alumnos para clases grupales`,
      path: ["cupoMaximo"],
    },
  );

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
