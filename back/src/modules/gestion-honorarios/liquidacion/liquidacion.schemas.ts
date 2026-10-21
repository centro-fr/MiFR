import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";

// AAAA-MM: se convierte en el primer y el último día del mes. Date.UTC(anio, mes, 0) es el día 0
// del mes siguiente, o sea el último de este (también en febrero de un año bisiesto).
export const periodoSchema = z
  .string({
    required_error: "El período es obligatorio",
    invalid_type_error: "El período debe tener formato AAAA-MM",
  })
  .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "El período debe tener formato AAAA-MM")
  .transform((periodo) => {
    const [anio = 0, mes = 0] = periodo.split("-").map(Number);
    return {
      periodo,
      desde: new Date(Date.UTC(anio, mes - 1, 1)),
      hasta: new Date(Date.UTC(anio, mes, 0)),
    };
  });

export const generarLiquidacionesSchema = z.object({ periodo: periodoSchema });

export const listarLiquidacionesQuerySchema = z.object({ periodo: periodoSchema });

export const liquidacionIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export type GenerarLiquidacionesInput = z.infer<typeof generarLiquidacionesSchema>;
export type ListarLiquidacionesQuery = z.infer<typeof listarLiquidacionesQuerySchema>;
