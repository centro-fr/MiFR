import { z } from "../../../shared/utils/zod.js";
import { fechaSchema as fecha } from "../../../shared/utils/esquemas-fecha.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import {
  textoBusquedaSchema,
  textoOpcionalSchema,
  textoSchema,
} from "../../../shared/utils/esquemas-texto.js";

// Los videos explicativos van como enlace en las notas (spec 09, fuera de alcance): no se guardan archivos.
const ejercicioSchema = z.object({
  nombre: textoSchema(80),
  series: z.number().int().min(1).max(20),
  // Texto porque admite "12", "8-10" o "30 s".
  repeticiones: textoBusquedaSchema(30).refine((valor) => valor.length > 0, "No puede estar vacío"),
  notas: textoOpcionalSchema(200, { multilinea: true })
    .optional()
    .transform((valor) => valor ?? null),
});

const diaSchema = z.object({
  nombre: textoSchema(60),
  ejercicios: z.array(ejercicioSchema).min(1).max(30),
});

export const contenidoRutinaSchema = z.object({
  dias: z.array(diaSchema).min(1).max(7),
});

// ck_rutinas_fechas del DER: fecha_hasta >= fecha_desde. id_profesora solo lo manda la propietaria;
// una profesora carga siempre a su nombre.
export const crearRutinaSchema = z
  .object({
    id_alumno: idSchema,
    id_profesora: idSchema.optional(),
    nombre: textoSchema(100),
    fecha_desde: fecha,
    fecha_hasta: fecha
      .nullable()
      .optional()
      .transform((valor) => valor ?? null),
    contenido: contenidoRutinaSchema,
    observaciones: textoOpcionalSchema(500, { multilinea: true })
      .optional()
      .transform((valor) => valor ?? null),
  })
  .refine(({ fecha_desde, fecha_hasta }) => fecha_hasta === null || fecha_hasta >= fecha_desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fecha_hasta"],
  });

export const alumnoRutinasParamsSchema = z.object({ id: idDesdeTextoSchema });
export const rutinaIdParamsSchema = z.object({ id: idDesdeTextoSchema });

// Edición parcial: un campo que no viene queda undefined y no se toca; null borra la fecha de fin o
// las observaciones. Con una sola fecha en el pedido, el service la compara con la guardada.
export const actualizarRutinaSchema = z
  .object({
    nombre: textoSchema(100).optional(),
    fecha_desde: fecha.optional(),
    fecha_hasta: fecha.nullable().optional(),
    contenido: contenidoRutinaSchema.optional(),
    observaciones: textoOpcionalSchema(500, { multilinea: true }).optional(),
  })
  .refine(
    ({ fecha_desde, fecha_hasta }) =>
      fecha_desde === undefined ||
      fecha_hasta === undefined ||
      fecha_hasta === null ||
      fecha_hasta >= fecha_desde,
    {
      message: "La fecha de fin no puede ser anterior a la de inicio",
      path: ["fecha_hasta"],
    },
  );

export type ContenidoRutina = z.infer<typeof contenidoRutinaSchema>;
export type CrearRutinaInput = z.infer<typeof crearRutinaSchema>;
export type ActualizarRutinaInput = z.infer<typeof actualizarRutinaSchema>;
