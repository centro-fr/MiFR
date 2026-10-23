import { z } from "zod";

const fechaApi = z.string().transform((valor) => valor.slice(0, 10));

export const promocionApiSchema = z.object({
  id_promocion: z.number().int().positive(),
  codigo: z.string(),
  nombre: z.string(),
  tipo_descuento: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
  valor: z.union([z.number(), z.string()]).transform(Number).refine(Number.isFinite, "Valor inválido"),
  fecha_desde: fechaApi,
  fecha_hasta: fechaApi,
  activo: z.boolean(),
  planes: z.array(z.object({ id_plan: z.number().int().positive(), nombre: z.string() })),
  estado: z.enum(["ACTIVA", "PROGRAMADA", "VENCIDA", "DESACTIVADA"]),
});

const fecha = z.string().date("Ingresá una fecha válida.");

export const promocionFormSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, "Ingresá un código.")
      .max(20, "Usá hasta 20 caracteres.")
      .regex(/^[A-Za-z0-9_-]+$/, "Usá letras sin acentos, números, guiones o guiones bajos."),
    nombre: z.string().trim().min(1, "Ingresá el nombre.").max(60, "Usá hasta 60 caracteres."),
    tipoDescuento: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
    valor: z
      .string()
      .trim()
      .regex(/^\d+(?:[.,]\d{1,2})?$/, "Ingresá un valor positivo."),
    fechaDesde: fecha,
    fechaHasta: fecha,
    idsPlanes: z.array(z.string()).min(1, "Elegí al menos un plan."),
  })
  .superRefine((datos, contexto) => {
    const valor = Number(datos.valor.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      contexto.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "El valor debe ser mayor a cero." });
    }
    if (datos.tipoDescuento === "PORCENTAJE" && valor >= 100) {
      contexto.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "El porcentaje debe ser menor al 100 %." });
    }
    if (datos.fechaHasta < datos.fechaDesde) {
      contexto.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaHasta"], message: "La fecha hasta no puede ser anterior." });
    }
  });

export type PromocionFormValues = z.infer<typeof promocionFormSchema>;

export interface PromocionBody {
  codigo: string;
  nombre: string;
  tipo_descuento: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  fecha_desde: string;
  fecha_hasta: string;
  ids_planes: number[];
}
