import { describe, expect, it } from "vitest";
import type { Transferencia } from "@/types/transferencia";
import { FILTROS_INICIALES, filtrarTransferencias, hayFiltrosActivos } from "../filtros-transferencias";

function crearTransferencia(parcial: Partial<Transferencia> & Pick<Transferencia, "id">): Transferencia {
  return {
    estado: "PENDIENTE",
    monto: 30000,
    cargadaEl: "2026-10-12T10:00:00.000Z",
    realizadaEl: "2026-10-12T09:00:00.000Z",
    titularCuenta: null,
    observaciones: null,
    resueltaEl: null,
    motivoRechazo: null,
    alumno: { id: parcial.id, nombre: "Mateo", apellido: "Fernández" },
    horasDesdeLaCarga: 2,
    superaPlazo: false,
    ...parcial,
  };
}

const vieja = crearTransferencia({
  id: 1,
  cargadaEl: "2026-10-10T10:00:00.000Z",
  realizadaEl: "2026-10-10T09:00:00.000Z",
  monto: 20000,
  horasDesdeLaCarga: 30,
  superaPlazo: true,
  alumno: { id: 1, nombre: "Mateo", apellido: "Fernández" },
});
const media = crearTransferencia({
  id: 2,
  cargadaEl: "2026-10-11T10:00:00.000Z",
  realizadaEl: "2026-10-11T12:00:00.000Z",
  monto: 50000,
  horasDesdeLaCarga: 14,
  alumno: { id: 2, nombre: "Valentina", apellido: "Herrera" },
});
const nueva = crearTransferencia({
  id: 3,
  cargadaEl: "2026-10-12T10:00:00.000Z",
  realizadaEl: "2026-10-12T12:00:00.000Z",
  monto: 30000,
  horasDesdeLaCarga: 1,
  alumno: { id: 3, nombre: "Bautista", apellido: "Gómez" },
});
const todas = [nueva, vieja, media];

describe("filtros-transferencias (US-17)", () => {
  it("por defecto ordena las más antiguas primero para respetar las 24 horas", () => {
    expect(filtrarTransferencias(todas, FILTROS_INICIALES).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("ordena por más recientes y por monto", () => {
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, orden: "RECIENTES" }).map((t) => t.id)).toEqual([3, 2, 1]);
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, orden: "MONTO" }).map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("busca por nombre o apellido sin distinguir tildes ni mayúsculas", () => {
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, busqueda: "fernandez" }).map((t) => t.id)).toEqual([1]);
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, busqueda: "  VALENTINA " }).map((t) => t.id)).toEqual([2]);
  });

  it("no devuelve nada si la búsqueda no coincide", () => {
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, busqueda: "zzz" })).toEqual([]);
  });

  it("filtra por tramo de plazo solo entre las pendientes", () => {
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, tramo: "vencida" }).map((t) => t.id)).toEqual([1]);
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, tramo: "por-vencer" }).map((t) => t.id)).toEqual([2]);
    const aprobada = crearTransferencia({ id: 9, estado: "CONFIRMADO", superaPlazo: true, horasDesdeLaCarga: 40 });
    expect(filtrarTransferencias([aprobada], { ...FILTROS_INICIALES, tramo: "vencida" })).toEqual([]);
  });

  it("filtra por el día en que se hizo la transferencia", () => {
    expect(filtrarTransferencias(todas, { ...FILTROS_INICIALES, fecha: "2026-10-11" }).map((t) => t.id)).toEqual([2]);
  });

  it("excluye al filtrar por fecha las que no informaron cuándo se hicieron", () => {
    const sinFecha = crearTransferencia({ id: 7, realizadaEl: null });
    expect(filtrarTransferencias([sinFecha], { ...FILTROS_INICIALES, fecha: "2026-10-12" })).toEqual([]);
  });

  it("detecta si hay filtros activos", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "  " })).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "ma" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, orden: "MONTO" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, tramo: "vencida" })).toBe(true);
  });
});
