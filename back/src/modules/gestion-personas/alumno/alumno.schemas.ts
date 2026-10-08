import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import {
  dniSchema,
  direccionSchema,
  emailSchema,
  fechaNacimientoSchema,
  nombreSchema,
  telefonoSchema,
} from "../../../shared/utils/esquemas-persona.js";
import { textoBusquedaSchema, textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

// Para columnas que admiten NULL: "" borra el valor, igual que en textoOpcionalSchema.
function opcionalAnulable<T extends z.ZodTypeAny>(esquema: T) {
  return z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
    esquema.nullable(),
  );
}

const fecha_apto_medico = z
  .string({ invalid_type_error: "La fecha debe tener formato AAAA-MM-DD" })
  .date("La fecha debe tener formato AAAA-MM-DD")
  .transform((valor) => new Date(`${valor}T00:00:00Z`))
  .refine((fecha) => fecha <= fechaActualArgentina(), {
    message: "La fecha del apto médico no puede ser futura",
  });

// El tutor se elige entre los usuarios que ya existen o se da de alta con sus datos. Es quien va a
// entrar al sistema, así que el email es obligatorio. El parentesco no se guarda: el DER no lo tiene.
const tutorNuevoSchema = z
  .object({
    nombre: nombreSchema,
    apellido: nombreSchema,
    dni: dniSchema.optional(),
    telefono: telefonoSchema,
    email: emailSchema,
    fecha_nacimiento: fechaNacimientoSchema,
  })
  .strict();

const tutorSchema = z.union([z.object({ id_usuario: idSchema }).strict(), tutorNuevoSchema], {
  errorMap: () => ({ message: "El tutor se indica con su id_usuario o con sus datos completos" }),
});

const datosDelAlumno = {
  dni: dniSchema.optional(),
  telefono: opcionalAnulable(telefonoSchema).optional(),
  direccion: opcionalAnulable(direccionSchema).optional(),
  cont_emerg_nombre: textoOpcionalSchema(80).optional(),
  cont_emerg_telefono: opcionalAnulable(telefonoSchema).optional(),
  apto_medico: z.boolean(),
  fecha_apto_medico: opcionalAnulable(fecha_apto_medico).optional(),
  // Se carga en un textarea, por eso admite saltos de línea.
  observaciones: textoOpcionalSchema(500, { multilinea: true }).optional(),
};

// Que el email y el tutor correspondan a la edad lo decide el service, que calcula la edad con
// el día de Argentina.
export const crearAlumnoSchema = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  email: emailSchema.optional(),
  fecha_nacimiento: fechaNacimientoSchema,
  ...datosDelAlumno,
  apto_medico: datosDelAlumno.apto_medico.default(false),
  tutor: tutorSchema.optional(),
});

export const actualizarAlumnoSchema = z
  .object({
    nombre: nombreSchema.optional(),
    apellido: nombreSchema.optional(),
    email: emailSchema.optional(),
    fecha_nacimiento: fechaNacimientoSchema.optional(),
    ...datosDelAlumno,
    apto_medico: datosDelAlumno.apto_medico.optional(),
    tutor: tutorSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const alumnoIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarAlumnoQuerySchema = z.object({
  busqueda: textoBusquedaSchema(60).optional(),
  dni: dniSchema.optional(),
  estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]).optional(),
  incluirBajas: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
  limit: z
    .string()
    .regex(/^\d{1,3}$/, "limit inválido")
    .transform(Number)
    .pipe(z.number().int().min(1).max(LIMITE_MAXIMO))
    .default(String(LIMITE_POR_DEFECTO)),
  offset: z
    .string()
    .regex(/^\d{1,9}$/, "offset inválido")
    .transform(Number)
    .default("0"),
});

export type CrearAlumnoInput = z.infer<typeof crearAlumnoSchema>;
export type ActualizarAlumnoInput = z.infer<typeof actualizarAlumnoSchema>;
export type TutorInput = z.infer<typeof tutorSchema>;
export type ListarAlumnoQuery = z.infer<typeof listarAlumnoQuerySchema>;
