import { z } from "zod";

const CODIGOS_ROL = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"] as const;

const cambioPermisoSchema = z.object({
  rol: z.enum(CODIGOS_ROL),
  permiso: z.string().trim().toUpperCase().min(1).max(50),
  otorgado: z.boolean(),
});

export const actualizarMatrizSchema = z.object({
  cambios: z
    .array(cambioPermisoSchema)
    .min(1, "Debe enviar al menos un cambio")
    .refine((cambios) => new Set(cambios.map((c) => `${c.rol}:${c.permiso}`)).size === cambios.length, {
      message: "Hay más de un cambio para el mismo rol y permiso",
    }),
});

export type CambioPermiso = z.infer<typeof cambioPermisoSchema>;
