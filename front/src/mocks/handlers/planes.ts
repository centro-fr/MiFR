import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { db, siguienteId } from "@/mocks/db";
import type { PlanMock, PlanPrecioMock } from "@/mocks/data/inscripciones";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";
import { hoyEnArgentina, precioProgramadoDePlan, precioVigenteDePlan } from "@/mocks/precios";
import { normalizarParaBuscar } from "@/utils/texto";

// Mock de /planes (plan.routes.ts): listado, detalle, precios, alta, edición y baja lógica.

const PROPIETARIA_EDITA = { rol: "PROPIETARIA", permiso: "PLANES_EDITAR" } as const;

function planConPrecio(plan: PlanMock) {
  const actividad = db.actividades.find((a) => a.id_actividad === plan.id_actividad_exclusiva);
  const hoy = hoyEnArgentina();
  return {
    ...plan,
    actividad_exclusiva: actividad
      ? { id_actividad: actividad.id_actividad, nombre: actividad.nombre, modalidad: actividad.modalidad }
      : null,
    precio_vigente: precioVigenteDePlan(plan.id_plan, hoy) ?? null,
    precio_programado: precioProgramadoDePlan(plan.id_plan, hoy) ?? null,
  };
}

// Los mismos topes que el back: nombre 40, descripción 255, frecuencia 1 a 7, gracia 0 a 365.
const editablesSchema = z.object({
  nombre: z.string().trim().min(1).max(40),
  descripcion: z.string().trim().max(255).nullable().optional(),
  clases_por_semana: z.number().int().min(1).max(7).nullable().optional(),
  dias_gracia: z.number().int().min(0).max(365),
  id_actividad_exclusiva: z.number().int().positive().nullable().optional(),
  profesora_unica: z.boolean(),
});

const crearSchema = editablesSchema.extend({
  tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
  precio: z.number().positive().max(99_999_999.99),
});

const actualizarSchema = editablesSchema.partial().refine((cambios) => Object.keys(cambios).length > 0);

const registrarPrecioSchema = z.object({
  precio: z.number().positive().max(99_999_999.99).refine((valor) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6),
  fecha_vigencia_desde: z.string().date(),
});

