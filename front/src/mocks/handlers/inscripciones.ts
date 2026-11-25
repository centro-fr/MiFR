import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { db } from "@/mocks/db";
import type { EstadoInscripcionMock, InscripcionMock } from "@/mocks/data/inscripciones";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";
import {
  errorDeActividadesParaLaEdad,
  errorDeEdadParaElPlan,
  errorDeHorarios,
  guardarInscripcion,
  idsHorariosSchema,
  planYHorariosSchema,
  vigentesDe,
} from "@/mocks/handlers/reglas-inscripcion";
import { cambioProgramadoConDatos, inscripcionConDatos } from "@/mocks/handlers/serializar";
import { hoyEnArgentina } from "@/mocks/precios";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";

// Mock de /inscripciones (inscripcion.routes.ts): listado con filtros y paginado, pre-inscripción
// (US-05) y cambio de horarios o de plan de una inscripción vigente.

const ESTADOS: EstadoInscripcionMock[] = ["PREINSCRIPTA", "ACTIVA", "BAJA"];
const LIMITE_MAXIMO = 100;
const PROPIETARIA_EDITA = { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" } as const;

const crearInscripcionSchema = planYHorariosSchema.extend({
  id_alumno: z.number().int().positive(),
  fecha_inicio: z.string().date().optional(),
});

function numeroDeQuery(valor: string | null, porDefecto: number): number | null {
  if (valor === null) return porDefecto;
  return /^\d{1,3}$/.test(valor) ? Number(valor) : null;
}

// Una profesora solo ve las inscripciones a su cargo; la propietaria, todas.
function idProfesoraDeLaSesion(request: Request): number | null {
  const usuario = usuarioDeLaSesion(request);
  if (!usuario || usuario.roles.includes("PROPIETARIA")) return null;
  return db.profesoras.find((p) => p.id_usuario === usuario.id_usuario)?.id_profesora ?? -1;
}

// verificarQuePuedePreinscribir del back: la profesora solo pre-inscribe a su nombre, sin bonificar
// y a alumnos que no están a cargo de otra profesora.
function errorDeLaProfesora(idProfesoraSesion: number, cuerpo: z.infer<typeof crearInscripcionSchema>) {
  if (cuerpo.id_profesora !== idProfesoraSesion) {
    return errorApi(403, "FORBIDDEN", "Solo puede preinscribir alumnos a su propio cargo");
  }
  if (cuerpo.sin_cargo) return errorApi(403, "FORBIDDEN", "Solo la propietaria puede dar una inscripción sin cargo");
  const aCargoDeOtra = vigentesDe(cuerpo.id_alumno).some((i) => i.id_profesora !== idProfesoraSesion);
  return aCargoDeOtra ? errorApi(403, "FORBIDDEN", "El alumno está a cargo de otra profesora: lo inscribe la propietaria") : null;
}

function inscripcionVigente(params: Record<string, string | readonly string[] | undefined>): InscripcionMock | Response {
  const id = idDeRuta(params.id);
  if (id === null) return idInvalido();
  const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === id);
  if (!inscripcion) return errorApi(404, "NOT_FOUND", "Inscripción no encontrada");
  return inscripcion.estado === "BAJA" ? errorApi(409, "CONFLICT", "La inscripción ya está dada de baja") : inscripcion;
}

const UN_DIA_MS = 86_400_000;

// fechaDelCambioProgramado de la fachada del back: con el plan vigente, el cambio va el día siguiente
// al último de gracia; null si se aplica en el momento.
function fechaDelCambioProgramado(inscripcion: InscripcionMock): string | null {
  if (inscripcion.estado !== "ACTIVA") return null;
  const vencimiento = situacionCuotaDe(inscripcion).fecha_vencimiento;
  if (!vencimiento) return null;
  const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan)!;
  const aplicacion = new Date(Date.parse(vencimiento.slice(0, 10)) + (plan.dias_gracia + 1) * UN_DIA_MS);
  const dia = aplicacion.toISOString().slice(0, 10);
  return dia > hoyEnArgentina() ? dia : null;
}

// Mismas reglas que actualizarHorarios del back: con la inscripción activa y sin pasar a otra profesora
// ni a otra actividad (eso es un cambio de plan).
function errorDelCambioDeHorarios(inscripcion: InscripcionMock, idsHorarios: number[]) {
  if (inscripcion.estado !== "ACTIVA") return errorApi(409, "CONFLICT", "Los horarios se cambian con la inscripción activa");
  const actividades = new Set(
    db.horarios.filter((h) => inscripcion.ids_horarios.includes(h.id_horario)).map((h) => h.id_actividad),
  );
  const nuevos = db.horarios.filter((h) => idsHorarios.includes(h.id_horario));
  if (nuevos.some((h) => h.id_profesora !== inscripcion.id_profesora)) {
    return errorApi(400, "VALIDATION_ERROR", "Los horarios tienen que ser de la misma profesora: para cambiarla, cambiá el plan");
  }
  if (nuevos.some((h) => !actividades.has(h.id_actividad))) {
    return errorApi(400, "VALIDATION_ERROR", "Los horarios tienen que ser de la misma actividad: para cambiarla, cambiá el plan");
  }
  return null;
}

