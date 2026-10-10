import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aprobarTransferenciaSchema,
  informarTransferenciaSchema,
  listarTransferenciasQuerySchema,
  rechazarTransferenciaSchema,
  registrarEfectivoSchema,
  registrarTransferenciaRecibidaSchema,
} from "../pago.schemas.js";

const efectivo = { id_inscripcion: 12, monto: 30000 };
const transferencia = { ...efectivo, fecha_hora_transferencia: "2026-10-09T10:30:00-03:00" };

describe("schemas de pagos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  describe("registrarEfectivoSchema", () => {
    it("completa confirmar_monto_distinto en false y descarta campos desconocidos", () => {
      expect(registrarEfectivoSchema.parse({ ...efectivo, estado: "CONFIRMADO" })).toEqual({
        ...efectivo,
        confirmar_monto_distinto: false,
      });
    });

    it.each([
      ["sin monto", { monto: undefined }],
      ["con monto 0", { monto: 0 }],
      ["con monto -0", { monto: -0 }],
      ["con monto negativo", { monto: -100 }],
      ["con más de dos decimales", { monto: 10.123 }],
      ["con el monto en texto", { monto: "30000" }],
      ["con id_inscripcion -0", { id_inscripcion: -0 }],
      ["con observaciones sin letras", { observaciones: "-0" }],
      ["con observaciones de más de 255 caracteres", { observaciones: "a".repeat(256) }],
      ["con confirmar_monto_distinto en texto", { confirmar_monto_distinto: "true" }],
    ])("rechaza un cobro %s", (_caso, cambio) => {
      expect(registrarEfectivoSchema.safeParse({ ...efectivo, ...cambio }).success).toBe(false);
    });
  });

  describe("informarTransferenciaSchema", () => {
    it("convierte la fecha y hora con zona horaria", () => {
      expect(informarTransferenciaSchema.parse(transferencia).fecha_hora_transferencia).toEqual(
        new Date("2026-10-09T13:30:00Z"),
      );
    });

    it.each([
      ["sin fecha", { fecha_hora_transferencia: undefined }],
      ["con una fecha sin hora", { fecha_hora_transferencia: "2026-10-09" }],
      ["con una fecha futura", { fecha_hora_transferencia: "2026-10-10T10:00:00-03:00" }],
      ["con una fecha que no existe", { fecha_hora_transferencia: "2026-02-30T10:00:00-03:00" }],
      ["con un titular sin letras", { titular_cuenta_origen: "123" }],
      ["con un titular de más de 80 caracteres", { titular_cuenta_origen: "a".repeat(81) }],
    ])("rechaza una transferencia %s", (_caso, cambio) => {
      expect(informarTransferenciaSchema.safeParse({ ...transferencia, ...cambio }).success).toBe(false);
    });

    it("la recibida por la propietaria además admite confirmar el monto distinto", () => {
      expect(registrarTransferenciaRecibidaSchema.parse(transferencia).confirmar_monto_distinto).toBe(false);
    });
  });

  describe("revisión de transferencias", () => {
    it("aprobar completa la confirmación en false", () => {
      expect(aprobarTransferenciaSchema.parse({})).toEqual({ confirmar_monto_distinto: false });
    });

    it("aprobar acepta un pedido sin cuerpo (Express 5 deja req.body undefined)", () => {
      expect(aprobarTransferenciaSchema.parse(undefined)).toEqual({ confirmar_monto_distinto: false });
    });

    it.each([{}, { motivo_rechazo: "" }, { motivo_rechazo: "-0" }, { motivo_rechazo: "a".repeat(256) }])(
      "rechazar exige un motivo con letras de hasta 255 caracteres: %j",
      (cuerpo) => {
        expect(rechazarTransferenciaSchema.safeParse(cuerpo).success).toBe(false);
      },
    );

    it("la query convierte el alumno y rechaza un estado desconocido o un id inválido", () => {
      expect(listarTransferenciasQuerySchema.parse({ estado: "PENDIENTE", id_alumno: "5" })).toEqual({
        estado: "PENDIENTE",
        id_alumno: 5,
        limit: 100,
        offset: 0,
      });
      expect(listarTransferenciasQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
      expect(listarTransferenciasQuerySchema.safeParse({ estado: "VENCIDA" }).success).toBe(false);
      expect(listarTransferenciasQuerySchema.safeParse({ id_alumno: "-0" }).success).toBe(false);
    });
  });
});
