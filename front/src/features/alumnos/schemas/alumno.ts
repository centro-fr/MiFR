import { z } from "zod";

// ---------- Contrato de /api/v1/alumnos (back: alumno.openapi.ts e inscripcion.openapi.ts) ----------

export const estadoEntidadAlumnoSchema = z.enum(["ACTIVO", "INACTIVO", "BAJA"]);

// DatosPersonales del back: las columnas de usuarios que viajan con el alumno y con su tutor.
const datosPersonalesApiSchema = z.object({
  id_usuario: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  fecha_nacimiento: z.string(),
  direccion: z.string().nullable(),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

// Alumno del back. INACTIVO es el pre-inscripto que espera su primer pago (US-07).
export const alumnoApiSchema = z.object({
  id_alumno: z.number().int(),
  id_usuario: z.number().int(),
  id_usuario_responsable: z.number().int().nullable(),
  cont_emerg_nombre: z.string().nullable(),
  cont_emerg_telefono: z.string().nullable(),
  apto_medico: z.boolean(),
  fecha_apto_medico: z.string().nullable(),
  observaciones: z.string().nullable(),
  estado: estadoEntidadAlumnoSchema,
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  usuario: datosPersonalesApiSchema,
  responsable: datosPersonalesApiSchema.nullable(),
});

export type AlumnoApi = z.infer<typeof alumnoApiSchema>;

// plan_precios.precio es NUMERIC: Prisma lo serializa como texto ("25000").
const precioApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Precio inválido" });

const nombreApiSchema = z.object({ nombre: z.string(), apellido: z.string() });

export const estadoCuotaSchema = z.enum([
  "AL_DIA",
  "POR_VENCER",
  "VENCIDA",
  "CLASE_SUELTA_VIGENTE",
  "CLASE_SUELTA_VENCIDA",
  "PENDIENTE_DE_PAGO",
]);

export type EstadoCuota = z.infer<typeof estadoCuotaSchema>;

// SituacionCuota del back (US-18): no se guarda, se calcula en cada consulta. En una inscripción
// dada de baja, al día de la baja.
const situacionCuotaApiSchema = z.object({
  estado: estadoCuotaSchema,
  fecha_vencimiento: z.string().nullable(),
  dias_restantes: z.number().int().nullable(),
  puede_asistir: z.boolean(),
  tiene_pago_pendiente: z.boolean(),
});

export type SituacionCuotaApi = z.infer<typeof situacionCuotaApiSchema>;

// El default tolera un back anterior a la situación de cuota: sin él, la ficha y el listado dejarían
// de cargar en vez de solo no mostrarla.
const situacionCuotaOpcionalSchema = situacionCuotaApiSchema.nullable().default(null);

// Inscripcion del back, solo con lo que muestra la ficha.
const inscripcionVigenteApiSchema = z.object({
  id_inscripcion: z.number().int(),
  estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]),
  fecha_inicio: z.string(),
  id_profesora: z.number().int(),
  id_promocion: z.number().int().nullable(),
  plan: z.object({
    id_plan: z.number().int(),
    nombre: z.string(),
    tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
    clases_por_semana: z.number().int().nullable().optional(),
  }),
  plan_precio: z.object({ precio: precioApiSchema }),
  profesora: z.object({ usuario: nombreApiSchema }),
  horarios: z.array(
    z.object({
      id_horario: z.number().int(),
      horario: z.object({
        id_actividad: z.number().int(),
        dia_semana: z.number().int().min(1).max(7),
        hora_inicio: z.string(),
        hora_fin: z.string(),
        actividad: z.object({ nombre: z.string() }),
        profesora: z.object({ usuario: nombreApiSchema }),
      }),
    }),
  ),
  reserva: z.object({ vence: z.string(), vencida: z.boolean() }).nullable(),
  situacion_cuota: situacionCuotaOpcionalSchema,
});

export type InscripcionVigenteApi = z.infer<typeof inscripcionVigenteApiSchema>;

// FichaAlumno del back: el alumno con sus inscripciones vigentes (pre-inscriptas o activas) y, si
// está de baja, las que cerró su última baja, con lo que debía ese día (US-08).
export const fichaAlumnoApiSchema = alumnoApiSchema.extend({
  inscripciones: z.array(inscripcionVigenteApiSchema),
  inscripciones_de_la_baja: z.array(inscripcionVigenteApiSchema).default([]),
});

export type FichaAlumnoApi = z.infer<typeof fichaAlumnoApiSchema>;

