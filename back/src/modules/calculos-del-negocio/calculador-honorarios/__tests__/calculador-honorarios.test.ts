import { describe, expect, it } from "vitest";
import type { ClaseSuplida } from "../../../gestion-inscripciones-y-clases/clase/clase.types.js";
import type { InscripcionACargo } from "../../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import { CalculadorHonorarios } from "../calculador-honorarios.js";
import type { DatosHonorarios, TarifaDeHonorario } from "../calculador-honorarios.types.js";

const calculador = new CalculadorHonorarios();

function fecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const FIN_DEL_PERIODO = fecha("2026-10-31");

function tarifa(parcial: Partial<TarifaDeHonorario> = {}): TarifaDeHonorario {
  return {
    id_tarifa: 1,
    id_profesora: 10,
    concepto: "ALUMNO_A_CARGO",
    id_plan: null,
    tipo_valor: "MONTO_FIJO",
    valor: 5000,
    fecha_vigencia_desde: fecha("2026-01-01"),
    fecha_vigencia_hasta: null,
    ...parcial,
  };
}

// La tarifa de la regla vigente: el 50 % de lo cobrado por cada alumno.
function tarifaAlumno(parcial: Partial<TarifaDeHonorario> = {}): TarifaDeHonorario {
  return tarifa({ tipo_valor: "PORCENTAJE", valor: 50, ...parcial });
}

function inscripcion(parcial: Partial<InscripcionACargo> = {}): InscripcionACargo {
  return {
    id_inscripcion: 100,
    id_alumno: 1,
    id_profesora: 10,
    id_plan: 7,
    sin_cargo: false,
    estado: "ACTIVA",
    fecha_inicio: fecha("2026-09-01"),
    fecha_baja: null,
    ...parcial,
  };
}

function suplida(parcial: Partial<ClaseSuplida> = {}): ClaseSuplida {
  return {
    id_clase: 500,
    id_horario: 3,
    fecha_clase: fecha("2026-10-14"),
    hora_inicio: new Date("1970-01-01T10:00:00Z"),
    hora_fin: new Date("1970-01-01T11:00:00Z"),
    id_prof_suplente: 20,
    id_prof_ausente: 10,
    ...parcial,
  };
}

function datos(parcial: Partial<DatosHonorarios> = {}): DatosHonorarios {
  return {
    finDelPeriodo: FIN_DEL_PERIODO,
    inscripciones: [],
    cobradoEnElPeriodo: new Map(),
    suplencias: [],
    tarifas: [],
    ...parcial,
  };
}

