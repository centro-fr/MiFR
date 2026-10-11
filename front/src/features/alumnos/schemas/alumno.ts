import { z } from "zod";

export const estadoAlumnoSchema = z.enum(["ACTIVO", "PENDIENTE", "BAJA"]);
export const estadoEntidadAlumnoSchema = z.enum(["ACTIVO", "INACTIVO", "BAJA"]);
export const estadoCuotaSchema = z.enum(["AL_DIA", "POR_VENCER", "VENCIDA"]);
export const EDAD_MAXIMA_ALUMNO = 120;
const PATRON_NOMBRE_PERSONA = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;
const PATRON_TELEFONO = /^\+?[\d\s().-]+$/u;
const PATRON_DNI = /^\d*$/u;

function nombrePersonaSchema(campo: "nombre" | "apellido") {
  const etiqueta = campo === "nombre" ? "el nombre" : "el apellido";
  const etiquetaMayuscula = campo === "nombre" ? "El nombre" : "El apellido";
  return z
    .string()
    .trim()
    .min(1, `Ingresá ${etiqueta}`)
    .max(60, `${etiquetaMayuscula} no puede superar los 60 caracteres`)
    .regex(PATRON_NOMBRE_PERSONA, "Usá solo letras, espacios, apóstrofes, puntos o guiones");
}

function telefonoSchema() {
  return z
    .string()
    .trim()
    .max(20, "El teléfono no puede superar los 20 caracteres")
    .refine(esTelefonoValido, "Ingresá un teléfono válido con entre 7 y 15 dígitos");
}

function esTelefonoValido(telefono: string): boolean {
  if (!telefono) return true;
  if (!PATRON_TELEFONO.test(telefono)) return false;

  const cantidadDigitos = telefono.replace(/\D/gu, "").length;
  if (cantidadDigitos < 7 || cantidadDigitos > 15) return false;

  const aperturas = telefono.match(/\(/gu)?.length ?? 0;
  const cierres = telefono.match(/\)/gu)?.length ?? 0;
  if (aperturas !== cierres || aperturas > 1) return false;
  if (aperturas === 1) {
    const contenido = telefono.match(/\(([^()]*)\)/u)?.[1] ?? "";
    if (!contenido.replace(/[\s.-]/gu, "").match(/^\d+$/u)) return false;
  }

  return true;
}

function dniSchema() {
  return z
    .string()
    .trim()
    .max(10, "El DNI no puede superar los 10 dígitos")
    .regex(PATRON_DNI, "El DNI debe contener solo números")
    .nullable();
}

const nombreContactoEmergenciaSchema = z
  .string()
  .trim()
  .max(80, "El nombre del contacto no puede superar los 80 caracteres")
  .refine(
    (nombre) => nombre === "" || PATRON_NOMBRE_PERSONA.test(nombre),
    "Usá solo letras, espacios, apóstrofes, puntos o guiones",
  )
  .nullable();

export function obtenerLimitesFechaNacimiento(fechaActual = new Date()) {
  const hoy = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
  const fechaMinima = new Date(hoy);
  fechaMinima.setFullYear(fechaMinima.getFullYear() - EDAD_MAXIMA_ALUMNO);
  if (fechaMinima.getMonth() !== hoy.getMonth()) fechaMinima.setDate(0);

  const formatear = (fecha: Date) =>
    [
      fecha.getFullYear().toString().padStart(4, "0"),
      (fecha.getMonth() + 1).toString().padStart(2, "0"),
      fecha.getDate().toString().padStart(2, "0"),
    ].join("-");

  return { min: formatear(fechaMinima), max: formatear(hoy) };
}

export function calcularEdad(fechaNacimiento: string, fechaActual = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.split("-").map(Number);
  const hoy = fechaActual;
  let edad = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
  return edad;
}

export function esMenorDeEdad(fechaNacimiento: string, fechaActual = new Date()): boolean {
  return calcularEdad(fechaNacimiento, fechaActual) < 18;
}

export const alumnoResumenSchema = z.object({
  id_alumno: z.number().int().positive(),
  nombre_completo: z.string(),
  dni: z.string().nullable(),
  telefono: z.string().nullable(),
  estado: estadoAlumnoSchema,
  plan: z.string().nullable(),
  id_plan: z.number().int().positive().nullable(),
  estado_cuota: estadoCuotaSchema.nullable(),
  fecha_vencimiento: z.string().nullable(),
  profesora: z.string().nullable(),
  id_profesora: z.number().int().positive().nullable(),
  actividad: z.string().nullable(),
  id_actividad: z.number().int().positive().nullable(),
});