// AlumnoEnListado del back: cada fila trae el resumen de su inscripción vigente más reciente.
export const paginaAlumnosApiSchema = z.object({
  datos: z.array(
    alumnoApiSchema.extend({
      inscripcion: z
        .object({
          id_inscripcion: z.number().int(),
          estado: z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]),
          id_plan: z.number().int(),
          nombre_plan: z.string(),
          id_profesora: z.number().int(),
          nombre_profesora: z.string(),
        })
        .nullable(),
      situacion_cuota: situacionCuotaOpcionalSchema,
      planes_activos: z.array(z.string()).optional(),
    }),
  ),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type PaginaAlumnosApi = z.infer<typeof paginaAlumnosApiSchema>;

// ---------- Modelos de las pantallas (listado US-10 y ficha US-09) ----------

/** Como se muestra el estado: INACTIVO es la pre-inscripción que espera el primer pago. */
export type EstadoAlumno = "ACTIVO" | "PENDIENTE" | "BAJA";

export interface SituacionCuota {
  estado: EstadoCuota;
  /** Fecha de calendario "AAAA-MM-DD"; null si todavía no pagó ninguna cuota. */
  fecha_vencimiento: string | null;
  /** 0 el día del vencimiento, negativo si ya venció (días de atraso). */
  dias_restantes: number | null;
  puede_asistir: boolean;
  /** Hay una transferencia informada que la propietaria todavía no revisó. */
  tiene_pago_pendiente: boolean;
}

export interface AlumnoResumen {
  id_alumno: number;
  nombre_completo: string;
  dni: string | null;
  telefono: string | null;
  email?: string | null;
  inasistencias_consecutivas?: number;
  estado: EstadoAlumno;
  plan: string | null;
  planes_activos?: string[];
  profesora: string | null;
  /** La de su inscripción vigente; null si no tiene una. */
  situacion_cuota: SituacionCuota | null;
}

export interface RespuestaAlumnos {
  items: AlumnoResumen[];
  total: number;
  limit: number;
  offset: number;
}

export interface PersonaDetalle {
  nombre: string;
  apellido: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
}

export interface HorarioDeAlumno {
  id_horario: number;
  id_actividad: number;
  actividad: string;
  dia_semana: number;
  /** "18:00". */
  hora_inicio: string;
  hora_fin: string;
  profesora: string;
}

export interface InscripcionDeAlumno {
  id_inscripcion: number;
  estado: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
  /** Precio con el que se inscribió (el vigente en ese momento). */
  plan: {
    id_plan: number;
    nombre: string;
    tipo: "MENSUAL" | "CLASE_SUELTA";
    precio: number;
    clases_por_semana?: number | null;
  };
  id_profesora: number;
  profesora: string;
  id_promocion?: number | null;
  horarios: HorarioDeAlumno[];
  /** Fecha de calendario "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Solo en las pre-inscripciones: hasta qué día guardan el lugar sin el primer pago (US-07). */
  reserva: { vence: string; vencida: boolean } | null;
  situacion_cuota: SituacionCuota | null;
}

export interface AlumnoDetalle {
  id_alumno: number;
  id_usuario_responsable: number | null;
  /** Las fechas de calendario llegan como "AAAA-MM-DD". */
  usuario: PersonaDetalle & { id_usuario: number; fecha_nacimiento: string; direccion: string | null };
  tutor: PersonaDetalle | null;
  cont_emerg_nombre: string | null;
  cont_emerg_telefono: string | null;
  apto_medico: boolean;
  fecha_apto_medico: string | null;
  observaciones: string | null;
  estado: z.infer<typeof estadoEntidadAlumnoSchema>;
  /** Timestamps ISO. */
  fecha_alta: string;
  fecha_baja: string | null;
  /** La inscripción vigente más reciente; null si no tiene (por ejemplo, dado de baja). */
  inscripcion: InscripcionDeAlumno | null;
  /** Todas las inscripciones vigentes (si el alumno tiene más de un plan simultáneo). */
  inscripciones: InscripcionDeAlumno[];
  /** Solo si está de baja: las inscripciones que cerró su última baja, con la cuota a ese día. */
  inscripciones_de_la_baja: InscripcionDeAlumno[];
}

// ---------- Formulario de edición (US-09) ----------

