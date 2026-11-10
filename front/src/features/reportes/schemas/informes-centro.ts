import { z } from "zod";

// Contratos de GET /reportes/planes, /ocupacion, /cobranza y /cuotas-vencidas
// (back: reportes/generador-informes).

const entero = z.number().int().nonnegative();
const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((valor) => valor.slice(0, 10));
const persona = z.object({ nombre: z.string(), apellido: z.string() });
const pagina = { total: entero, limit: z.number().int().positive(), offset: entero };

export const estadisticasPlanesApiSchema = z.object({
  resumen: z.object({ total_alumnos_activos: entero, ingreso_estimado_total: z.number(), total_planes: entero }),
  planes: z.array(
    z.object({
      id_plan: z.number().int().positive(),
      nombre: z.string(),
      tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
      actividad_exclusiva: z.object({ id_actividad: z.number().int(), nombre: z.string() }).nullable(),
      cantidad_alumnos: entero,
      porcentaje: z.number(),
      precio_vigente: z.number().nullable(),
      ingreso_estimado: z.number(),
    }),
  ),
});

const nivel = z.enum(["LIBRE", "MODERADO", "CASI_LLENO", "COMPLETO", "SIN_CUPO"]);

export const informeOcupacionApiSchema = z.object({
  resumen: z.object({
    total_horarios: entero,
    ocupacion_total: z.number(),
    por_nivel: z.partialRecord(nivel, entero),
  }),
  datos: z.array(
    z.object({
      id_horario: z.number().int().positive(),
      dia_semana: z.number().int().min(0).max(7),
      hora_inicio: z.string(),
      hora_fin: z.string(),
      actividad: z.object({ nombre: z.string(), modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]) }),
      profesora: persona,
      cupo_maximo: z.number().int().nullable(),
      inscriptos: entero,
      porcentaje_ocupacion: z.number().nullable(),
      nivel,
    }),
  ),
});

export const informeCobranzaApiSchema = z.object({
  periodo: z.object({ desde: dia, hasta: dia }),
  resumen: z.object({
    total_cobrado: z.number(),
    total_efectivo: z.number(),
    total_transferencia: z.number(),
    cantidad_pagos: entero,
  }),
  datos: z.array(
    z.object({
      id_pago: z.number().int().positive(),
      monto: z.number(),
      forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
      fecha_pago: dia,
      alumno: persona.extend({ id_alumno: entero.optional() }),
      plan: z.object({ nombre: z.string() }),
      profesora_cobra: persona.extend({ id_profesora: entero.optional() }).nullable(),
    }),
  ),
  ...pagina,
});

export const informeCuotasVencidasApiSchema = z.object({
  resumen: z.object({ total_alumnos_vencidos: entero, monto_total_adeudado: z.number(), promedio_deuda_alumno: z.number() }),
  por_profesora: z.array(
    z.object({ id_profesora: z.number().int().positive(), nombre: z.string(), apellido: z.string(), cantidad_alumnos: entero, monto_total: z.number() }),
  ),
  datos: z.array(
    z.object({
      id_inscripcion: z.number().int().positive(),
      alumno: persona.extend({ telefono: z.string().nullable(), email: z.string().nullable() }),
      plan: z.object({ nombre: z.string() }),
      profesora: persona,
      fecha_vencimiento: dia,
      dias_vencida: entero,
      monto_adeudado: z.number(),
    }),
  ),
  ...pagina,
});
