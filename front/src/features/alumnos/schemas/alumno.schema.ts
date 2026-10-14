import { z } from "zod";
import { calcularEdad, esMenorDeEdad, obtenerLimitesFechaNacimiento } from "../utils/edad";

export const nombrePersona = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(60, "Máximo 60 caracteres")
  .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede contener letras, espacios y guiones");

export const apellidoPersona = z
  .string()
  .trim()
  .min(1, "El apellido es obligatorio")
  .max(60, "Máximo 60 caracteres")
  .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede contener letras, espacios y guiones");

// DNI argentino: 7 u 8 dígitos. Sin ceros adelante, como exige el back: "01234567" y "1234567"
// serían dos personas distintas para el índice único de la base.
export const dniPersona = z
  .string()
  .trim()
  .regex(/^[1-9]\d{6,7}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos ni ceros adelante");

// Las mismas reglas que textoOpcionalSchema del back: si no, el error aparecería recién al confirmar
// en el paso 4, y como un rechazo genérico del servidor.
const CARACTER_NO_PERMITIDO = /[\p{Cc}\p{Cf}]/u;
const CARACTER_NO_PERMITIDO_MULTILINEA = /(?![\n\r])[\p{Cc}\p{Cf}]/u;
const LETRA = /\p{L}/u;

function textoLibreOpcional(maximo: number, { multilinea = false } = {}) {
  const noPermitido = multilinea ? CARACTER_NO_PERMITIDO_MULTILINEA : CARACTER_NO_PERMITIDO;
  return z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .refine((valor) => !noPermitido.test(valor), "Contiene caracteres no permitidos")
    .refine((valor) => valor === "" || LETRA.test(valor), "Debe contener al menos una letra")
    .optional();
}

export const telefonoPersona = z
  .string()
  .trim()
  .max(20, "Máximo 20 caracteres")
  .regex(/^\+?[\d(][\d ()-]*$/, "Solo dígitos, espacios, guiones y un + inicial")
  .refine((val) => {
    const digits = val.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "El teléfono debe tener entre 7 y 15 dígitos");

export const emailPersona = z
  .string()
  .trim()
  .toLowerCase()
  .email("Formato de correo electrónico inválido")
  .max(120, "Máximo 120 caracteres");

export const fechaNacimientoRegex = z
  .string()
  .min(1, "La fecha de nacimiento es obligatoria")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida (dd/mm/aaaa)")
  .refine((val) => {
    const d = new Date(`${val}T00:00:00`);
    if (isNaN(d.getTime())) return false;
    const hoy = new Date();
    return d <= hoy;
  }, "La fecha de nacimiento no puede ser futura")
  .refine((val) => {
    const edad = calcularEdad(val);
    return edad !== null;
  }, "La edad no puede superar los 120 años");

export const tutorFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre del tutor es obligatorio")
      .max(60, "Máximo 60 caracteres")
      .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede contener letras, espacios y guiones"),
    apellido: z
      .string()
      .trim()
      .min(1, "El apellido del tutor es obligatorio")
      .max(60, "Máximo 60 caracteres")
      .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede contener letras, espacios y guiones"),
    dni: dniPersona.optional().or(z.literal("")),
    telefono: z
      .string()
      .trim()
      .min(1, "El teléfono del tutor es obligatorio")
      .max(20, "Máximo 20 caracteres")
      .regex(/^\+?[\d(][\d ()-]*$/, "Solo dígitos, espacios, guiones y un + inicial")
      .refine((val) => {
        const digits = val.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      }, "El teléfono debe tener entre 7 y 15 dígitos"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "El correo del tutor es obligatorio para acceder al sistema")
      .email("Formato de correo electrónico inválido")
      .max(120, "Máximo 120 caracteres"),
    fecha_nacimiento: z
      .string()
      .trim()
      .min(1, "La fecha de nacimiento del tutor es obligatoria")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida (dd/mm/aaaa)")
      .refine((val) => {
        const d = new Date(`${val}T00:00:00`);
        if (isNaN(d.getTime())) return false;
        const hoy = new Date();
        return d <= hoy;
      }, "La fecha de nacimiento no puede ser futura")
      .refine((val) => {
        const edad = calcularEdad(val);
        return edad !== null;
      }, "La edad del tutor no puede superar los 120 años"),
  })
  .superRefine((data, ctx) => {
    if (data.fecha_nacimiento && esMenorDeEdad(data.fecha_nacimiento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El tutor debe ser mayor de edad",
        path: ["fecha_nacimiento"],
      });
    }
  });

export const alumnoFormSchema = z
  .object({
    nombre: nombrePersona,
    apellido: apellidoPersona,
    dni: dniPersona.optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().optional().or(z.literal("")),
    fecha_nacimiento: fechaNacimientoRegex,
    telefono: z.string().trim().optional().or(z.literal("")),
    direccion: textoLibreOpcional(120),
    cont_emerg_nombre: textoLibreOpcional(80),
    cont_emerg_telefono: z.string().trim().optional().or(z.literal("")),
    apto_medico: z.boolean().default(false),
    fecha_apto_medico: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida (dd/mm/aaaa)")
      .optional()
      .or(z.literal("")),
    observaciones: textoLibreOpcional(500, { multilinea: true }),

    // Datos del Tutor Legal (US-06): flexible en el esquema base, validado estrictamente en superRefine solo para menores
    tutor: z
      .object({
        nombre: z.string().optional(),
        apellido: z.string().optional(),
        dni: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().optional(),
        fecha_nacimiento: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const menor = esMenorDeEdad(data.fecha_nacimiento);

    if (menor) {
      // Si es menor, el tutor es OBLIGATORIO
      if (!data.tutor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Al ser menor de 18 años, los datos del tutor legal son obligatorios.",
          path: ["tutor"],
        });
      } else {
        const resultadoTutor = tutorFormSchema.safeParse(data.tutor);
        if (!resultadoTutor.success) {
          resultadoTutor.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ["tutor", ...issue.path],
            });
          });
        }
      }
    }

    // Si el alumno es menor de edad, el email NO aplica (ingresa su tutor legal)
    // Para mayores de edad, el email es obligatorio porque es su credencial de acceso al sistema
    if (!menor) {
      if (!data.email || data.email.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El correo electrónico es obligatorio para alumnos mayores",
          path: ["email"],
        });
      } else {
        const resultadoEmail = emailPersona.safeParse(data.email);
        if (!resultadoEmail.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: resultadoEmail.error.issues[0]?.message ?? "Formato de correo electrónico inválido",
            path: ["email"],
          });
        }
      }
    }

    // El teléfono de contacto del alumno es obligatorio solo para mayores de edad (su único contacto).
    // Para menores de edad es opcional, ya que el contacto obligatorio es el tutor legal (US-06).
    if (!menor) {
      if (!data.telefono || data.telefono.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El teléfono de contacto es obligatorio para alumnos mayores",
          path: ["telefono"],
        });
      }
    }

    if (data.telefono && data.telefono.trim() !== "") {
      const resTel = telefonoPersona.safeParse(data.telefono);
      if (!resTel.success) {
        resTel.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["telefono"],
          });
        });
      }
    }

    validarAptoMedico(data, ctx);

    // Validar teléfono de emergencia si se completó
    if (data.cont_emerg_telefono && data.cont_emerg_telefono.trim() !== "") {
      const resEmerg = telefonoPersona.safeParse(data.cont_emerg_telefono);
      if (!resEmerg.success) {
        resEmerg.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            message: "El teléfono de emergencia debe tener entre 7 y 15 dígitos",
            path: ["cont_emerg_telefono"],
          });
        });
      }
    }
  });

// Igual que el formulario de edición (alumno.ts): con el apto marcado, la fecha es obligatoria.
function validarAptoMedico(data: { apto_medico: boolean; fecha_apto_medico?: string; fecha_nacimiento: string }, ctx: z.RefinementCtx) {
  if (!data.apto_medico) return;
  const agregar = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fecha_apto_medico"], message });
  const fecha = data.fecha_apto_medico?.trim();
  if (!fecha) return agregar("Ingresá la fecha del apto médico");
  if (fecha > obtenerLimitesFechaNacimiento().max) return agregar("La fecha del apto médico no puede ser futura");
  if (data.fecha_nacimiento && fecha < data.fecha_nacimiento) agregar("La fecha del apto médico no puede ser anterior al nacimiento");
}

export type AlumnoFormData = z.infer<typeof alumnoFormSchema>;
export type TutorFormData = z.infer<typeof tutorFormSchema>;
