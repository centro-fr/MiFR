import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { textoSchema } from "../../../shared/utils/esquemas-texto.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";

// Largos y obligatoriedad según la tabla "usuarios" del DER.
const CODIGOS_ROL = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"] as const;

// Letras de cualquier idioma, con espacios, apóstrofo, guion y punto entre ellas ("María José",
// "O'Neill", "Pérez-Rua", "Ma. Inés"). Empieza con letra, así que "-0" o "123" no pasan.
const nombre = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede tener letras, espacios, apóstrofos, guiones y puntos");
// DNI argentino o identificador equivalente: sin puntos y sin ceros adelante, que harían que
// "01234567" y "1234567" fueran dos personas distintas para el único de la base.
const dni = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5,9}$/, "El dni debe tener entre 6 y 10 dígitos, sin puntos ni ceros adelante");
// Se guarda como lo escribe la persona, pero con un número de dígitos plausible: E.164 admite
// hasta 15 y ningún teléfono real tiene menos de 7.
const telefono = z
  .string()
  .trim()
  .max(20)
  .regex(
    /^\+?[\d ()-]+$/,
    "El teléfono solo puede tener dígitos, espacios, guiones, paréntesis y un + inicial",
  )
  .refine((valor) => {
    const digitos = valor.replace(/\D/g, "").length;
    return digitos >= 7 && digitos <= 15;
  }, "El teléfono debe tener entre 7 y 15 dígitos");
const direccion = textoSchema(120);
// El identificador "sub" que entrega Google: alfanumérico, sin espacios.
const google_id = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/, "google_id inválido");

const FECHA_NACIMIENTO_MINIMA = "1900-01-01";

// Compara solo el día (AAAA-MM-DD), que es lo que guarda la columna DATE.
function diaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// En JSON la fecha llega como texto. z.coerce.date() a secas también aceptaba null, 0 o true
// y los convertía en 1970-01-01: primero se exige un texto con una fecha que exista en el
// calendario (date y datetime ya lo validan) y recién después se convierte.
const fecha_nacimiento = z
  .union([z.string().date("La fecha no existe"), z.string().datetime({ message: "La fecha no existe" })], {
    errorMap: () => ({ message: "La fecha debe tener formato AAAA-MM-DD" }),
  })
  .transform((valor) => new Date(valor))
  .refine((fecha) => diaIso(fecha) >= FECHA_NACIMIENTO_MINIMA, {
    message: `La fecha de nacimiento no puede ser anterior a ${FECHA_NACIMIENTO_MINIMA}`,
  })
  // El "hoy" es el de Argentina y se calcula en cada validación, no al cargar el módulo.
  .refine((fecha) => diaIso(fecha) <= diaIso(fechaActualArgentina()), {
    message: "La fecha de nacimiento no puede ser futura",
  });

export const crearUsuarioSchema = z.object({
  google_id: google_id.optional(),
  // Opcional: los menores a cargo de un tutor no tienen email.
  email: z.string().trim().toLowerCase().email().max(120).optional(),
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