export const inscripcionesHandlers = [
  http.get("*/api/v1/inscripciones", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const query = new URL(request.url).searchParams;
    const estado = query.get("estado");
    const idAlumno = query.get("id_alumno");
    const limit = numeroDeQuery(query.get("limit"), LIMITE_MAXIMO);
    const offset = numeroDeQuery(query.get("offset"), 0);
    if ((estado && !ESTADOS.includes(estado as EstadoInscripcionMock)) || !limit || limit > LIMITE_MAXIMO || offset === null) {
      return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    }

    const idProfesora = idProfesoraDeLaSesion(request);
    const inscripciones = db.inscripciones
      .filter((i) => !estado || i.estado === estado)
      .filter((i) => !idAlumno || i.id_alumno === Number(idAlumno))
      .filter((i) => idProfesora === null || i.id_profesora === idProfesora)
      // Como el back: la más reciente primero.
      .sort((a, b) => b.fecha_alta.localeCompare(a.fecha_alta) || b.id_inscripcion - a.id_inscripcion)
      .slice(offset, offset + limit);
    return HttpResponse.json(inscripciones.map(inscripcionConDatos));
  }),

  // Pre-inscripción (US-05): queda PREINSCRIPTA hasta el primer pago (US-07).
  http.post("*/api/v1/inscripciones", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const cuerpo = crearInscripcionSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const idProfesoraSesion = idProfesoraDeLaSesion(request);
    const errorProfesora = idProfesoraSesion === null ? null : errorDeLaProfesora(idProfesoraSesion, datos);
    if (errorProfesora) return errorProfesora;

    const alumno = db.alumnos.find((a) => a.id_alumno === datos.id_alumno);
    if (!alumno || alumno.estado === "BAJA") return errorApi(404, "NOT_FOUND", "Alumno inexistente o dado de baja");
    const hoy = hoyEnArgentina();
    if (datos.fecha_inicio && datos.fecha_inicio < hoy) {
      return errorApi(400, "VALIDATION_ERROR", "La fecha de inicio no puede ser anterior a hoy");
    }
    if (vigentesDe(datos.id_alumno).some((i) => i.id_plan === datos.id_plan)) {
      return errorApi(409, "CONFLICT", "El alumno ya tiene una inscripción vigente para ese plan");
    }
    const error =
      errorDeEdadParaElPlan(datos.id_plan, datos.id_alumno) ??
      errorDeHorarios(datos) ??
      errorDeActividadesParaLaEdad(datos.id_plan, datos.ids_horarios, datos.id_alumno);
    if (error) return error;

    const inscripcion = guardarInscripcion(datos.id_alumno, datos, "PREINSCRIPTA", datos.fecha_inicio ?? hoy);
    return HttpResponse.json(inscripcionConDatos(inscripcion), { status: 201 });
  }),

  // Cambio de horarios con el mismo plan y profesora: solo la propietaria. El lugar propio no cuenta
  // para el cupo.
  http.patch("*/api/v1/inscripciones/:id/horarios", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const cuerpo = z.object({ ids_horarios: idsHorariosSchema }).safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const inscripcion = inscripcionVigente(params);
    if (inscripcion instanceof Response) return inscripcion;
    const { id_plan, id_profesora } = inscripcion;
    const error =
      errorDelCambioDeHorarios(inscripcion, cuerpo.data.ids_horarios) ??
      errorDeHorarios({ id_plan, id_profesora, ids_horarios: cuerpo.data.ids_horarios }, inscripcion.id_inscripcion);
    if (error) return error;

    inscripcion.ids_horarios = cuerpo.data.ids_horarios;
    return HttpResponse.json(inscripcionConDatos(inscripcion));
  }),

  // Cambio de plan (US-14): solo la propietaria. La inscripción actual se cierra con CAMBIO_PLAN y se
  // abre otra en el mismo estado (activa o pre-inscripta) con el plan nuevo.
  http.post("*/api/v1/inscripciones/:id/cambio-plan", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const cuerpo = planYHorariosSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const actual = inscripcionVigente(params);
    if (actual instanceof Response) return actual;
    if (actual.id_plan === cuerpo.data.id_plan) return errorApi(409, "CONFLICT", "La inscripción ya tiene el plan seleccionado");
    const error =
      errorDeEdadParaElPlan(cuerpo.data.id_plan, actual.id_alumno) ??
      errorDeHorarios(cuerpo.data, actual.id_inscripcion) ??
      errorDeActividadesParaLaEdad(cuerpo.data.id_plan, cuerpo.data.ids_horarios, actual.id_alumno);
    if (error) return error;

    const aplicacion = fechaDelCambioProgramado(actual);
    if (aplicacion) {
      const { id_plan, id_profesora, ids_horarios } = cuerpo.data;
      const cambio = { id_inscripcion: actual.id_inscripcion, id_plan, id_profesora, ids_horarios, fecha_aplicacion: aplicacion };
      db.cambiosPlan = [...db.cambiosPlan.filter((c) => c.id_inscripcion !== actual.id_inscripcion), cambio];
      return HttpResponse.json(cambioProgramadoConDatos(cambio), { status: 202 });
    }

    const estadoNuevo = actual.estado === "ACTIVA" ? "ACTIVA" : "PREINSCRIPTA";
    Object.assign(actual, { estado: "BAJA", motivo_baja: "CAMBIO_PLAN", fecha_baja: new Date().toISOString() });
    const nueva = guardarInscripcion(actual.id_alumno, cuerpo.data, estadoNuevo);
    return HttpResponse.json(inscripcionConDatos(nueva), { status: 201 });
  }),

  http.delete("*/api/v1/inscripciones/:id/cambio-plan", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    if (!db.cambiosPlan.some((c) => c.id_inscripcion === id)) {
      return errorApi(404, "NOT_FOUND", "La inscripción no tiene un cambio de plan programado");
    }
    db.cambiosPlan = db.cambiosPlan.filter((c) => c.id_inscripcion !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