describe("CalculadorHonorarios", () => {
  it("sin inscripciones ni suplencias no devuelve detalles, advertencias ni totales", () => {
    const resultado = calculador.calcular(datos());

    expect(resultado.detalles).toEqual([]);
    expect(resultado.advertencias).toEqual([]);
    expect(resultado.totalesPorProfesora.size).toBe(0);
  });

  describe("ALUMNO_A_CARGO", () => {
    it("paga el porcentaje de lo cobrado en el mes por cada inscripción", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion(), inscripcion({ id_inscripcion: 101, id_alumno: 2, id_plan: 8 })],
          cobradoEnElPeriodo: new Map([
            [100, 20000],
            [101, 32000],
          ]),
          tarifas: [tarifaAlumno()],
        }),
      );

      expect(resultado.detalles).toEqual([
        {
          id_profesora: 10,
          concepto: "ALUMNO_A_CARGO",
          id_tarifa: 1,
          id_inscripcion: 100,
          id_clase: null,
          monto: 10000,
        },
        {
          id_profesora: 10,
          concepto: "ALUMNO_A_CARGO",
          id_tarifa: 1,
          id_inscripcion: 101,
          id_clase: null,
          monto: 16000,
        },
      ]);
      expect(resultado.advertencias).toEqual([]);
    });

    it.each<[string, number, number, number]>([
      ["la mitad de lo cobrado", 32000, 50, 16000],
      ["la mitad con centavos", 32000.5, 50, 16000.25],
      ["redondea al centavo", 100.1, 33.33, 33.36],
      ["el cien por ciento", 32000, 100, 32000],
    ])("aplica el valor sobre lo cobrado: %s", (_caso, cobrado, valor, esperado) => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion()],
          cobradoEnElPeriodo: new Map([[100, cobrado]]),
          tarifas: [tarifaAlumno({ valor })],
        }),
      );

      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]?.monto).toBe(esperado);
    });

    it.each<[string, ReadonlyMap<number, number>]>([
      ["cobró 0", new Map([[100, 0]])],
      ["no figura entre lo cobrado", new Map()],
    ])("una inscripción que %s no genera línea ni advertencia", (_caso, cobrado) => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion()],
          cobradoEnElPeriodo: cobrado,
          tarifas: [tarifaAlumno()],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([]);
      expect(resultado.totalesPorProfesora.size).toBe(0);
    });

    it("una tarifa de MONTO_FIJO ya no se aplica a los alumnos: no genera la línea y la advierte", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion()],
          cobradoEnElPeriodo: new Map([[100, 20000]]),
          tarifas: [tarifa()],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([
        {
          id_profesora: 10,
          concepto: "ALUMNO_A_CARGO",
          motivo: "TARIFA_NO_APLICABLE",
          id_inscripcion: 100,
          id_clase: null,
          fecha: FIN_DEL_PERIODO,
        },
      ]);
    });

    it.each<[string, Partial<InscripcionACargo>]>([
      ["la inscripción sin cargo", { sin_cargo: true }],
      ["la pre-inscripción", { estado: "PREINSCRIPTA" }],
    ])("no genera honorarios por %s ni la advierte, aunque tenga pagos", (_caso, parcial) => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion(parcial)],
          cobradoEnElPeriodo: new Map([[100, 20000]]),
          tarifas: [tarifaAlumno()],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([]);
    });

    it("la tarifa del plan gana a la de todos los planes", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion()],
          cobradoEnElPeriodo: new Map([[100, 20000]]),
          tarifas: [
            tarifaAlumno({ id_tarifa: 1, valor: 50 }),
            tarifaAlumno({ id_tarifa: 2, id_plan: 7, valor: 10 }),
          ],
        }),
      );

      expect(resultado.detalles[0]).toMatchObject({ id_tarifa: 2, monto: 2000 });
    });

    it("sin tarifa de su plan usa la de todos los planes", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion({ id_plan: 9 })],
          cobradoEnElPeriodo: new Map([[100, 20000]]),
          tarifas: [
            tarifaAlumno({ id_tarifa: 1, valor: 50 }),
            tarifaAlumno({ id_tarifa: 2, id_plan: 7, valor: 10 }),
          ],
        }),
      );

      expect(resultado.detalles[0]).toMatchObject({ id_tarifa: 1, monto: 10000 });
    });

    it.each<[string, TarifaDeHonorario]>([
      ["de otro plan", tarifaAlumno({ id_plan: 8 })],
      ["de otra profesora", tarifaAlumno({ id_profesora: 99 })],
      ["de otro concepto", tarifaAlumno({ concepto: "HORA_SUPLENCIA" })],
    ])("una tarifa %s no aplica: no genera la línea y la advierte", (_caso, tarifaAjena) => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion()],
          cobradoEnElPeriodo: new Map([[100, 20000]]),
          tarifas: [tarifaAjena],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([
        {
          id_profesora: 10,
          concepto: "ALUMNO_A_CARGO",
          motivo: "SIN_TARIFA",
          id_inscripcion: 100,
          id_clase: null,
          fecha: FIN_DEL_PERIODO,
        },
      ]);
    });

    it("una inscripción sin tarifa no frena a las demás", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion(), inscripcion({ id_inscripcion: 101, id_profesora: 11 })],
          cobradoEnElPeriodo: new Map([
            [100, 20000],
            [101, 20000],
          ]),
          tarifas: [tarifaAlumno()],
        }),
      );

      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]).toMatchObject({ id_profesora: 10, id_inscripcion: 100 });
      expect(resultado.advertencias).toEqual([
        expect.objectContaining({ id_profesora: 11, id_inscripcion: 101, motivo: "SIN_TARIFA" }),
      ]);
    });

    describe("vigencia de la tarifa en una inscripción activa (se busca al fin del período)", () => {
      it.each<[string, string, string | null, boolean]>([
        ["empieza el último día del período", "2026-10-31", null, true],
        ["empieza el día siguiente al fin del período", "2026-11-01", null, false],
        ["vence el último día del período", "2026-01-01", "2026-10-31", true],
        ["venció el día anterior al fin del período", "2026-01-01", "2026-10-30", false],
      ])("la tarifa que %s", (_caso, desde, hasta, aplica) => {
        const resultado = calculador.calcular(
          datos({
            inscripciones: [inscripcion()],
            cobradoEnElPeriodo: new Map([[100, 20000]]),
            tarifas: [
              tarifaAlumno({
                fecha_vigencia_desde: fecha(desde),
                fecha_vigencia_hasta: hasta ? fecha(hasta) : null,
              }),
            ],
          }),
        );

        expect(resultado.detalles).toHaveLength(aplica ? 1 : 0);
        expect(resultado.advertencias).toHaveLength(aplica ? 0 : 1);
      });
    });

    describe("baja en el medio del mes (se busca el día de la baja, en Argentina)", () => {
      const tarifaHastaEl14 = tarifaAlumno({ fecha_vigencia_hasta: fecha("2026-10-14") });
      const cobrado = new Map([[100, 20000]]);

      it.each<[string, string, boolean]>([
        ["el 10, con la tarifa vigente hasta el 14", "2026-10-10T15:00:00Z", true],
        ["el 20, con la tarifa vencida el 14", "2026-10-20T15:00:00Z", false],
        ["el 14 a las 22:00 de Argentina, que ya es el 15 en UTC", "2026-10-15T01:00:00Z", true],
        ["el 15 a las 00:30 de Argentina", "2026-10-15T03:30:00Z", false],
      ])("dada de baja %s", (_caso, instante, aplica) => {
        const resultado = calculador.calcular(
          datos({
            inscripciones: [inscripcion({ estado: "BAJA", fecha_baja: new Date(instante) })],
            cobradoEnElPeriodo: cobrado,
            tarifas: [tarifaHastaEl14],
          }),
        );

        expect(resultado.detalles).toHaveLength(aplica ? 1 : 0);
      });

      it("sin la baja, la misma tarifa ya no aplicaría al fin del período", () => {
        const resultado = calculador.calcular(
          datos({ inscripciones: [inscripcion()], cobradoEnElPeriodo: cobrado, tarifas: [tarifaHastaEl14] }),
        );

        expect(resultado.detalles).toEqual([]);
      });

      it("la advertencia informa el día de la baja con el que se buscó la tarifa", () => {
        const resultado = calculador.calcular(
          datos({
            inscripciones: [inscripcion({ estado: "BAJA", fecha_baja: new Date("2026-10-10T15:00:00Z") })],
            cobradoEnElPeriodo: cobrado,
            tarifas: [tarifaAlumno({ fecha_vigencia_desde: fecha("2026-10-11") })],
          }),
        );

        expect(resultado.advertencias[0]?.fecha).toEqual(fecha("2026-10-10"));
      });

      it("una baja posterior al fin del período se liquida al fin del período", () => {
        const resultado = calculador.calcular(
          datos({
            inscripciones: [inscripcion({ estado: "BAJA", fecha_baja: new Date("2026-11-05T15:00:00Z") })],
            cobradoEnElPeriodo: cobrado,
            tarifas: [tarifaAlumno({ fecha_vigencia_hasta: FIN_DEL_PERIODO })],
          }),
        );

        expect(resultado.detalles).toHaveLength(1);
      });

      it("una baja que no cobró nada en el mes no genera honorarios", () => {
        const resultado = calculador.calcular(
          datos({
            inscripciones: [inscripcion({ estado: "BAJA", fecha_baja: new Date("2026-10-10T15:00:00Z") })],
            tarifas: [tarifaHastaEl14],
          }),
        );

        expect(resultado.detalles).toEqual([]);
        expect(resultado.advertencias).toEqual([]);
      });
    });
  });

  describe("suplencias", () => {
    const tarifaSuplente = tarifa({
      id_tarifa: 2,
      id_profesora: 20,
      concepto: "HORA_SUPLENCIA",
      valor: 4000,
    });

    it("suma a la suplente y resta a la ausente, a la tarifa de la suplente por las horas de la clase", () => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida({ hora_fin: new Date("1970-01-01T11:30:00Z") })],
          tarifas: [tarifaSuplente],
        }),
      );

      expect(resultado.detalles).toEqual([
        {
          id_profesora: 20,
          concepto: "CLASE_SUPLIDA",
          id_tarifa: 2,
          id_inscripcion: null,
          id_clase: 500,
          monto: 6000,
        },
        {
          id_profesora: 10,
          concepto: "DESCUENTO_AUSENCIA",
          id_tarifa: 2,
          id_inscripcion: null,
          id_clase: 500,
          monto: -6000,
        },
      ]);
      expect(resultado.advertencias).toEqual([]);
    });

    it.each<[string, string, number, number]>([
      ["una hora", "11:00", 4000, 4000],
      ["tres cuartos de hora", "10:45", 4000, 3000],
      ["un tercio de hora, redondeado al centavo", "10:20", 1000, 333.33],
    ])("paga por las horas de la clase: %s", (_caso, horaFin, valor, esperado) => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida({ hora_fin: new Date(`1970-01-01T${horaFin}:00Z`) })],
          tarifas: [{ ...tarifaSuplente, valor }],
        }),
      );

      expect(resultado.detalles.map(({ monto }) => monto)).toEqual([esperado, -esperado]);
    });

    it("si el monto de la clase redondea a 0,00 no genera ni la suma ni el descuento, ni advierte", () => {
      // 0,01 por hora x 10 minutos = 0,0016 -> 0,00
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida({ hora_fin: new Date("1970-01-01T10:10:00Z") })],
          tarifas: [{ ...tarifaSuplente, valor: 0.01 }],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([]);
      expect(resultado.totalesPorProfesora.size).toBe(0);
    });

    it("usa la tarifa HORA_SUPLENCIA de la suplente y no la de la ausente", () => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida()],
          tarifas: [
            tarifa({ id_tarifa: 1, id_profesora: 10, concepto: "HORA_SUPLENCIA", valor: 2000 }),
            tarifaSuplente,
          ],
        }),
      );

      expect(resultado.detalles.map(({ id_tarifa, monto }) => [id_tarifa, monto])).toEqual([
        [2, 4000],
        [2, -4000],
      ]);
    });

    it.each<[string, string, number, number]>([
      ["antes del cambio de tarifa", "2026-10-10", 4000, 2],
      ["después del cambio de tarifa", "2026-10-14", 5000, 3],
    ])("usa la tarifa vigente el día de la clase: %s", (_caso, dia, monto, idTarifa) => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida({ fecha_clase: fecha(dia) })],
          tarifas: [
            { ...tarifaSuplente, fecha_vigencia_hasta: fecha("2026-10-10") },
            { ...tarifaSuplente, id_tarifa: 3, valor: 5000, fecha_vigencia_desde: fecha("2026-10-11") },
          ],
        }),
      );

      expect(resultado.detalles[0]).toMatchObject({ id_tarifa: idTarifa, monto });
    });

    it("sin tarifa de la suplente no suma ni descuenta, y lo advierte una sola vez", () => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida()],
          tarifas: [tarifa({ id_profesora: 10, concepto: "HORA_SUPLENCIA" })],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([
        {
          id_profesora: 20,
          concepto: "HORA_SUPLENCIA",
          motivo: "SIN_TARIFA",
          id_inscripcion: null,
          id_clase: 500,
          fecha: fecha("2026-10-14"),
        },
      ]);
    });

    it("una tarifa PORCENTAJE de HORA_SUPLENCIA no tiene base de cálculo: no se aplica y se advierte", () => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida()],
          tarifas: [{ ...tarifaSuplente, tipo_valor: "PORCENTAJE", valor: 50 }],
        }),
      );

      expect(resultado.detalles).toEqual([]);
      expect(resultado.advertencias).toEqual([
        expect.objectContaining({ id_profesora: 20, motivo: "TARIFA_NO_APLICABLE", id_clase: 500 }),
      ]);
    });
  });

  describe("totales por profesora", () => {
    it("el ejemplo de US-23: $200.000 cobrados por varios alumnos dan $100.000 de honorarios", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [
            inscripcion(),
            inscripcion({ id_inscripcion: 101, id_alumno: 2 }),
            inscripcion({ id_inscripcion: 102, id_alumno: 3 }),
          ],
          cobradoEnElPeriodo: new Map([
            [100, 80000],
            [101, 70000],
            [102, 50000],
          ]),
          tarifas: [tarifaAlumno()],
        }),
      );

      expect(resultado.totalesPorProfesora.get(10)).toBe(100000);
    });

    it("suma los detalles de cada profesora, con los descuentos", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [
            inscripcion(),
            inscripcion({ id_inscripcion: 101, id_alumno: 2 }),
            inscripcion({ id_inscripcion: 102, id_alumno: 3, id_profesora: 20 }),
          ],
          cobradoEnElPeriodo: new Map([
            [100, 10000],
            [101, 10000],
            [102, 6000],
          ]),
          suplencias: [suplida()],
          tarifas: [
            tarifaAlumno({ id_tarifa: 1, id_profesora: 10 }),
            tarifaAlumno({ id_tarifa: 2, id_profesora: 20 }),
            tarifa({ id_tarifa: 3, id_profesora: 20, concepto: "HORA_SUPLENCIA", valor: 4000 }),
          ],
        }),
      );

      expect([...resultado.totalesPorProfesora]).toEqual([
        [10, 6000],
        [20, 7000],
      ]);
    });

    it("una profesora que solo tiene un descuento queda en negativo", () => {
      const resultado = calculador.calcular(
        datos({
          suplencias: [suplida()],
          tarifas: [tarifa({ id_tarifa: 3, id_profesora: 20, concepto: "HORA_SUPLENCIA", valor: 4000 })],
        }),
      );

      expect(resultado.totalesPorProfesora.get(10)).toBe(-4000);
    });

    it("suma en centavos, sin los errores de la coma flotante", () => {
      const resultado = calculador.calcular(
        datos({
          inscripciones: [inscripcion(), inscripcion({ id_inscripcion: 101, id_alumno: 2, id_plan: 8 })],
          cobradoEnElPeriodo: new Map([
            [100, 0.2],
            [101, 0.4],
          ]),
          tarifas: [tarifaAlumno()],
        }),
      );

      // 0,10 + 0,20 deben dar 0,30 y no 0,30000000000000004
      expect(resultado.totalesPorProfesora.get(10)).toBe(0.3);
    });
  });
});
