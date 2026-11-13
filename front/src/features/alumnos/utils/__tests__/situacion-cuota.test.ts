import { describe, expect, it } from "vitest";
import type { SituacionCuota } from "@/features/alumnos/schemas/alumno";
import {
  compararAlumnosPorCuota,
  compararPorEstadoCuotaYMora,
  detalleVencimiento,
  etiquetaCuota,
  tonoCuota,
} from "../situacion-cuota";

describe("situacion-cuota", () => {
  describe("etiquetaCuota y tonoCuota", () => {
    it("mapea correctamente etiquetas y tonos para cada estado de cuota", () => {
      expect(etiquetaCuota("AL_DIA")).toBe("Al día");
      expect(tonoCuota("AL_DIA")).toBe("al-dia");

      expect(etiquetaCuota("POR_VENCER")).toBe("Por vencer");
      expect(tonoCuota("POR_VENCER")).toBe("por-vencer");

      expect(etiquetaCuota("VENCIDA")).toBe("Vencida");
      expect(tonoCuota("VENCIDA")).toBe("vencida");

      expect(etiquetaCuota("PENDIENTE_DE_PAGO")).toBe("Sin cuota paga");
      expect(tonoCuota("PENDIENTE_DE_PAGO")).toBe("sin-pago");
    });
  });

  describe("detalleVencimiento", () => {
    it("informa vencimiento a futuro, hoy y pasado", () => {
      expect(
        detalleVencimiento({
          estado: "POR_VENCER",
          dias_restantes: 3,
          fecha_vencimiento: "2026-10-15",
          puede_asistir: true,
          tiene_pago_pendiente: false,
        }),
      ).toContain("Vence en 3 días");

      expect(
        detalleVencimiento({
          estado: "POR_VENCER",
          dias_restantes: 0,
          fecha_vencimiento: "2026-10-12",
          puede_asistir: true,
          tiene_pago_pendiente: false,
        }),
      ).toBe("Vence hoy");

      expect(
        detalleVencimiento({
          estado: "VENCIDA",
          dias_restantes: -5,
          fecha_vencimiento: "2026-10-07",
          puede_asistir: false,
          tiene_pago_pendiente: false,
        }),
      ).toContain("Venció hace 5 días");

      expect(
        detalleVencimiento({
          estado: "PENDIENTE_DE_PAGO",
          dias_restantes: null,
          fecha_vencimiento: null,
          puede_asistir: false,
          tiene_pago_pendiente: false,
        }),
      ).toBeNull();
    });
  });

  describe("compararPorEstadoCuotaYMora", () => {
    it("ubica cuotas vencidas antes que cuotas por vencer", () => {
      const vencida: SituacionCuota = {
        estado: "VENCIDA",
        dias_restantes: -2,
        fecha_vencimiento: "2026-10-10",
        puede_asistir: false,
        tiene_pago_pendiente: false,
      };
      const porVencer: SituacionCuota = {
        estado: "POR_VENCER",
        dias_restantes: 1,
        fecha_vencimiento: "2026-10-13",
        puede_asistir: true,
        tiene_pago_pendiente: false,
      };

      expect(compararPorEstadoCuotaYMora(vencida, porVencer)).toBeLessThan(0);
      expect(compararPorEstadoCuotaYMora(porVencer, vencida)).toBeGreaterThan(0);
    });

    it("ubica primero las cuotas con mayor vencimiento entre las vencidas (mayor atraso primero)", () => {
      const atrasoMayor: SituacionCuota = {
        estado: "VENCIDA",
        dias_restantes: -25,
        fecha_vencimiento: "2026-09-15",
        puede_asistir: false,
        tiene_pago_pendiente: false,
      };
      const atrasoMenor: SituacionCuota = {
        estado: "VENCIDA",
        dias_restantes: -3,
        fecha_vencimiento: "2026-10-07",
        puede_asistir: false,
        tiene_pago_pendiente: false,
      };

      // atrasoMayor (-25 días) debe quedar antes que atrasoMenor (-3 días)
      expect(compararPorEstadoCuotaYMora(atrasoMayor, atrasoMenor)).toBeLessThan(0);
      expect(compararPorEstadoCuotaYMora(atrasoMenor, atrasoMayor)).toBeGreaterThan(0);
    });

    it("ubica primero las más próximas a vencer entre cuotas por vencer", () => {
      const venceHoy: SituacionCuota = {
        estado: "POR_VENCER",
        dias_restantes: 0,
        fecha_vencimiento: "2026-10-10",
        puede_asistir: true,
        tiene_pago_pendiente: false,
      };
      const venceEnCincoDias: SituacionCuota = {
        estado: "POR_VENCER",
        dias_restantes: 5,
        fecha_vencimiento: "2026-10-15",
        puede_asistir: true,
        tiene_pago_pendiente: false,
      };

      expect(compararPorEstadoCuotaYMora(venceHoy, venceEnCincoDias)).toBeLessThan(0);
    });

    it("ubica pendientes de pago antes que alumnos al día", () => {
      const pendiente: SituacionCuota = {
        estado: "PENDIENTE_DE_PAGO",
        dias_restantes: null,
        fecha_vencimiento: null,
        puede_asistir: false,
        tiene_pago_pendiente: false,
      };
      const alDia: SituacionCuota = {
        estado: "AL_DIA",
        dias_restantes: 20,
        fecha_vencimiento: "2026-10-30",
        puede_asistir: true,
        tiene_pago_pendiente: false,
      };

      expect(compararPorEstadoCuotaYMora(pendiente, alDia)).toBeLessThan(0);
      expect(compararPorEstadoCuotaYMora(alDia, pendiente)).toBeGreaterThan(0);
    });

    it("ubica alumnos con cuota al día antes que alumnos sin situación de cuota (null)", () => {
      const alDia: SituacionCuota = {
        estado: "AL_DIA",
        dias_restantes: 15,
        fecha_vencimiento: "2026-10-25",
        puede_asistir: true,
        tiene_pago_pendiente: false,
      };

      expect(compararPorEstadoCuotaYMora(alDia, null)).toBeLessThan(0);
      expect(compararPorEstadoCuotaYMora(null, alDia)).toBeGreaterThan(0);
    });
  });

  describe("compararAlumnosPorCuota", () => {
    it("ordena una lista completa de alumnos priorizando mayor vencimiento", () => {
      const alumnos = [
        {
          id_alumno: 1,
          nombre_completo: "Alumno Al Día",
          situacion_cuota: {
            estado: "AL_DIA" as const,
            dias_restantes: 25,
            fecha_vencimiento: "2026-11-05",
            puede_asistir: true,
            tiene_pago_pendiente: false,
          },
        },
        {
          id_alumno: 2,
          nombre_completo: "Alumno Vencido Leve",
          situacion_cuota: {
            estado: "VENCIDA" as const,
            dias_restantes: -2,
            fecha_vencimiento: "2026-10-08",
            puede_asistir: false,
            tiene_pago_pendiente: false,
          },
        },
        {
          id_alumno: 3,
          nombre_completo: "Alumno Vencido Grave",
          situacion_cuota: {
            estado: "VENCIDA" as const,
            dias_restantes: -30,
            fecha_vencimiento: "2026-09-10",
            puede_asistir: false,
            tiene_pago_pendiente: false,
          },
        },
        {
          id_alumno: 4,
          nombre_completo: "Alumno Por Vencer",
          situacion_cuota: {
            estado: "POR_VENCER" as const,
            dias_restantes: 1,
            fecha_vencimiento: "2026-10-11",
            puede_asistir: true,
            tiene_pago_pendiente: false,
          },
        },
        {
          id_alumno: 5,
          nombre_completo: "Alumno Sin Cuota",
          situacion_cuota: null,
        },
      ];

      const ordenados = [...alumnos].sort(compararAlumnosPorCuota);

      expect(ordenados.map((a) => a.id_alumno)).toEqual([
        3, // Vencido grave (-30 días)
        2, // Vencido leve (-2 días)
        4, // Por vencer (1 día)
        1, // Al día (25 días)
        5, // Sin cuota (null)
      ]);
    });

    it("desempata por fecha_alta más reciente si el estado de cuota es idéntico", () => {
      const a = {
        id_alumno: 10,
        fecha_alta: "2026-05-01T00:00:00.000Z",
        situacion_cuota: null,
      };
      const b = {
        id_alumno: 20,
        fecha_alta: "2026-08-01T00:00:00.000Z",
        situacion_cuota: null,
      };

      // b es más reciente en fecha_alta, debe quedar primero
      expect(compararAlumnosPorCuota(a, b)).toBeGreaterThan(0);
      expect(compararAlumnosPorCuota(b, a)).toBeLessThan(0);
    });
  });
});