function diaAnterior(fecha: string): string {
  return new Date(new Date(`${fecha}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}

function aPrecioMock(idPlan: number, precio: number, desde: string): PlanPrecioMock {
  return {
    id_plan_precio: siguienteId(db.planPrecios.map((item) => item.id_plan_precio)),
    id_plan: idPlan,
    precio,
    fecha_vigencia_desde: `${desde}T00:00:00.000Z`,
    fecha_vigencia_hasta: null,
  };
}

function nombreOcupado(nombre: string, excluirId?: number): boolean {
  const buscado = normalizarParaBuscar(nombre);
  return db.planes.some((p) => p.fecha_baja === null && p.id_plan !== excluirId && normalizarParaBuscar(p.nombre) === buscado);
}

function actividadInvalida(idActividad: number | null | undefined): boolean {
  if (idActividad == null) return false;
  return !db.actividades.some((a) => a.id_actividad === idActividad && a.activo);
}

// ck_planes_x3 del DER: la clase suelta no tiene frecuencia semanal ni días de gracia.
function rompeReglaClaseSuelta(tipo: PlanMock["tipo"], clases: number | null, gracia: number): boolean {
  return tipo === "CLASE_SUELTA" && (clases !== null || gracia !== 0);
}

function buscarPlan(params: Record<string, string | readonly string[] | undefined>) {
  const id = idDeRuta(params.id);
  return { id, plan: id === null ? undefined : db.planes.find((p) => p.id_plan === id) };
}

export const planesHandlers = [
  http.get("*/api/v1/planes", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;

    const incluirBajas = new URL(request.url).searchParams.get("incluirBajas") === "true";
    const planes = db.planes
      .filter((plan) => incluirBajas || plan.fecha_baja === null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return HttpResponse.json(planes.map(planConPrecio));
  }),

  http.get("*/api/v1/planes/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;

    const { id, plan } = buscarPlan(params);
    if (id === null) return idInvalido();
    if (!plan) return errorApi(404, "NOT_FOUND", "Plan no encontrado");
    return HttpResponse.json(planConPrecio(plan));
  }),

  http.get("*/api/v1/planes/:id/precios", async ({ request, params }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;

    const { id, plan } = buscarPlan(params);
    if (id === null) return idInvalido();
    if (!plan) return errorApi(404, "NOT_FOUND", "Plan no encontrado");
    const precios = db.planPrecios
      .filter((precio) => precio.id_plan === id)
      .sort((a, b) => b.fecha_vigencia_desde.localeCompare(a.fecha_vigencia_desde));
    return HttpResponse.json(precios);
  }),

  http.post("*/api/v1/planes/:id/precios", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const { id, plan } = buscarPlan(params);
    if (id === null) return idInvalido();
    if (!plan) return errorApi(404, "NOT_FOUND", "Plan no encontrado");
    if (plan.fecha_baja !== null) return errorApi(409, "CONFLICT", "El plan está dado de baja");

    const cuerpo = registrarPrecioSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const { precio, fecha_vigencia_desde: desde } = cuerpo.data;
    const hoy = hoyEnArgentina();
    if (desde < hoy) return errorApi(400, "VALIDATION_ERROR", "La fecha de vigencia no puede ser anterior a hoy");

    db.planPrecios.splice(
      0,
      db.planPrecios.length,
      ...db.planPrecios.filter(
        (item) =>
          !(
            item.id_plan === id &&
            item.fecha_vigencia_desde.slice(0, 10) >= desde &&
            item.fecha_vigencia_desde.slice(0, 10) > hoy
          ),
      ),
    );
    const ultimo = db.planPrecios
      .filter((item) => item.id_plan === id)
      .sort((a, b) => b.fecha_vigencia_desde.localeCompare(a.fecha_vigencia_desde))[0];
    if (ultimo && ultimo.fecha_vigencia_desde.slice(0, 10) >= desde) {
      return errorApi(409, "CONFLICT", "El plan ya tiene un precio que empezó a regir hoy");
    }
    if (ultimo) ultimo.fecha_vigencia_hasta = `${diaAnterior(desde)}T00:00:00.000Z`;

    const nuevoPrecio = aPrecioMock(id, precio, desde);
    db.planPrecios.push(nuevoPrecio);
    return HttpResponse.json(nuevoPrecio, { status: 201 });
  }),

  http.post("*/api/v1/planes", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const cuerpo = crearSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const clases = datos.clases_por_semana ?? null;
    if (rompeReglaClaseSuelta(datos.tipo, clases, datos.dias_gracia)) {
      return errorApi(400, "VALIDATION_ERROR", "Un plan CLASE_SUELTA no lleva clases por semana y sus días de gracia son 0");
    }
    if (actividadInvalida(datos.id_actividad_exclusiva)) {
      return errorApi(400, "VALIDATION_ERROR", "La actividad exclusiva no existe o está dada de baja");
    }
    if (nombreOcupado(datos.nombre)) return errorApi(409, "CONFLICT", "Ya existe un plan vigente con ese nombre");

    const ahora = new Date().toISOString();
    const plan: PlanMock = {
      id_plan: siguienteId(db.planes.map((p) => p.id_plan)),
      tipo: datos.tipo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      clases_por_semana: clases,
      dias_gracia: datos.dias_gracia,
      id_actividad_exclusiva: datos.id_actividad_exclusiva ?? null,
      profesora_unica: datos.profesora_unica,
      fecha_alta: ahora,
      fecha_baja: null,
    };
    db.planes.push(plan);
    db.planPrecios.push({
      id_plan_precio: siguienteId(db.planPrecios.map((p) => p.id_plan_precio)),
      id_plan: plan.id_plan,
      precio: datos.precio,
      fecha_vigencia_desde: `${ahora.slice(0, 10)}T00:00:00.000Z`,
      fecha_vigencia_hasta: null,
    });
    return HttpResponse.json(planConPrecio(plan), { status: 201 });
  }),

  http.patch("*/api/v1/planes/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const { id, plan } = buscarPlan(params);
    if (id === null) return idInvalido();
    if (!plan || plan.fecha_baja !== null) return errorApi(404, "NOT_FOUND", "Plan no encontrado o dado de baja");
    const cuerpo = actualizarSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const cambios = cuerpo.data;

    const clases = cambios.clases_por_semana !== undefined ? cambios.clases_por_semana : plan.clases_por_semana;
    if (rompeReglaClaseSuelta(plan.tipo, clases, cambios.dias_gracia ?? plan.dias_gracia)) {
      return errorApi(400, "VALIDATION_ERROR", "Un plan CLASE_SUELTA no lleva clases por semana y sus días de gracia son 0");
    }
    if (actividadInvalida(cambios.id_actividad_exclusiva)) {
      return errorApi(400, "VALIDATION_ERROR", "La actividad exclusiva no existe o está dada de baja");
    }
    if (cambios.nombre && nombreOcupado(cambios.nombre, id)) {
      return errorApi(409, "CONFLICT", "Ya existe un plan vigente con ese nombre");
    }
    Object.assign(plan, cambios, cambios.descripcion === "" ? { descripcion: null } : {});
    return HttpResponse.json(planConPrecio(plan));
  }),

  // Un plan nunca se borra: las inscripciones que ya tiene lo siguen usando.
  http.delete("*/api/v1/planes/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, PROPIETARIA_EDITA);
    if (denegado) return denegado;

    const { id, plan } = buscarPlan(params);
    if (id === null) return idInvalido();
    if (!plan) return errorApi(404, "NOT_FOUND", "Plan no encontrado");
    if (plan.fecha_baja !== null) return errorApi(409, "CONFLICT", "El plan ya está dado de baja");
    plan.fecha_baja = new Date().toISOString();
    return HttpResponse.json(planConPrecio(plan));
  }),
];
