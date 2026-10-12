import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { bajaAlumnoBodySchema, type FichaAlumnoApi } from "@/features/alumnos/schemas/alumno";
import { db, siguienteId } from "@/mocks/db";
import type { AlumnoMock } from "@/mocks/data/alumnos";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";
import { inscripcionConDatos } from "@/mocks/handlers/serializar";

// Mock de GET /alumnos y GET /alumnos/:id (alumno.routes.ts) y de POST /alumnos/:id/baja y
// /reactivar (inscripcion.routes.ts). No replica que una profesora solo vea a los alumnos a su cargo.

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const ESTADOS = ["ACTIVO", "INACTIVO", "BAJA"];

function datosPersonales(idUsuario: number) {
  return db.usuariosPersonas.find((u) => u.id_usuario === idUsuario)!;
}

// Alumno del back: con sus datos personales y los de su tutor.
function alumnoDe(alumno: AlumnoMock): FichaAlumnoApi {
  return {
    ...alumno,
    usuario: datosPersonales(alumno.id_usuario),
    responsable: alumno.id_usuario_responsable === null ? null : datosPersonales(alumno.id_usuario_responsable),
  };
}

function vigentesDe(idAlumno: number) {
  return db.inscripciones.filter((i) => i.id_alumno === idAlumno && i.estado !== "BAJA");
}

// AlumnoEnListado del back: el resumen de su inscripción vigente más reciente, o null.
function alumnoEnListado(alumno: AlumnoMock) {
  const vigente = vigentesDe(alumno.id_alumno).at(-1);
  const resumen = vigente && inscripcionConDatos(vigente);
  return {
    ...alumnoDe(alumno),
    inscripcion: resumen
      ? {
          id_alumno: alumno.id_alumno,
          id_inscripcion: resumen.id_inscripcion,
          estado: resumen.estado,
          id_plan: resumen.id_plan,
          nombre_plan: resumen.plan.nombre,
          id_profesora: resumen.id_profesora,
          nombre_profesora: `${resumen.profesora.usuario.nombre} ${resumen.profesora.usuario.apellido}`,
          ids_horarios: resumen.horarios.map((h) => h.id_horario),
        }
      : null,
  };
}

// FichaAlumno del back: el alumno con sus inscripciones vigentes.
function fichaDe(alumno: AlumnoMock) {
  return { ...alumnoDe(alumno), inscripciones: vigentesDe(alumno.id_alumno).map(inscripcionConDatos) };
}

function buscarAlumno(id: number) {
  return db.alumnos.find((a) => a.id_alumno === id);
}

function numeroDeQuery(valor: string | null, porDefecto: number): number | null {
  if (valor === null) return porDefecto;
  return /^\d{1,3}$/.test(valor) ? Number(valor) : null;
}

// Sin estado, el back no lista a los dados de baja salvo que se pida incluirBajas=true.
function filtrarPorEstado(alumnos: AlumnoMock[], estado: string | null, incluirBajas: boolean) {
  if (estado) return alumnos.filter((a) => a.estado === estado);
  return incluirBajas ? alumnos : alumnos.filter((a) => a.estado !== "BAJA");
}

// reactivarAlumnoSchema del back (inscripcion.schemas.ts), sin los campos opcionales.
const reactivarBodySchema = z.object({
  id_plan: z.number().int().positive(),
  id_profesora: z.number().int().positive(),
  ids_horarios: z
    .array(z.number().int().positive())
    .min(1)
    .max(7)
    .refine((ids) => new Set(ids).size === ids.length),
});

type ReactivarBody = z.infer<typeof reactivarBodySchema>;

function ocupados(idHorario: number): number {
  return db.inscripciones.filter((i) => i.estado !== "BAJA" && i.ids_horarios.includes(idHorario)).length;
}

