import { z } from "zod";

// Contrato de /api/v1/alumnos (back: alumno.openapi.ts e inscripcion.openapi.ts).

export const estadoAlumnoSchema = z.enum(["ACTIVO", "INACTIVO", "BAJA"]);

// DatosPersonales del back: las columnas de usuarios que viajan con el alumno y con su tutor.
const datosPersonalesApiSchema = z.object({
  id_usuario: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  fecha_nacimiento: z.string(),
  direccion: z.string().nullable(),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

// FichaAlumno del back. También trae `inscripciones` (plan, precio, horarios): se va a leer
// cuando exista la pestaña "Plan y horarios"; hasta entonces Zod la descarta.
export const fichaAlumnoApiSchema = z.object({
  id_alumno: z.number().int(),
  id_usuario: z.number().int(),
  id_usuario_responsable: z.number().int().nullable(),
  cont_emerg_nombre: z.string().nullable(),
  cont_emerg_telefono: z.string().nullable(),
  apto_medico: z.boolean(),
  fecha_apto_medico: z.string().nullable(),
  observaciones: z.string().nullable(),
  estado: estadoAlumnoSchema,
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  usuario: datosPersonalesApiSchema,
  responsable: datosPersonalesApiSchema.nullable(),
});

export type FichaAlumnoApi = z.infer<typeof fichaAlumnoApiSchema>;

// darDeBajaAlumnoSchema del back: el enum inscripciones.motivo_baja del DER sin CAMBIO_PLAN,
// que lo pone solo el cambio de plan (un alumno que se va no cambia de plan).
export const motivoBajaSchema = z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "OTRO"], {
  required_error: "Elegí el motivo de la baja.",
  invalid_type_error: "Elegí el motivo de la baja.",
});

// Texto libre que acompaña a "Otro motivo". El back todavía no lo guarda (falta el campo).
export const LARGO_MAXIMO_DETALLE_BAJA = 200;

export const bajaAlumnoFormSchema = z.object({
  motivo: motivoBajaSchema,
  detalle: z
    .string()
    .trim()
    .max(LARGO_MAXIMO_DETALLE_BAJA, `Usá hasta ${LARGO_MAXIMO_DETALLE_BAJA} caracteres.`)
    .optional(),
});

// Cuerpo de POST /alumnos/:id/baja.
export const bajaAlumnoBodySchema = z.object({ motivo_baja: motivoBajaSchema });

export type BajaAlumnoBody = z.infer<typeof bajaAlumnoBodySchema>;
