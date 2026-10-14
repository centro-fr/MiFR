import { http, HttpResponse, delay } from "msw";
import {
  CUPO_MAXIMO_GRUPAL,
  CUPO_MAXIMO_PERSONALIZADA,
  type ActividadApi,
  type CrearActividadBody,
} from "@/features/actividades/schemas/actividad";
import { db, siguienteId } from "@/mocks/db";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de /actividades con las reglas de actividad.service.ts y de la baja de
// gestion-servicio-entrenamiento.service.ts (CA-03).

const EDITAR = { rol: "PROPIETARIA", permiso: "ACTIVIDADES_EDITAR" } as const;

function buscarActividad(id: number): ActividadApi | undefined {
  return db.actividades.find((actividad) => actividad.id_actividad === id);
}

function validarCupoActividad(modalidad: ActividadApi["modalidad"], cupo: number | null | undefined): string | null {
  if (modalidad === "PERSONALIZADA") {
    if (cupo == null) return "El cupo máximo es obligatorio para la modalidad PERSONALIZADA";
    if (cupo < 1 || cupo > CUPO_MAXIMO_PERSONALIZADA) {
      return `El cupo máximo para la modalidad PERSONALIZADA debe estar entre 1 y ${CUPO_MAXIMO_PERSONALIZADA}`;
    }
  }
  if (modalidad === "GRUPAL" && cupo != null) {
    if (cupo < 1 || cupo > CUPO_MAXIMO_GRUPAL) {
      return `El cupo máximo para la modalidad GRUPAL debe estar entre 1 y ${CUPO_MAXIMO_GRUPAL}`;
    }
  }
  return null;
}

// Un plan vigente exclusivo quedaría ofrecido sin horarios donde inscribir (US-11).
function errorPlanesExclusivos(idActividad: number): string | null {
  const nombres = db.planes
    .filter((plan) => plan.id_actividad_exclusiva === idActividad && plan.fecha_baja === null)
    .map((plan) => plan.nombre);
  if (nombres.length === 0) return null;
  return (
    `La actividad tiene planes vigentes que son solo de ella (${nombres.join(", ")}): ` +
    "dalos de baja o pasalos a otra actividad antes de darla de baja"
  );
}

export const actividadesHandlers = [
  http.get("*/api/v1/actividades", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ACTIVIDADES_VER" });
    if (denegado) return denegado;

    const busqueda = new URL(request.url).searchParams.get("busqueda")?.trim().toLowerCase();
    const activas = db.actividades
      .filter((actividad) => actividad.activo)
      .filter(
        (actividad) =>
          !busqueda ||
          actividad.codigo.toLowerCase().includes(busqueda) ||
          actividad.nombre.toLowerCase().includes(busqueda),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return HttpResponse.json(activas);
  }),

  http.get("*/api/v1/actividades/:id", async ({ request, params }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "ACTIVIDADES_VER" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const actividad = buscarActividad(id);
    if (!actividad) return errorApi(404, "NOT_FOUND", "Actividad no encontrada");
    return HttpResponse.json(actividad);
  }),

  http.post("*/api/v1/actividades", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;

    const datos = (await request.json()) as CrearActividadBody;
    const errorCupo = validarCupoActividad(datos.modalidad, datos.cupo_maximo);
    if (errorCupo) return errorApi(400, "VALIDATION_ERROR", errorCupo);
    if (db.actividades.some((actividad) => actividad.codigo === datos.codigo)) {
      return errorApi(409, "CONFLICT", "Ya existe una actividad con ese código");
    }

    const nueva: ActividadApi = {
      id_actividad: siguienteId(db.actividades.map((actividad) => actividad.id_actividad)),
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      modalidad: datos.modalidad,
      cupo_maximo: datos.cupo_maximo ?? null,
      activo: true,
    };
    db.actividades.push(nueva);
    return HttpResponse.json(nueva, { status: 201 });
  }),

  http.patch("*/api/v1/actividades/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const actividad = buscarActividad(id);
    if (!actividad) return errorApi(404, "NOT_FOUND", "Actividad no encontrada");
    if (!actividad.activo) return errorApi(404, "NOT_FOUND", "Actividad no encontrada o inactiva");

    const cambios = (await request.json()) as Partial<CrearActividadBody>;
    const modalidad = cambios.modalidad ?? actividad.modalidad;
    const cupo = cambios.cupo_maximo !== undefined ? cambios.cupo_maximo : actividad.cupo_maximo;
    const errorCupoPatch = validarCupoActividad(modalidad, cupo);
    if (errorCupoPatch) return errorApi(400, "VALIDATION_ERROR", errorCupoPatch);

    Object.assign(actividad, {
      nombre: cambios.nombre ?? actividad.nombre,
      descripcion: cambios.descripcion ?? actividad.descripcion,
      modalidad,
      cupo_maximo: cupo,
    });
    return HttpResponse.json(actividad);
  }),

  http.delete("*/api/v1/actividades/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const actividad = buscarActividad(id);
    if (!actividad) return errorApi(404, "NOT_FOUND", "Actividad no encontrada");
    if (!actividad.activo) return errorApi(409, "CONFLICT", "La actividad ya está dada de baja");

    const errorPlanes = errorPlanesExclusivos(id);
    if (errorPlanes) return errorApi(409, "CONFLICT", errorPlanes);
    if (db.horarios.some((horario) => horario.id_actividad === id && horario.fecha_baja === null)) {
      return errorApi(
        409,
        "CONFLICT",
        "La actividad tiene horarios activos: hay que darlos de baja antes que la actividad",
      );
    }

    actividad.activo = false;
    return HttpResponse.json(actividad);
  }),
];