export const respuestaAlumnosSchema = z.object({
  items: z.array(alumnoResumenSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

const personaSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string().nullable(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
});

const horarioAlumnoSchema = z.object({
  id_horario: z.number().int().positive(),
  id_actividad: z.number().int().positive(),
  actividad: z.string(),
  dia_semana: z.number().int().min(1).max(7),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  profesora: z.string(),
});

const planSchema = z.object({
  id_plan: z.number().int().positive(),
  nombre: z.string(),
  tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
  precio: z.number().nonnegative(),
});

export const alumnoDetalleSchema = z.object({
  id_alumno: z.number().int().positive(),
  id_usuario_responsable: z.number().int().positive().nullable(),
  usuario: personaSchema.extend({
    id_usuario: z.number().int().positive(),
    fecha_nacimiento: z.string(),
    direccion: z.string().nullable(),
  }),
  tutor: personaSchema.nullable(),
  cont_emerg_nombre: z.string().nullable(),
  cont_emerg_telefono: z.string().nullable(),
  apto_medico: z.boolean(),
  fecha_apto_medico: z.string().nullable(),
  observaciones: z.string().nullable(),
  estado: estadoEntidadAlumnoSchema,
  fecha_alta: z.string(),
  inscripcion: z
    .object({
      id_inscripcion: z.number().int().positive(),
      estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]),
      plan: planSchema.nullable(),
      id_profesora: z.number().int().positive().nullable(),
      profesora: z.string().nullable(),
      horarios: z.array(horarioAlumnoSchema),
      estado_cuota: estadoCuotaSchema.nullable(),
      fecha_vencimiento: z.string().nullable(),
      fecha_inicio: z.string(),
    })
    .nullable(),
  planes_disponibles: z.array(planSchema),
  horarios_disponibles: z.array(horarioAlumnoSchema),
  historial_cobros: z.array(
    z.object({
      id: z.number().int().positive(),
      fecha: z.string(),
      concepto: z.string(),
      monto: z.number().nonnegative(),
      medio: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
      estado: z.enum(["CONFIRMADO", "PENDIENTE", "RECHAZADO"]),
    }),
  ),
  historial_asistencia: z.array(
    z.object({
      id: z.number().int().positive(),
      fecha: z.string(),
      actividad: z.string(),
      estado: z.enum(["PRESENTE", "AUSENTE"]),
    }),
  ),
});

const personaEditableSchema = z.object({
  nombre: nombrePersonaSchema("nombre"),
  apellido: nombrePersonaSchema("apellido"),
  dni: dniSchema(),
  telefono: telefonoSchema().nullable(),
  email: z.union([z.string().trim().email("Ingresá un email válido").max(120), z.literal("")]).nullable(),
});

export const actualizarAlumnoSchema = z
  .object({
    usuario: personaEditableSchema.extend({
      fecha_nacimiento: z.string().date("Ingresá una fecha válida"),
    }),
    tutor: personaEditableSchema.nullable(),
    cont_emerg_nombre: nombreContactoEmergenciaSchema,
    cont_emerg_telefono: telefonoSchema().nullable(),
    apto_medico: z.boolean(),
    fecha_apto_medico: z.string().date().nullable(),
    observaciones: z.string().trim().max(500).nullable(),
    id_plan: z.number().int().positive().nullable(),
    id_horarios: z.array(z.number().int().positive()).refine((ids) => new Set(ids).size === ids.length, {
      message: "No repitas horarios",
    }),
  })
  .superRefine((datos, contexto) => {
    const { min, max } = obtenerLimitesFechaNacimiento();
    if (datos.usuario.fecha_nacimiento > max) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usuario", "fecha_nacimiento"],
        message: "La fecha de nacimiento no puede ser futura",
      });
      return;
    }
    if (datos.usuario.fecha_nacimiento < min) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usuario", "fecha_nacimiento"],
        message: `La edad no puede superar los ${EDAD_MAXIMA_ALUMNO} años`,
      });
      return;
    }

    const edad = calcularEdad(datos.usuario.fecha_nacimiento);

    if (edad < 18 && !datos.tutor) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tutor"],
        message: "Los alumnos menores de 18 años necesitan un tutor responsable",
      });
    } else if (edad >= 18 && datos.tutor) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tutor"],
        message: "Los datos del tutor solo se pueden editar para alumnos menores de 18 años",
      });
    }

    if (datos.apto_medico && !datos.fecha_apto_medico) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_apto_medico"],
        message: "Ingresá la fecha del apto médico",
      });
    }
    if (!datos.apto_medico && datos.fecha_apto_medico) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_apto_medico"],
        message: "Quitá la fecha si el apto médico no está marcado como presentado",
      });
    }
    if (datos.fecha_apto_medico) {
      const hoy = obtenerLimitesFechaNacimiento().max;
      if (datos.fecha_apto_medico > hoy) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_apto_medico"],
          message: "La fecha del apto médico no puede ser futura",
        });
      }
      if (datos.fecha_apto_medico < datos.usuario.fecha_nacimiento) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_apto_medico"],
          message: "La fecha del apto médico no puede ser anterior al nacimiento",
        });
      }
    }
  });

export type AlumnoResumen = z.infer<typeof alumnoResumenSchema>;
export type RespuestaAlumnos = z.infer<typeof respuestaAlumnosSchema>;
export type AlumnoDetalle = z.infer<typeof alumnoDetalleSchema>;
export type ActualizarAlumnoInput = z.infer<typeof actualizarAlumnoSchema>;
export type EstadoAlumno = z.infer<typeof estadoAlumnoSchema>;
export type EstadoCuota = z.infer<typeof estadoCuotaSchema>;
