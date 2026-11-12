import { describe, expect, it } from "vitest";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";
import type { Transferencia } from "@/types/transferencia";
import { armarBandeja, detalleDeAlta, detalleDeTransferencia } from "../bandeja";

function transferencia(cambios: Partial<Transferencia> = {}): Transferencia {
  return {
    id: 1,
    estado: "PENDIENTE",
    monto: 42000,
    cargadaEl: "2026-10-18T12:40:00.000Z",
    realizadaEl: null,
    titularCuenta: null,
    observaciones: null,
    resueltaEl: null,
    motivoRechazo: null,
    alumno: { id: 10, nombre: "Valentina", apellido: "Herrera" },
    horasDesdeLaCarga: 1,
    superaPlazo: false,
    tipo: "RENOVACION",
    plan: "Intermedio",
    ...cambios,
  };
}

function alta(cambios: Partial<PreInscripcionPendiente> = {}): PreInscripcionPendiente {
  return {
    idInscripcion: "50",
    idAlumno: "20",
    nombre: "Lautaro",
    apellido: "Díaz",
    dni: null,
    email: null,
    telefono: null,
    fechaNacimiento: "2000-01-01",
    tutor: null,
    idPlan: "1",
    idPromocion: null,
    nombrePlan: "Básico",
    precio: 25000,
    profesora: "Lucía Gómez",
    horarios: [],
    fechaPreInscripcion: "2026-10-17T15:00:00.000Z",
    reserva: { vence: "2026-10-20", vencida: false },
    ...cambios,
  };
}

describe("bandeja Por verificar", () => {
  it("describe la transferencia con su tipo y la fecha y hora de Argentina", () => {
    expect(detalleDeTransferencia(transferencia())).toBe("Transferencia · Renovación · 18/10 09:40");
    expect(detalleDeTransferencia(transferencia({ tipo: null }))).toBe("Transferencia · 18/10 09:40");
  });

  it("describe el alta con su plan y hasta cuándo guarda el lugar", () => {
    expect(detalleDeAlta(alta())).toBe("Alta nueva · Básico · reserva hasta el 20/10");
    expect(detalleDeAlta(alta({ reserva: { vence: "2026-10-12", vencida: true } }))).toBe(
      "Alta nueva · Básico · reserva vencida el 12/10",
    );
    expect(detalleDeAlta(alta({ reserva: null }))).toBe("Alta nueva · Básico");
  });

  it("une las dos listas con la más reciente primero", () => {
    const bandeja = armarBandeja(
      [transferencia({ id: 1, cargadaEl: "2026-10-16T10:00:00.000Z" }), transferencia({ id: 2, cargadaEl: "2026-10-18T10:00:00.000Z" })],
      [alta({ fechaPreInscripcion: "2026-10-17T10:00:00.000Z" })],
    );

    expect(bandeja.map((item) => item.clave)).toEqual(["transferencia-2", "alta-50", "transferencia-1"]);
    expect(bandeja[1]).toMatchObject({ tipo: "ALTA", alumno: "Lautaro Díaz", monto: 25000 });
    // Para la tabla, la cuota o el plan y la fecha van por separado.
    expect(bandeja[0]).toMatchObject({ concepto: "Transferencia", cuotaOPlan: "Renovación", cuando: "18/10 07:00" });
    expect(bandeja[1]).toMatchObject({ concepto: "Alta nueva", cuotaOPlan: "Básico", cuando: "reserva hasta el 20/10" });
  });

  it("muestra una sola vez el alta cuya primera cuota ya llegó por transferencia", () => {
    const bandeja = armarBandeja(
      [transferencia({ id: 7, tipo: null, alumno: { id: 20, nombre: "Lautaro", apellido: "Díaz" } })],
      [alta({ idAlumno: "20" }), alta({ idInscripcion: "51", idAlumno: "21", nombre: "Brenda" })],
    );

    expect(bandeja.map((item) => item.clave)).toEqual(["transferencia-7", "alta-51"]);
    // Sin el tipo del back, la transferencia de un pre-inscripto es su primera cuota.
    expect(bandeja[0].detalle).toBe("Transferencia · Primera cuota · 18/10 09:40");
  });
});
