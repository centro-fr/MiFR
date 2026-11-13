import { http, HttpResponse, delay } from "msw";
import type { GuardarHorarioBody } from "@/features/horarios/schemas/horario";
import { db, siguienteId, type HorarioMock } from "@/mocks/db";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";
import { horarioConDatos } from "@/mocks/handlers/serializar";

// Mock de /horarios con las reglas de horario.service.ts y horario.repository.ts del back:
// actividad y profesora activas, horas entre 07:00 y 20:00, cupo obligatorio en
// PERSONALIZADA y sin superposición de la misma profesora en el mismo día.

const EDITAR = { rol: "PROPIETARIA", permiso: "HORARIOS_EDITAR" } as const;
const SUPERPOSICION = "La profesora ya tiene un horario superpuesto ese día";

type DatosHorario = Omit<HorarioMock, "id_horario" | "fecha_alta" | "fecha_baja">;

function haySuperposicion(datos: DatosHorario, excluirId?: number): boolean {
  return db.horarios.some(
    (horario) =>
      horario.id_horario !== excluirId &&
      horario.fecha_baja === null &&
      horario.id_profesora === datos.id_profesora &&
      horario.dia_semana === datos.dia_semana &&
      horario.hora_inicio < datos.hora_fin &&
      horario.hora_fin > datos.hora_inicio,
  );
}

// Devuelve el error que respondería el back, o null si el horario es válido.
function validarHorario(datos: DatosHorario, excluirId?: number) {
  const actividad = db.actividades.find((a) => a.id_actividad === datos.id_actividad);
  if (!actividad || !actividad.activo) return errorApi(404, "NOT_FOUND", "Actividad no encontrada o inactiva");
  if (!db.profesoras.some((p) => p.id_profesora === datos.id_profesora && p.fecha_baja === null)) {
    return errorApi(404, "NOT_FOUND", "Profesora no encontrada, inactiva o sin el rol PROFESORA");
  }
  // En el back lo rechaza el esquema Zod, que responde el 400 genérico de validación.
  if ([datos.hora_inicio, datos.hora_fin].some((hora) => hora < "07:00" || hora > "23:00")) {
    return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
  }
  if (datos.hora_fin <= datos.hora_inicio) {
    return errorApi(400, "VALIDATION_ERROR", "La hora de fin debe ser posterior a la hora de inicio");
  }
  if (actividad.modalidad === "PERSONALIZADA" && (datos.cupo_maximo ?? actividad.cupo_maximo) === null) {
    return errorApi(400, "VALIDATION_ERROR", "El cupo máximo es obligatorio para la modalidad PERSONALIZADA");
  }
  if (haySuperposicion(datos, excluirId)) return errorApi(409, "CONFLICT", SUPERPOSICION);
  return null;
}

function buscarHorario(id: number): HorarioMock | undefined {
  return db.horarios.find((horario) => horario.id_horario === id);
}

export const horariosHandlers = [
  http.get("*/api/v1/horarios", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { permiso: "HORARIOS_VER" });
    if (denegado) return denegado;

    const filtros = new URL(request.url).searchParams;
    const idActividad = idDeRuta(filtros.get("id_actividad") ?? undefined);
    const idProfesora = idDeRuta(filtros.get("id_profesora") ?? undefined);
    const activos = db.horarios
      .filter((horario) => horario.fecha_baja === null)
      .filter((horario) => !idActividad || horario.id_actividad === idActividad)
      .filter((horario) => !idProfesora || horario.id_profesora === idProfesora)
      .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
    return HttpResponse.json(activos.map(horarioConDatos));
  }),

  http.get("*/api/v1/horarios/:id", async ({ request, params }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "HORARIOS_VER" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const horario = buscarHorario(id);
    if (!horario) return errorApi(404, "NOT_FOUND", "Horario no encontrado");
    return HttpResponse.json(horarioConDatos(horario));
  }),

  http.post("*/api/v1/horarios", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;

    const body = (await request.json()) as GuardarHorarioBody;
    const datos: DatosHorario = { ...body, cupo_maximo: body.cupo_maximo ?? null };
    const error = validarHorario(datos);
    if (error) return error;

    const nuevo: HorarioMock = {
      ...datos,
      id_horario: siguienteId(db.horarios.map((horario) => horario.id_horario)),
      fecha_alta: new Date().toISOString(),
      fecha_baja: null,
    };
    db.horarios.push(nuevo);
    return HttpResponse.json(horarioConDatos(nuevo), { status: 201 });
  }),

  http.patch("*/api/v1/horarios/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const actual = buscarHorario(id);
    if (!actual) return errorApi(404, "NOT_FOUND", "Horario no encontrado");
    if (actual.fecha_baja !== null) return errorApi(409, "CONFLICT", "El horario ya está dado de baja");

    const cambios = (await request.json()) as Partial<GuardarHorarioBody>;
    const datos: DatosHorario = {
      id_actividad: cambios.id_actividad ?? actual.id_actividad,
      id_profesora: cambios.id_profesora ?? actual.id_profesora,
      dia_semana: cambios.dia_semana ?? actual.dia_semana,
      hora_inicio: cambios.hora_inicio ?? actual.hora_inicio,
      hora_fin: cambios.hora_fin ?? actual.hora_fin,
      cupo_maximo: cambios.cupo_maximo !== undefined ? cambios.cupo_maximo : actual.cupo_maximo,
    };
    const error = validarHorario(datos, id);
    if (error) return error;

    Object.assign(actual, datos);
    return HttpResponse.json(horarioConDatos(actual));
  }),

  http.delete("*/api/v1/horarios/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const horario = buscarHorario(id);
    if (!horario) return errorApi(404, "NOT_FOUND", "Horario no encontrado");
    if (horario.fecha_baja !== null) return errorApi(409, "CONFLICT", "El horario ya está dado de baja");

    horario.fecha_baja = new Date().toISOString();
    return HttpResponse.json({
      horario: horarioConDatos(horario),
      advertencia: "No se verificaron inscripciones futuras; el módulo de inscripciones aún no está disponible.",
    });
  }),
];
