import { z } from "zod";
import { alumnoApiSchema } from "@/features/alumnos/schemas/alumno";

// Contrato de US-07 (back: inscripcion.openapi.ts, alumno.openapi.ts y pago.openapi.ts).

const nombreApiSchema = z.object({ nombre: z.string(), apellido: z.string() });

// plan_precios.precio es NUMERIC: Prisma lo serializa como texto ("25000").
const precioApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Precio inválido" });

// Inscripcion del back, solo con lo que muestra la lista de pendientes.
export const inscripcionPendienteApiSchema = z.object({
  id_inscripcion: z.number().int(),
  id_alumno: z.number().int(),
  estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]),
  fecha_alta: z.string(),
  id_promocion: z.number().int().nullable().optional().default(null),
  // Solo en las PREINSCRIPTA: hasta qué día guarda su lugar sin el primer pago.
  reserva: z.object({ vence: z.string(), vencida: z.boolean() }).nullable(),
  plan: z.object({ id_plan: z.number().int(), nombre: z.string() }),
  plan_precio: z.object({ precio: precioApiSchema }),
  profesora: z.object({ usuario: nombreApiSchema }),
  horarios: z.array(
    z.object({
      horario: z.object({
        dia_semana: z.number().int().min(1).max(7),
        hora_inicio: z.string(),
        hora_fin: z.string(),
        actividad: z.object({ nombre: z.string() }),
      }),
    }),
  ),
});

export type InscripcionPendienteApi = z.infer<typeof inscripcionPendienteApiSchema>;

// PaginaAlumnos del back. Cada alumno trae además un resumen de su inscripción, que acá no se usa.
export const paginaAlumnosApiSchema = z.object({
  datos: z.array(alumnoApiSchema),
  total: z.number().int(),
});

export type AlumnoEnListadoApi = z.infer<typeof alumnoApiSchema>;

// Cuerpo de POST /pagos/efectivo (registrarEfectivoSchema).
export interface RegistrarEfectivoBody {
  id_inscripcion: number;
  monto: number;
  confirmar_monto_distinto: boolean;
  /** Con null, sin promoción; sin el campo, la que guardó la inscripción. */
  id_promocion?: number | null;
}

// Cuerpo de POST /pagos/transferencia-recibida (registrarTransferenciaRecibidaSchema).
export interface RegistrarTransferenciaRecibidaBody extends RegistrarEfectivoBody {
  /** ISO 8601 con zona horaria: "2026-10-09T10:30:00-03:00". Sin ella, el back usa el momento en que la recibe. */
  fecha_hora_transferencia?: string;
  titular_cuenta_origen?: string;
}
