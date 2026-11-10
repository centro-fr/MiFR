import { delay, http, HttpResponse } from "msw";
import { db, siguienteId } from "@/mocks/db";
import { errorApi, idDeRuta, verificarAcceso } from "@/mocks/handlers/respuestas";

interface PromocionMock {
  id_promocion: number;
  codigo: string;
  nombre: string;
  tipo_descuento: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  fecha_desde: string;
  fecha_hasta: string;
  activo: boolean;
  ids_planes: number[];
}

export const promociones: PromocionMock[] = [
  { id_promocion: 1, codigo: "VERANO26", nombre: "Verano 2026", tipo_descuento: "PORCENTAJE", valor: 20, fecha_desde: "2026-12-01", fecha_hasta: "2027-02-28", activo: true, ids_planes: [1, 2] },
  { id_promocion: 2, codigo: "NUEVOFR", nombre: "Primera cuota", tipo_descuento: "MONTO_FIJO", valor: 3000, fecha_desde: "2026-10-01", fecha_hasta: "2026-11-30", activo: true, ids_planes: [1] },
  { id_promocion: 3, codigo: "OCTUBRE", nombre: "Octubre pausado", tipo_descuento: "PORCENTAJE", valor: 15, fecha_desde: "2026-10-01", fecha_hasta: "2026-10-31", activo: false, ids_planes: [3] },
];

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function estado(promocion: PromocionMock): "ACTIVA" | "PROGRAMADA" | "VENCIDA" | "DESACTIVADA" {
  if (!promocion.activo) return "DESACTIVADA";
  if (promocion.fecha_hasta < hoy()) return "VENCIDA";
  return promocion.fecha_desde > hoy() ? "PROGRAMADA" : "ACTIVA";
}

function serializar(promocion: PromocionMock) {
  return {
    ...promocion,
    planes: promocion.ids_planes.map((id) => {
      const plan = db.planes.find((item) => item.id_plan === id);
      return { id_plan: id, nombre: plan?.nombre ?? "Plan" };
    }),
    estado: estado(promocion),
  };
}

function buscar(id: string | readonly string[] | undefined): PromocionMock | undefined {
  const numero = idDeRuta(id);
  return numero === null ? undefined : promociones.find((promocion) => promocion.id_promocion === numero);
}

export function precioConPromocion(idPlan: number, precioLista: number, idPromocion: number | null): number {
  if (idPromocion === null) return precioLista;
  const promocion = promociones.find(
    (item) =>
      item.id_promocion === idPromocion &&
      item.activo &&
      item.ids_planes.includes(idPlan) &&
      item.fecha_desde <= hoy() &&
      item.fecha_hasta >= hoy(),
  );
  if (!promocion) return precioLista;
  const descuento =
    promocion.tipo_descuento === "PORCENTAJE"
      ? precioLista * (promocion.valor / 100)
      : Math.min(precioLista, promocion.valor);
  return Math.round((precioLista - descuento) * 100) / 100;
}

export const promocionesHandlers = [
  http.get("*/api/v1/promociones", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;
    return HttpResponse.json(promociones.map(serializar));
  }),
  http.post("*/api/v1/promociones", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PLANES_EDITAR" });
    if (denegado) return denegado;
    const cuerpo = (await request.json()) as Omit<PromocionMock, "id_promocion" | "activo">;
    if (promociones.some((promocion) => promocion.codigo === cuerpo.codigo)) return errorApi(409, "CODIGO_REPETIDO", "Ya existe una promoción con ese código");
    const nueva: PromocionMock = { ...cuerpo, id_promocion: siguienteId(promociones.map((promocion) => promocion.id_promocion)), activo: true };
    promociones.push(nueva);
    return HttpResponse.json(serializar(nueva), { status: 201 });
  }),
  http.patch("*/api/v1/promociones/:id", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PLANES_EDITAR" });
    if (denegado) return denegado;
    const promocion = buscar(params.id);
    if (!promocion) return errorApi(404, "NOT_FOUND", "La promoción no existe");
    if (!promocion.activo || promocion.fecha_hasta < hoy()) return errorApi(409, "PROMOCION_NO_EDITABLE", "La promoción ya no se puede editar");
    Object.assign(promocion, (await request.json()) as Partial<PromocionMock>);
    return HttpResponse.json(serializar(promocion));
  }),
  http.post("*/api/v1/promociones/:id/desactivar", async ({ request, params }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PLANES_EDITAR" });
    if (denegado) return denegado;
    const promocion = buscar(params.id);
    if (!promocion) return errorApi(404, "NOT_FOUND", "La promoción no existe");
    if (!promocion.activo) return errorApi(409, "YA_DESACTIVADA", "La promoción ya está desactivada");
    promocion.activo = false;
    return HttpResponse.json(serializar(promocion));
  }),
  http.post("*/api/v1/promociones/:id/reactivar", async ({ request, params }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PLANES_EDITAR" });
    if (denegado) return denegado;
    const promocion = buscar(params.id);
    if (!promocion) return errorApi(404, "NOT_FOUND", "La promoción no existe");
    if (promocion.activo) return errorApi(409, "YA_ACTIVA", "La promoción ya está activa");
    promocion.activo = true;
    return HttpResponse.json(serializar(promocion));
  }),
];