// Las reglas de validarHorarios y del cupo del back (inscripcion.service.ts y su repositorio).
function errorDeReactivacion({ id_plan, id_profesora, ids_horarios }: ReactivarBody) {
  const plan = db.planes.find((p) => p.id_plan === id_plan && p.fecha_baja === null);
  if (!plan) return errorApi(404, "NOT_FOUND", "Plan no encontrado");
  if (!db.profesoras.some((p) => p.id_profesora === id_profesora && p.fecha_baja === null)) {
    return errorApi(404, "NOT_FOUND", "Profesora no encontrada, inactiva o sin el rol PROFESORA");
  }
  const horarios = db.horarios.filter((h) => ids_horarios.includes(h.id_horario) && h.fecha_baja === null);
  if (horarios.length !== ids_horarios.length) {
    return errorApi(409, "CONFLICT", "Uno o más horarios no existen o están dados de baja");
  }
  if (horarios.some((h) => h.id_profesora !== id_profesora)) {
    return errorApi(400, "VALIDATION_ERROR", "Todos los horarios deben pertenecer a una misma profesora");
  }
  if (plan.id_actividad_exclusiva !== null && horarios.some((h) => h.id_actividad !== plan.id_actividad_exclusiva)) {
    return errorApi(400, "VALIDATION_ERROR", "Los horarios deben corresponder a la actividad exclusiva del plan");
  }
  if (plan.clases_por_semana !== null && ids_horarios.length > plan.clases_por_semana) {
    return errorApi(400, "VALIDATION_ERROR", "La cantidad de horarios supera las clases por semana del plan");
  }
  const sinCupo = horarios.some((h) => {
    const cupo = h.cupo_maximo ?? db.actividades.find((a) => a.id_actividad === h.id_actividad)?.cupo_maximo ?? null;
    return cupo !== null && ocupados(h.id_horario) >= cupo;
  });
  return sinCupo ? errorApi(409, "CONFLICT", "No hay cupo disponible en uno o más horarios") : null;
}

function inscribirDeNuevo(idAlumno: number, cuerpo: ReactivarBody) {
  const ahora = new Date().toISOString();
  const precio = db.planPrecios.find((p) => p.id_plan === cuerpo.id_plan && p.fecha_vigencia_hasta === null)!;
  const inscripcion = {
    id_inscripcion: siguienteId(db.inscripciones.map((i) => i.id_inscripcion)),
    id_alumno: idAlumno,
    id_plan: cuerpo.id_plan,
    id_plan_precio: precio.id_plan_precio,
    id_profesora: cuerpo.id_profesora,
    id_promocion: null,
    sin_cargo: false,
    fecha_inicio: `${ahora.slice(0, 10)}T00:00:00.000Z`,
    fecha_fin_estimado: null,
    estado: "ACTIVA" as const,
    motivo_baja: null,
    detalle_baja: null,
    observaciones: null,
    fecha_alta: ahora,
    fecha_baja: null,
    ids_horarios: cuerpo.ids_horarios,
  };
  db.inscripciones.push(inscripcion);
  return inscripcion;
}

export const alumnosHandlers = [
  http.get("*/api/v1/alumnos", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const query = new URL(request.url).searchParams;
    const estado = query.get("estado");
    const limit = numeroDeQuery(query.get("limit"), LIMITE_POR_DEFECTO);
    const offset = numeroDeQuery(query.get("offset"), 0);
    if ((estado && !ESTADOS.includes(estado)) || !limit || limit > LIMITE_MAXIMO || offset === null) {
      return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    }

    const filtrados = filtrarPorEstado(db.alumnos, estado, query.get("incluirBajas") === "true");
    return HttpResponse.json({
      datos: filtrados.slice(offset, offset + limit).map(alumnoEnListado),
      total: filtrados.length,
      limit,
      offset,
    });
  }),

  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    return HttpResponse.json(fichaDe(alumno));
  }),

  // Baja lógica (US-08): solo la propietaria. No borra nada: cierra las inscripciones vigentes
  // con el motivo (liberan su cupo) y deja al alumno de baja, sin acceso al sistema.
  http.post("*/api/v1/alumnos/:id/baja", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = bajaAlumnoBodySchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado === "BAJA") return errorApi(409, "CONFLICT", "El alumno ya está dado de baja");

    const ahora = new Date().toISOString();
    for (const inscripcion of vigentesDe(id)) {
      const { motivo_baja, detalle_baja = null } = cuerpo.data;
      Object.assign(inscripcion, { estado: "BAJA", motivo_baja, detalle_baja, fecha_baja: ahora });
    }
    Object.assign(alumno, { estado: "BAJA", fecha_baja: ahora });
    datosPersonales(alumno.id_usuario).estado = "INACTIVO";
    return HttpResponse.json({ mensaje: "Alumno dado de baja" });
  }),

  // Reactivación (US-08): solo la propietaria. Crea una inscripción activa nueva (la de la baja
  // queda en el historial) y vuelve a validar el cupo.
  http.post("*/api/v1/alumnos/:id/reactivar", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = reactivarBodySchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado !== "BAJA") return errorApi(409, "CONFLICT", "Solo se puede reactivar un alumno dado de baja");
    const error = errorDeReactivacion(cuerpo.data);
    if (error) return error;

    const inscripcion = inscribirDeNuevo(id, cuerpo.data);
    Object.assign(alumno, { estado: "ACTIVO", fecha_baja: null });
    datosPersonales(alumno.id_usuario).estado = "ACTIVO";
    return HttpResponse.json(inscripcionConDatos(inscripcion), { status: 201 });
  }),
];
