import { z } from "../../../shared/utils/zod.js";
import { CATALOGO_PERMISOS, CATALOGO_ROLES } from "./rol.catalogo.js";

const CODIGOS_ROL = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"] as const;

const cambioPermisoSchema = z.object({
  rol: z.enum(CODIGOS_ROL),
  permiso: z.string().trim().toUpperCase().min(1).max(50),
  otorgado: z.boolean(),
});

// Como no puede haber dos cambios para el mismo rol y permiso, un pedido válido nunca trae más
// cambios que pares rol-permiso hay en el catálogo. Sale del catálogo para crecer con él.
const MAXIMO_CAMBIOS = CATALOGO_ROLES.length * CATALOGO_PERMISOS.length;

export const actualizarMatrizSchema = z.object({
  cambios: z
    .array(cambioPermisoSchema)
    .min(1, "Debe enviar al menos un cambio")
    .max(MAXIMO_CAMBIOS, `No se pueden enviar más de ${MAXIMO_CAMBIOS} cambios`)
    .refine((cambios) => new Set(cambios.map((c) => `${c.rol}:${c.permiso}`)).size === cambios.length, {
      message: "Hay más de un cambio para el mismo rol y permiso",
    }),
});

export type CambioPermiso = z.infer<typeof cambioPermisoSchema>;
