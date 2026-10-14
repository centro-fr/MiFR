import { z } from "zod";
import { montoDeCobroSchema } from "@/features/cobros/schemas/cobro-efectivo.schema";

const LETRA = /\p{L}/u;

/**
 * Transferencia que informan la propietaria o la profesora desde Estado de cuotas: queda pendiente
 * de verificación (US-17). La fecha y hora no se cargan: se toma el momento de la confirmación.
 * El monto distinto del precio se acepta y se confirma al aprobarla, como en el back.
 */
export const informarTransferenciaCobroSchema = z.object({
  monto: montoDeCobroSchema("Ingresá el monto transferido"),
  // Mismas reglas que textoOpcionalSchema(80) del back.
  titular: z
    .string()
    .trim()
    .max(80, "Máximo 80 caracteres.")
    .refine((valor) => valor === "" || LETRA.test(valor), "El titular tiene que tener al menos una letra."),
});

export type InformarTransferenciaCobroValores = z.input<typeof informarTransferenciaCobroSchema>;
