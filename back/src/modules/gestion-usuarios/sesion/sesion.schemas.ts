import { z } from "zod";

// Un id_token de Google ronda los 1,5 KB: el tope corta antes de verificar la firma un texto que no
// puede ser un token.
const LARGO_MAXIMO_ID_TOKEN = 4096;

export const googleLoginSchema = z.object({
  id_token: z.string().trim().min(1).max(LARGO_MAXIMO_ID_TOKEN),
});

// Mismo largo que usuarios.email en el DER: un email más largo no puede estar dado de alta.
export const loginDesarrolloSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
});