export const EDAD_MAXIMA_ALUMNO = 120;
const MAYORIA_DE_EDAD = 18;
const PATRON_NOMBRE_PERSONA = /^[\p{L}\p{M}]+(?:[ '’.-][\p{L}\p{M}]+)*$/u;
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

const nombreContactoEmergenciaSchema = z
  .string()
  .trim()
  .max(80, "El nombre del contacto no puede superar los 80 caracteres")
  .refine(
    (nombre) => nombre === "" || PATRON_NOMBRE_PERSONA.test(nombre),
    "Usá solo letras, espacios, apóstrofes, puntos o guiones",
  );

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
  return calcularEdad(fechaNacimiento, fechaActual) < MAYORIA_DE_EDAD;
}

const edicionAlumnoBaseSchema = z.object({
  usuario: z.object({
    nombre: nombrePersonaSchema("nombre"),
    apellido: nombrePersonaSchema("apellido"),
    // El back no permite borrar el DNI: una vez cargado, solo se cambia.
    dni: z
      .string()
      .trim()
      .regex(PATRON_DNI, "El DNI debe contener solo números")
      .refine((dni) => dni === "" || (dni.length >= 7 && dni.length <= 8), "El DNI tiene 7 u 8 dígitos"),
    telefono: telefonoSchema(),
    email: z.union([z.string().trim().email("Ingresá un email válido").max(120), z.literal("")]),
    fecha_nacimiento: z.string().date("Ingresá una fecha válida"),
    direccion: z.string().trim().max(120, "La dirección no puede superar los 120 caracteres"),
  }),
  cont_emerg_nombre: nombreContactoEmergenciaSchema,
  cont_emerg_telefono: telefonoSchema(),
  apto_medico: z.boolean(),
  fecha_apto_medico: z.string().date().nullable(),
  observaciones: z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres"),
});

export type EdicionAlumnoValores = z.infer<typeof edicionAlumnoBaseSchema>;

type Contexto = z.RefinementCtx;

function validarFechaDeNacimiento(fecha: string, ctx: Contexto): boolean {
  const { min, max } = obtenerLimitesFechaNacimiento();
  const mensaje = fecha > max ? "La fecha de nacimiento no puede ser futura" : fecha < min ? `La edad no puede superar los ${EDAD_MAXIMA_ALUMNO} años` : null;
  if (mensaje) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["usuario", "fecha_nacimiento"], message: mensaje });
  return mensaje === null;
}

