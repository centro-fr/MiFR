import { z } from "zod";

export const googleLoginSchema = z.object({
  id_token: z.string().trim().min(1),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const loginDesarrolloSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
