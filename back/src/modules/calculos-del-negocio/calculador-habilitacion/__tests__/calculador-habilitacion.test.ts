import { describe, expect, it } from "vitest";
import { CalculadorHabilitacion } from "../calculador-habilitacion.js";
import type { DatosHabilitacion, EstadoHabilitacion } from "../calculador-habilitacion.types.js";

const calculador = new CalculadorHabilitacion();

function fecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function datosMensual(vencimiento: string, hoy: string, diasGracia = 3): DatosHabilitacion {
  return {
    tipoPlan: "MENSUAL",
    vencimiento: fecha(vencimiento),
    diasGracia,
    tienePagoPendiente: false,
    vencidosPuedenAsistir: true,
    hoy: fecha(hoy),
  };
}

function datosClaseSuelta(vencimiento: string, hoy: string): DatosHabilitacion {
  return { ...datosMensual(vencimiento, hoy), tipoPlan: "CLASE_SUELTA", diasGracia: 0 };
}

describe("CalculadorHabilitacion", () => {
  describe("MENSUAL", () => {
    it.each<[string, string, string, number, EstadoHabilitacion, number]>([
      ["antes del vencimiento", "2026-10-10", "2026-10-05", 3, "AL_DIA", 5],
      ["el mismo día del vencimiento", "2026-10-10", "2026-10-10", 3, "AL_DIA", 0],
      ["el primer día de gracia", "2026-10-10", "2026-10-11", 3, "POR_VENCER", -1],
      ["el último día de gracia", "2026-10-10", "2026-10-13", 3, "POR_VENCER", -3],
      ["el día siguiente a la gracia", "2026-10-10", "2026-10-14", 3, "VENCIDA", -4],
      ["con 0 días de gracia, el mismo día", "2026-10-10", "2026-10-10", 0, "AL_DIA", 0],
      ["con 0 días de gracia, el día siguiente", "2026-10-10", "2026-10-11", 0, "VENCIDA", -1],
      ["vencida hace meses", "2026-06-10", "2026-10-10", 3, "VENCIDA", -122],
      ["fin de mes: gracia que cruza a marzo", "2026-02-28", "2026-03-02", 3, "POR_VENCER", -2],
      ["fin de mes: último día de gracia", "2026-02-28", "2026-03-03", 3, "POR_VENCER", -3],
      ["fin de mes: primer día vencida", "2026-02-28", "2026-03-04", 3, "VENCIDA", -4],
      ["año bisiesto: vence el 29 de febrero", "2028-02-29", "2028-02-29", 3, "AL_DIA", 0],
      ["año bisiesto: 1 de marzo con gracia", "2028-02-29", "2028-03-01", 3, "POR_VENCER", -1],
      ["año bisiesto: 1 de marzo sin gracia", "2028-02-29", "2028-03-01", 0, "VENCIDA", -1],
      ["la gracia cruza de año", "2026-12-31", "2027-01-01", 3, "POR_VENCER", -1],
    ])("calcular informa el estado %s", (_caso, vencimiento, hoy, diasGracia, estado, diasRestantes) => {
      const habilitacion = calculador.calcular(datosMensual(vencimiento, hoy, diasGracia));

      expect(habilitacion.estado).toBe(estado);
      expect(habilitacion.diasRestantes).toBe(diasRestantes);
      expect(habilitacion.fechaVencimiento).toEqual(fecha(vencimiento));
    });

    it.each(["2026-10-05", "2026-10-10", "2026-10-12"])(
      "calcular permite asistir con la cuota vigente o en gracia aunque los vencidos no puedan (%s)",
      (hoy) => {
        const datos = { ...datosMensual("2026-10-10", hoy), vencidosPuedenAsistir: false };

        expect(calculador.calcular(datos).puedeAsistir).toBe(true);
      },
    );
  });

  describe("CLASE_SUELTA", () => {
    it.each<[string, string, string, EstadoHabilitacion, number]>([
      ["antes del día de la clase", "2026-10-10", "2026-10-09", "CLASE_SUELTA_VIGENTE", 1],
      ["el día de la clase", "2026-10-10", "2026-10-10", "CLASE_SUELTA_VIGENTE", 0],
      ["el día siguiente a la clase", "2026-10-10", "2026-10-11", "CLASE_SUELTA_VENCIDA", -1],
      ["una semana después de la clase", "2026-10-10", "2026-10-17", "CLASE_SUELTA_VENCIDA", -7],
    ])("calcular informa el estado %s", (_caso, vencimiento, hoy, estado, diasRestantes) => {
      const habilitacion = calculador.calcular(datosClaseSuelta(vencimiento, hoy));

      expect(habilitacion.estado).toBe(estado);
      expect(habilitacion.diasRestantes).toBe(diasRestantes);
      expect(habilitacion.fechaVencimiento).toEqual(fecha(vencimiento));
    });

    it("calcular no da días de gracia aunque el plan los traiga", () => {
      const datos = { ...datosClaseSuelta("2026-10-10", "2026-10-11"), diasGracia: 5 };

      expect(calculador.calcular(datos).estado).toBe("CLASE_SUELTA_VENCIDA");
    });

    it("calcular permite asistir el día de la clase aunque los vencidos no puedan", () => {
      const datos = { ...datosClaseSuelta("2026-10-10", "2026-10-10"), vencidosPuedenAsistir: false };

      expect(calculador.calcular(datos).puedeAsistir).toBe(true);
    });
  });

  describe("vencidos y pagos pendientes", () => {
    it.each<[string, boolean, boolean, boolean]>([
      ["la política deja asistir a los vencidos", true, false, true],
      ["la política no deja asistir a los vencidos", false, false, false],
      ["hay un pago pendiente aunque la política no deje", false, true, true],
      ["hay un pago pendiente y la política deja", true, true, true],
    ])("calcular en VENCIDA: %s", (_caso, vencidosPuedenAsistir, tienePagoPendiente, puedeAsistir) => {
      const datos = {
        ...datosMensual("2026-10-10", "2026-11-20"),
        vencidosPuedenAsistir,
        tienePagoPendiente,
      };

      const habilitacion = calculador.calcular(datos);

      expect(habilitacion.estado).toBe("VENCIDA");
      expect(habilitacion.puedeAsistir).toBe(puedeAsistir);
    });

    it.each<[string, boolean, boolean, boolean]>([
      ["la política deja asistir a los vencidos", true, false, true],
      ["la política no deja asistir a los vencidos", false, false, false],
      ["hay un pago pendiente aunque la política no deje", false, true, true],
    ])(
      "calcular en CLASE_SUELTA_VENCIDA: %s",
      (_caso, vencidosPuedenAsistir, tienePagoPendiente, puedeAsistir) => {
        const datos = {
          ...datosClaseSuelta("2026-10-10", "2026-10-11"),
          vencidosPuedenAsistir,
          tienePagoPendiente,
        };

        const habilitacion = calculador.calcular(datos);

        expect(habilitacion.estado).toBe("CLASE_SUELTA_VENCIDA");
        expect(habilitacion.puedeAsistir).toBe(puedeAsistir);
      },
    );

    it("calcular mantiene el estado y los días restantes con un pago pendiente", () => {
      const sinPendiente = calculador.calcular(datosMensual("2026-10-10", "2026-10-12"));
      const conPendiente = calculador.calcular({
        ...datosMensual("2026-10-10", "2026-10-12"),
        tienePagoPendiente: true,
      });

      expect(conPendiente).toEqual(sinPendiente);
    });
  });

  describe("PENDIENTE_DE_PAGO", () => {
    it.each([false, true])(
      "calcular sin cuota paga no habilita a asistir (pago pendiente: %s)",
      (tienePagoPendiente) => {
        const habilitacion = calculador.calcular({
          ...datosMensual("2026-10-10", "2026-10-10"),
          vencimiento: null,
          tienePagoPendiente,
          vencidosPuedenAsistir: true,
        });

        expect(habilitacion).toEqual({
          estado: "PENDIENTE_DE_PAGO",
          fechaVencimiento: null,
          diasRestantes: null,
          puedeAsistir: false,
        });
      },
    );
  });

  it("calcular no modifica el vencimiento recibido ni devuelve la misma fecha", () => {
    const datos = datosMensual("2026-10-10", "2026-10-10");

    const habilitacion = calculador.calcular(datos);

    expect(datos.vencimiento).toEqual(fecha("2026-10-10"));
    expect(habilitacion.fechaVencimiento).not.toBe(datos.vencimiento);
  });
});