// Las reglas de edad del back (alumno.service.ts): un menor lleva tutor; un mayor, email (lo usa
// para entrar al sistema). Para un menor el formulario oculta el email y no lo envía.
function validarEdad(datos: EdicionAlumnoValores, tieneTutor: boolean, ctx: Contexto) {
  const agregar = (path: string[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if (!esMenorDeEdad(datos.usuario.fecha_nacimiento)) {
    if (!datos.usuario.email) agregar(["usuario", "email"], "El email es obligatorio para un alumno mayor de edad: lo usa para entrar");
  } else if (!tieneTutor) {
    agregar(["usuario", "fecha_nacimiento"], "Un alumno menor de 18 años necesita un tutor responsable");
  }
}

function validarAptoMedico(datos: EdicionAlumnoValores, ctx: Contexto) {
  const agregar = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fecha_apto_medico"], message });
  if (datos.apto_medico && !datos.fecha_apto_medico) agregar("Ingresá la fecha del apto médico");
  if (!datos.apto_medico && datos.fecha_apto_medico) agregar("Quitá la fecha si el apto médico no está marcado como presentado");
  if (!datos.fecha_apto_medico) return;
  if (datos.fecha_apto_medico > obtenerLimitesFechaNacimiento().max) agregar("La fecha del apto médico no puede ser futura");
  if (datos.fecha_apto_medico < datos.usuario.fecha_nacimiento) agregar("La fecha del apto médico no puede ser anterior al nacimiento");
}

/**
 * Valida el formulario de edición. `tieneTutor`: si el alumno ya tiene un tutor asociado. La
 * profesora usa el mismo: los campos que no puede tocar llegan del back ya válidos.
 */
export function crearEdicionAlumnoSchema({ tieneTutor }: { tieneTutor: boolean }) {
  return edicionAlumnoBaseSchema.superRefine((datos, ctx) => {
    if (validarFechaDeNacimiento(datos.usuario.fecha_nacimiento, ctx)) validarEdad(datos, tieneTutor, ctx);
    validarAptoMedico(datos, ctx);
  });
}

// ---------- Cuerpo de PATCH /alumnos/:id (actualizarAlumnoSchema del back) ----------

export interface ActualizarAlumnoBody {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  fecha_nacimiento?: string;
  telefono?: string | null;
  direccion?: string | null;
  cont_emerg_nombre?: string | null;
  cont_emerg_telefono?: string | null;
  apto_medico?: boolean;
  fecha_apto_medico?: string | null;
  observaciones?: string | null;
}

// Lo único que la profesora puede cambiar (PATCH /alumnos/:id responde 403 con otro campo).
const CAMPOS_DE_CONTACTO: (keyof ActualizarAlumnoBody)[] = ["telefono", "direccion", "cont_emerg_nombre", "cont_emerg_telefono", "observaciones"];

const textoOVacio = (valor: string) => valor.trim() || null;

/** Los valores del formulario como columnas del back: un texto vacío borra el dato (NULL). */
function comoColumnas(valores: EdicionAlumnoValores): ActualizarAlumnoBody {
  const { usuario } = valores;
  return {
    nombre: usuario.nombre.trim(),
    apellido: usuario.apellido.trim(),
    // El DNI y el email no se pueden borrar: vacíos, no viajan.
    dni: usuario.dni.trim() || undefined,
    // Un menor no lleva email: el campo no se muestra y no viaja.
    email: esMenorDeEdad(usuario.fecha_nacimiento) ? undefined : usuario.email.trim() || undefined,
    fecha_nacimiento: usuario.fecha_nacimiento,
    telefono: textoOVacio(usuario.telefono),
    direccion: textoOVacio(usuario.direccion),
    cont_emerg_nombre: textoOVacio(valores.cont_emerg_nombre),
    cont_emerg_telefono: textoOVacio(valores.cont_emerg_telefono),
    apto_medico: valores.apto_medico,
    fecha_apto_medico: valores.fecha_apto_medico,
    observaciones: textoOVacio(valores.observaciones),
  };
}

function columnasDe(alumno: AlumnoDetalle): ActualizarAlumnoBody {
  const { usuario } = alumno;
  return {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    dni: usuario.dni ?? undefined,
    email: usuario.email ?? undefined,
    fecha_nacimiento: usuario.fecha_nacimiento,
    telefono: usuario.telefono,
    direccion: usuario.direccion,
    cont_emerg_nombre: alumno.cont_emerg_nombre,
    cont_emerg_telefono: alumno.cont_emerg_telefono,
    apto_medico: alumno.apto_medico,
    fecha_apto_medico: alumno.fecha_apto_medico,
    observaciones: alumno.observaciones,
  };
}

/** Solo lo que cambió: el back exige al menos un campo y así no pisa lo que no se tocó. */
export function aCuerpoEdicion(alumno: AlumnoDetalle, valores: EdicionAlumnoValores, { soloContacto }: { soloContacto: boolean }): ActualizarAlumnoBody {
  const antes = columnasDe(alumno);
  const despues = comoColumnas(valores);
  const campos = (Object.keys(despues) as (keyof ActualizarAlumnoBody)[]).filter(
    (campo) => despues[campo] !== undefined && despues[campo] !== antes[campo] && (!soloContacto || CAMPOS_DE_CONTACTO.includes(campo)),
  );
  return Object.fromEntries(campos.map((campo) => [campo, despues[campo]]));
}

// ---------- Baja (US-08) ----------

// darDeBajaAlumnoSchema del back: el enum inscripciones.motivo_baja del DER sin CAMBIO_PLAN,
// que lo pone solo el cambio de plan (un alumno que se va no cambia de plan).
export const motivoBajaSchema = z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "OTRO"], { error: "Elegí el motivo de la baja." });

// Texto libre que acompaña a "Otro motivo" (inscripciones.detalle_baja, hasta 200 caracteres).
export const LARGO_MAXIMO_DETALLE_BAJA = 200;

export const bajaAlumnoFormSchema = z.object({
  motivo: motivoBajaSchema,
  detalle: z
    .string()
    .trim()
    .max(LARGO_MAXIMO_DETALLE_BAJA, `Usá hasta ${LARGO_MAXIMO_DETALLE_BAJA} caracteres.`)
    .optional(),
});

// Cuerpo de POST /alumnos/:id/baja. Como en el back, el detalle solo acompaña al motivo OTRO.
export const bajaAlumnoBodySchema = z
  .object({
    motivo_baja: motivoBajaSchema,
    detalle_baja: z.string().trim().min(1).max(LARGO_MAXIMO_DETALLE_BAJA).optional(),
    id_inscripcion: z.number().int().positive().optional(),
  })
  .refine((baja) => baja.detalle_baja === undefined || baja.motivo_baja === "OTRO", {
    message: "El detalle solo se carga con el motivo OTRO",
    path: ["detalle_baja"],
  });

export type BajaAlumnoBody = z.infer<typeof bajaAlumnoBodySchema>;
