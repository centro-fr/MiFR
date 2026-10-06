import { http, HttpResponse, delay } from "msw";
import type { ActividadApi, CrearActividadBody } from "@/features/actividades/schemas/actividad";
import { db, siguienteId } from "@/mocks/db";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de /actividades con las reglas de actividad.service.ts y de la baja de
// gestion-servicio-entrenamiento.service.ts (CA-03).

const EDITAR = { rol: "PROPIETARIA", permiso: "ACTIVIDADES_EDITAR" } as const;

function buscarActividad(id: number): ActividadApi | undefined {
  return db.actividades.find((actividad) => actividad.id_actividad === id);
}

function cupoObligatorioFaltante(modalidad: ActividadApi["modalidad"], cupo: number | null | undefined) {
  return modalidad === "PERSONALIZADA" && cupo == null;
}

const ERROR_CUPO = () =>
  errorApi(400, "VALIDATION_ERROR", "El cupo máximo es obligatorio para la modalidad PERSONALIZADA");

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
    if (cupoObligatorioFaltante(datos.modalidad, datos.cupo_maximo)) return ERROR_CUPO();
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
    if (cupoObligatorioFaltante(modalidad, cupo)) return ERROR_CUPO();

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

    if (db.horarios.some((horario) => horario.id_actividad === id && horario.fecha_baja === null)) {
      return errorApi(
        409,
        "CONFLICT",
        "La actividad tiene horarios activos: hay que darlos de baja antes que la actividad",
      );
    }
    const actividad = buscarActividad(id);
    if (!actividad) return errorApi(404, "NOT_FOUND", "Actividad no encontrada");
    if (!actividad.activo) return errorApi(409, "CONFLICT", "La actividad ya está dada de baja");

    actividad.activo = false;
    return HttpResponse.json(actividad);
  }),
];
