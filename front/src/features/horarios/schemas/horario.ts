import { z } from "zod";
import { actividadApiSchema } from "@/features/actividades/schemas/actividad";
import { HORA_APERTURA, HORA_CIERRE } from "@/features/horarios/utils/cronograma";

// Contrato de /api/v1/profesoras y /api/v1/horarios (back: profesor.openapi.ts y horario.openapi.ts).

export const profesoraApiSchema = z.object({
  id_profesora: z.number().int(),
  id_usuario: z.number().int(),
  especialidad: z.string().nullable(),
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  usuario: z.object({ nombre: z.string(), apellido: z.string() }),
});

export type ProfesoraApi = z.infer<typeof profesoraApiSchema>;

// Las horas viajan como TIME de Postgres serializado: "1970-01-01T09:00:00.000Z".
export const horarioApiSchema = z.object({
  id_horario: z.number().int(),
  id_actividad: z.number().int(),
  id_profesora: z.number().int(),
  dia_semana: z.number().int().min(1).max(7),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  cupo_maximo: z.number().int().nullable(),
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  actividad: actividadApiSchema,
  profesora: profesoraApiSchema,
  cupo_maximo_efectivo: z.number().int().nullable(),
});

export type HorarioApi = z.infer<typeof horarioApiSchema>;

export const horarioConAdvertenciaApiSchema = z.object({
  horario: horarioApiSchema,
  advertencia: z.string(),
});

// Mismas reglas que crearHorarioSchema del back (horario.schemas.ts), con mensajes para el
// formulario. La superposición de la profesora se valida aparte, contra el cronograma.
const hora = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm")
  .refine((valor) => valor >= HORA_APERTURA && valor <= HORA_CIERRE, {
    message: `Los horarios tienen que estar entre las ${HORA_APERTURA} y las ${HORA_CIERRE} hs.`,
  });

export const horarioFormSchema = z
  .object({
    // El back exige enteros positivos (idSchema): solo dígitos para no mandar NaN.
    actividadId: z.string().regex(/^\d+$/, "Elegí una actividad."),
    profesoraId: z.string().regex(/^\d+$/, "Elegí una profesora."),
    diaSemana: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]),
    horaInicio: hora,
    horaFin: hora,
    cupoPropio: z
      .number({ invalid_type_error: "El cupo tiene que ser un número." })
      .int("El cupo tiene que ser un número entero.")
      .positive("El cupo tiene que ser mayor a cero.")
      .max(32767, "El cupo es demasiado grande.")
      .nullable(),
  })
  .refine((datos) => datos.horaFin > datos.horaInicio, {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  });

// Cuerpo de POST /horarios. Las horas van como "HH:mm" y el día como 1 (lunes) a 7 (domingo).
export interface GuardarHorarioBody {
  id_actividad: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
}
