import { useEffect } from "react";
import { z } from "zod";

const contactSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre completo"),
  email: z.string().email("Ingresá un correo válido"),
  telefono: z.string().min(6, "Ingresá un teléfono válido"),
  tipoAcceso: z.enum(["socio", "profesor", "staff"]),
  mensaje: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
export { contactSchema };
export type LegalModalType = "terms" | "privacy" | null;

export function useEscapeToClose(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
