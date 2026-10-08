import { z } from "zod";

const contactSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre completo")
    .max(60, "Máximo 60 caracteres")
    .regex(/^\p{L}[\p{L}\p{M} '’.-]*$/u, "Solo puede tener letras, espacios, apóstrofos, guiones y puntos"),
  email: z
    .string()
    .trim()
    .email("Ingresá un correo válido")
    .max(120, "Máximo 120 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .regex(/^\+?[\d ()-]+$/, "El teléfono solo puede tener números, espacios, guiones, paréntesis y un + inicial")
    .refine((valor) => {
      const digitos = valor.replace(/\D/g, "").length;
      return digitos >= 7 && digitos <= 15;
    }, "El teléfono debe tener entre 7 y 15 dígitos"),
  tipoAcceso: z.enum(["socio", "profesor", "staff"], {
    errorMap: () => ({ message: "Seleccioná un tipo de acceso" }),
  }),
  mensaje: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
export { contactSchema };
export type LegalModalType = "terms" | "privacy" | null;
