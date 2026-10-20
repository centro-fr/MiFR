import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import { CalculadorHabilitacion } from "../../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.js";
import type { ICalculoHabilitacion } from "../../../calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.js";
import type { ICalculoVencimiento } from "../../../calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.js";
import type { InscripcionACobrar } from "../../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoInscripciones } from "../../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoPlanes } from "../../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { CuotaRepository } from "../cuota.repository.js";
import { CuotaService } from "../cuota.service.js";
import type { SituacionDeCuotas } from "../cuota.types.js";

// 15:00 UTC del 9 de octubre: en Argentina también es el 9.
const AHORA = new Date("2026-10-09T15:00:00Z");
const HOY = new Date("2026-10-09T00:00:00Z");
const DIA_DESPUES = new Date("2026-10-10T00:00:00Z");
const DOS_DIAS_DESPUES = new Date("2026-10-11T00:00:00Z");
const VENCIMIENTO_CALCULADO = new Date("2026-11-09T00:00:00Z");

const inscripcion = {
  id_inscripcion: 12,
  id_plan: 1,
  id_promocion: null,
  estado: "ACTIVA",
  alumno: { estado: "ACTIVO" },
} as unknown as InscripcionACobrar;

function situacion(
  cuotas: SituacionDeCuotas["cuotas"] = [],
  tipo_plan: "MENSUAL" | "CLASE_SUELTA" = "MENSUAL",
  fecha_baja: Date | null = null,
): SituacionDeCuotas {
  return { id_inscripcion: 12, tipo_plan, dias_gracia: 5, fecha_baja, cuotas };
}

function cuota(
  numero_cuota: number,
  estados_pagos: SituacionDeCuotas["cuotas"][number]["estados_pagos"],
  fecha = HOY,
) {
  return { id_cuota: numero_cuota + 100, numero_cuota, fecha_vencimiento: fecha, estados_pagos };
}

function crearMocks() {
  return {
    repositorio: {
      situacionDeInscripciones: vi.fn().mockResolvedValue([situacion()]),
      historialDeAlumno: vi.fn().mockResolvedValue(["historial"]),
      tuvoPagoConfirmado: vi.fn().mockResolvedValue(true),
    },
    inscripciones: { buscarParaCobro: vi.fn().mockResolvedValue(inscripcion), activar: vi.fn() },
    planes: { precioACobrar: vi.fn().mockResolvedValue({ precio_lista: 30000, descuento: 0, monto: 30000 }) },
    vencimientos: { calcularVencimiento: vi.fn().mockReturnValue(VENCIMIENTO_CALCULADO) },
    habilitaciones: { calcular: vi.fn().mockReturnValue({ estado: "AL_DIA", puedeAsistir: true }) },
    parametros: { obtener: vi.fn().mockResolvedValue(true) },
  };
}

describe("CuotaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: CuotaService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    mocks = crearMocks();
    servicio = new CuotaService(
      mocks.repositorio as unknown as CuotaRepository,
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.planes as unknown as IInfoPlanes,
      mocks.vencimientos as ICalculoVencimiento,
      mocks.habilitaciones as unknown as ICalculoHabilitacion,
      mocks.parametros as unknown as IInfoParametros,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe("prepararCobro", () => {
    it("cobra con el descuento de la promoción que guardó la inscripción (US-13)", async () => {
      mocks.planes.precioACobrar.mockResolvedValue({ precio_lista: 30000, descuento: 3000, monto: 27000 });
      const conPromocion = { ...inscripcion, id_promocion: 4 } as unknown as InscripcionACobrar;

      await expect(servicio.prepararCobro(conPromocion)).resolves.toMatchObject({ monto: 27000 });
      expect(mocks.planes.precioACobrar).toHaveBeenCalledWith(1, HOY, 4);
    });

    it("la primera cuota cubre desde hoy, con el precio vigente y el vencimiento calculado", async () => {
      await expect(servicio.prepararCobro(inscripcion)).resolves.toEqual({
        inscripcion,
        idCuotaExistente: null,
        numeroCuota: 1,
        fechaVencimiento: VENCIMIENTO_CALCULADO,
        monto: 30000,
      });
      expect(mocks.planes.precioACobrar).toHaveBeenCalledWith(1, HOY, null);
      expect(mocks.vencimientos.calcularVencimiento).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        desde: HOY,
      });
    });

    it("un mensual al día que paga por adelantado sigue el día después del vencimiento vigente", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(1, ["CONFIRMADO"], DIA_DESPUES)]),
      ]);

      await expect(servicio.prepararCobro(inscripcion)).resolves.toMatchObject({
        numeroCuota: 2,
        idCuotaExistente: null,
      });
      expect(mocks.vencimientos.calcularVencimiento).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        desde: DOS_DIAS_DESPUES,
      });
    });

    it("quien paga el mismo día en que vence su cuota sigue desde el día siguiente", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(1, ["CONFIRMADO"], HOY)]),
      ]);

      await servicio.prepararCobro(inscripcion);

      expect(mocks.vencimientos.calcularVencimiento).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        desde: DIA_DESPUES,
      });
    });

    it("un vencido o una clase suelta cubren desde hoy", async () => {
      const vencida = cuota(1, ["CONFIRMADO"], new Date("2026-09-01T00:00:00Z"));
      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([situacion([vencida])]);
      await servicio.prepararCobro(inscripcion);

      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([
        situacion([cuota(1, ["CONFIRMADO"], DIA_DESPUES)], "CLASE_SUELTA"),
      ]);
      await servicio.prepararCobro(inscripcion);

      expect(mocks.vencimientos.calcularVencimiento.mock.calls.map(([datos]) => datos.desde)).toEqual([
        HOY,
        HOY,
      ]);
    });

    it("reusa la última cuota si quedó sin pagar, por ejemplo después de un rechazo", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(2, ["RECHAZADO"]), cuota(1, ["CONFIRMADO"])]),
      ]);

      await expect(servicio.prepararCobro(inscripcion)).resolves.toMatchObject({
        idCuotaExistente: 102,
        numeroCuota: 2,
      });
    });

    it("rechaza una inscripción dada de baja o de un alumno dado de baja", async () => {
      await expect(servicio.prepararCobro({ ...inscripcion, estado: "BAJA" })).rejects.toThrow(
        "dado de baja",
      );
      await expect(
        servicio.prepararCobro({ ...inscripcion, alumno: { ...inscripcion.alumno, estado: "BAJA" } }),
      ).rejects.toThrow("dado de baja");
      expect(mocks.repositorio.situacionDeInscripciones).not.toHaveBeenCalled();
    });

    it("consulta las cuotas y el precio vigente en paralelo", async () => {
      let resolverSituacion: (valor: SituacionDeCuotas[]) => void = () => {};
      mocks.repositorio.situacionDeInscripciones.mockReturnValue(
        new Promise((resolver) => (resolverSituacion = resolver)),
      );

      const cobro = servicio.prepararCobro(inscripcion);
      await Promise.resolve();
      expect(mocks.planes.precioACobrar).toHaveBeenCalled();

      resolverSituacion([situacion()]);
      await expect(cobro).resolves.toMatchObject({ numeroCuota: 1 });
    });

    it("rechaza si hay una transferencia pendiente de revisión o si el plan no tiene precio", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([
        situacion([cuota(1, ["PENDIENTE"])]),
      ]);
      await expect(servicio.prepararCobro(inscripcion)).rejects.toThrow("transferencia pendiente");

      mocks.planes.precioACobrar.mockResolvedValueOnce(null);
      await expect(servicio.prepararCobro(inscripcion)).rejects.toThrow(ConflictError);
    });
  });

  it("buscarInscripcion trae la inscripción con lo que necesita el cobro, o null", async () => {
    await expect(servicio.buscarInscripcion(12)).resolves.toBe(inscripcion);
    expect(mocks.inscripciones.buscarParaCobro).toHaveBeenCalledWith(12);
  });

  it("historialDeAlumno devuelve las cuotas del alumno con sus pagos", async () => {
    await expect(servicio.historialDeAlumno(5)).resolves.toEqual(["historial"]);
    expect(mocks.repositorio.historialDeAlumno).toHaveBeenCalledWith(5);
  });

  it("tuvoPagoConfirmado consulta los pagos del alumno", async () => {
    await expect(servicio.tuvoPagoConfirmado(5)).resolves.toBe(true);
    expect(mocks.repositorio.tuvoPagoConfirmado).toHaveBeenCalledWith(5);
  });

  it("darAltaDefinitiva activa la inscripción (US-07)", async () => {
    await servicio.darAltaDefinitiva(12);

    expect(mocks.inscripciones.activar).toHaveBeenCalledWith(12);
  });

  describe("habilitacionDeInscripciones", () => {
    it("no consulta nada sin ids", async () => {
      await expect(servicio.habilitacionDeInscripciones([])).resolves.toEqual(new Map());
      expect(mocks.repositorio.situacionDeInscripciones).not.toHaveBeenCalled();
    });

    it("le pasa al cálculo el vencimiento confirmado más lejano, el pendiente y la política de vencidos", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([
          cuota(3, ["PENDIENTE"], new Date("2026-12-09T00:00:00Z")),
          cuota(2, ["RECHAZADO", "CONFIRMADO"], DIA_DESPUES),
          cuota(1, ["CONFIRMADO"], HOY),
        ]),
      ]);

      const habilitaciones = await servicio.habilitacionDeInscripciones([12]);

      expect(habilitaciones.get(12)).toEqual({
        estado: "AL_DIA",
        puedeAsistir: true,
        tienePagoPendiente: true,
      });
      expect(mocks.parametros.obtener).toHaveBeenCalledWith("VENCIDOS_PUEDEN_ASISTIR");
      expect(mocks.habilitaciones.calcular).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        vencimiento: DIA_DESPUES,
        diasGracia: 5,
        tienePagoPendiente: true,
        vencidosPuedenAsistir: true,
        hoy: HOY,
      });
    });

    it("una inscripción dada de baja se calcula al día de su baja en Argentina (US-08)", async () => {
      // 02:00 UTC del 5 de octubre: en Argentina todavía es el 4.
      const baja = new Date("2026-10-05T02:00:00Z");
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(1, ["CONFIRMADO"], HOY)], "MENSUAL", baja),
      ]);

      await servicio.habilitacionDeInscripciones([12]);

      expect(mocks.habilitaciones.calcular).toHaveBeenCalledWith(
        expect.objectContaining({ vencimiento: HOY, hoy: new Date("2026-10-04T00:00:00Z") }),
      );
    });

    it("sin cuotas confirmadas el vencimiento es null", async () => {
      await servicio.habilitacionDeInscripciones([12]);

      expect(mocks.habilitaciones.calcular).toHaveBeenCalledWith(
        expect.objectContaining({ vencimiento: null, tienePagoPendiente: false }),
      );
    });
  });
});

describe("CuotaService: los contratos del Sprint 4", () => {
  const PAGO = "CONFIRMADO" as const;
  let repositorio: {
    situacionParaAvisos: ReturnType<typeof vi.fn>;
    cobradoEnPeriodo: ReturnType<typeof vi.fn>;
  };
  let servicio: CuotaService;

  // El cálculo real: lo que se prueba es que el aviso diga lo mismo que la ficha.
  beforeEach(() => {
    repositorio = { situacionParaAvisos: vi.fn(), cobradoEnPeriodo: vi.fn().mockResolvedValue(new Map()) };
    servicio = new CuotaService(
      repositorio as unknown as CuotaRepository,
      {} as IInfoInscripciones,
      {} as IInfoPlanes,
      {} as ICalculoVencimiento,
      new CalculadorHabilitacion(),
      {} as IInfoParametros,
    );
  });

  const alumno = {
    id_alumno: 4,
    id_usuario: 40,
    id_usuario_responsable: 41,
    nombre: "Tomás",
    apellido: "Pérez",
  };

  function paraAviso(
    cuotas: SituacionDeCuotas["cuotas"],
    diasGracia = 5,
  ): SituacionDeCuotas & { nombre_plan: string; alumno: typeof alumno } {
    return { ...situacion(cuotas), dias_gracia: diasGracia, nombre_plan: "Intermedio", alumno };
  }

  function dia(texto: string) {
    return new Date(`${texto}T00:00:00Z`);
  }

  describe("paraAvisoDeVencimiento", () => {
    it("pide las inscripciones con cuotas que vencen hasta la fecha más los días previos", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([]);

      await expect(servicio.paraAvisoDeVencimiento(dia("2026-10-09"), 3)).resolves.toEqual([]);
      expect(repositorio.situacionParaAvisos).toHaveBeenCalledWith(dia("2026-10-12"));
    });

    it.each([
      ["4 días antes del vencimiento", "2026-10-08", []],
      ["3 días antes del vencimiento", "2026-10-09", ["CUOTA_POR_VENCER"]],
      ["el mismo día del vencimiento", "2026-10-12", ["CUOTA_POR_VENCER"]],
      ["en los días de gracia", "2026-10-17", []],
      ["terminada la gracia", "2026-10-18", ["CUOTA_VENCIDA"]],
    ])("con la cuota que vence el 12/10 y 5 días de gracia, %s", async (_caso, hoy, tipos) => {
      repositorio.situacionParaAvisos.mockResolvedValue([paraAviso([cuota(1, [PAGO], dia("2026-10-12"))])]);

      const avisos = await servicio.paraAvisoDeVencimiento(dia(hoy), 3);

      expect(avisos.map(({ tipo }) => tipo)).toEqual(tipos);
    });

    it("devuelve la cuota, la inscripción, el plan y el alumno con su tutor", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([paraAviso([cuota(1, [PAGO], dia("2026-10-12"))])]);

      await expect(servicio.paraAvisoDeVencimiento(dia("2026-10-12"), 3)).resolves.toEqual([
        {
          tipo: "CUOTA_POR_VENCER",
          id_cuota: 101,
          id_inscripcion: 12,
          fecha_vencimiento: dia("2026-10-12"),
          nombre_plan: "Intermedio",
          alumno,
        },
      ]);
    });

    it("con 0 días de gracia avisa la vencida el mismo día del vencimiento (US-25)", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([
        paraAviso([cuota(1, [PAGO], dia("2026-10-12"))], 0),
      ]);

      const elDiaAnterior = await servicio.paraAvisoDeVencimiento(dia("2026-10-11"), 3);
      const elMismoDia = await servicio.paraAvisoDeVencimiento(dia("2026-10-12"), 3);
      const alSiguiente = await servicio.paraAvisoDeVencimiento(dia("2026-10-13"), 3);

      expect(elDiaAnterior.map(({ tipo }) => tipo)).toEqual(["CUOTA_POR_VENCER"]);
      expect(elMismoDia.map(({ tipo }) => tipo)).toEqual(["CUOTA_VENCIDA"]);
      expect(alSiguiente.map(({ tipo }) => tipo)).toEqual(["CUOTA_VENCIDA"]);
    });

    it("con días de gracia el día del vencimiento todavía avisa por vencer", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([
        paraAviso([cuota(1, [PAGO], dia("2026-10-12"))], 5),
      ]);

      const elMismoDia = await servicio.paraAvisoDeVencimiento(dia("2026-10-12"), 3);

      expect(elMismoDia.map(({ tipo }) => tipo)).toEqual(["CUOTA_POR_VENCER"]);
    });

    it("si renovó, avisa por la última cuota paga y no por la anterior", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([
        paraAviso([cuota(2, [PAGO], dia("2026-11-12")), cuota(1, [PAGO], dia("2026-10-12"))]),
      ]);

      await expect(servicio.paraAvisoDeVencimiento(dia("2026-10-20"), 3)).resolves.toEqual([]);
      const antesDeLaNueva = await servicio.paraAvisoDeVencimiento(dia("2026-11-10"), 3);
      expect(antesDeLaNueva.map(({ id_cuota }) => id_cuota)).toEqual([102]);
    });

    it("no avisa con una transferencia pendiente ni sin una cuota paga", async () => {
      repositorio.situacionParaAvisos.mockResolvedValue([
        paraAviso([cuota(2, ["PENDIENTE"], dia("2026-11-12")), cuota(1, [PAGO], dia("2026-10-01"))]),
        paraAviso([cuota(1, ["RECHAZADO"], dia("2026-10-01"))]),
      ]);

      await expect(servicio.paraAvisoDeVencimiento(dia("2026-10-20"), 3)).resolves.toEqual([]);
    });
  });

  describe("cobradoEnPeriodo", () => {
    it("no consulta nada sin inscripciones", async () => {
      await expect(servicio.cobradoEnPeriodo([], dia("2026-10-01"), dia("2026-10-31"))).resolves.toEqual(
        new Map(),
      );
      expect(repositorio.cobradoEnPeriodo).not.toHaveBeenCalled();
    });

    it("toma los días de Argentina completos y devuelve 0 a la inscripción sin cobros", async () => {
      repositorio.cobradoEnPeriodo.mockResolvedValue(new Map([[12, 55000]]));

      const cobrado = await servicio.cobradoEnPeriodo([12, 13], dia("2026-10-01"), dia("2026-10-31"));

      expect(cobrado).toEqual(
        new Map([
          [12, 55000],
          [13, 0],
        ]),
      );
      // 00:00 de Argentina es 03:00 UTC: del 1/10 a las 03:00 hasta antes del 1/11 a las 03:00.
      expect(repositorio.cobradoEnPeriodo).toHaveBeenCalledWith(
        [12, 13],
        new Date("2026-10-01T03:00:00Z"),
        new Date("2026-11-01T03:00:00Z"),
      );
    });
  });
});

describe("CuotaService: las cuotas vencidas del resumen diario (US-26)", () => {
  const HOY_RESUMEN = new Date("2026-10-16T00:00:00Z");
  const LUCIA = { id_profesora: 3, nombre: "Lucía", apellido: "Gómez" };
  const CARLA = { id_profesora: 7, nombre: "Carla", apellido: "Ruiz" };
  let repositorio: {
    situacionParaResumen: ReturnType<typeof vi.fn>;
    situacionParaInforme: ReturnType<typeof vi.fn>;
  };
  let planes: { precioACobrar: ReturnType<typeof vi.fn> };
  let servicio: CuotaService;

  function vencida(
    id_inscripcion: number,
    id_alumno: number,
    vence: string,
    { id_plan = 2, nombre_plan = "Intermedio", id_promocion = null as number | null, profesora = LUCIA } = {},
  ) {
    return {
      id_inscripcion,
      tipo_plan: "MENSUAL" as const,
      dias_gracia: 5,
      fecha_baja: null,
      id_plan,
      id_promocion,
      nombre_plan,
      profesora,
      alumno: { id_alumno, nombre: `Alumno ${id_alumno}`, apellido: "Pérez" },
      cuotas: [cuota(1, ["CONFIRMADO"], new Date(`${vence}T00:00:00Z`))],
    };
  }

  function vencidaParaInforme(
    id_inscripcion: number,
    id_alumno: number,
    vence: string,
    opciones: {
      id_plan?: number;
      nombre_plan?: string;
      id_promocion?: number | null;
      profesora?: typeof LUCIA;
    } = {},
  ) {
    return {
      ...vencida(id_inscripcion, id_alumno, vence, opciones),
      alumno: {
        id_alumno,
        nombre: `Alumno ${id_alumno}`,
        apellido: "Pérez",
        telefono: "123",
        email: "a@b.com",
      },
    };
  }

  beforeEach(() => {
    repositorio = { situacionParaResumen: vi.fn(), situacionParaInforme: vi.fn() };
    planes = {
      precioACobrar: vi.fn(async (idPlan: number, _fecha: Date, idPromocion: number | null) => {
        if (idPlan === 1) return null;
        return { monto: idPromocion === null ? 30000 : 27000 };
      }),
    };
    servicio = new CuotaService(
      repositorio as unknown as CuotaRepository,
      {} as IInfoInscripciones,
      planes as unknown as IInfoPlanes,
      {} as ICalculoVencimiento,
      new CalculadorHabilitacion(),
      {} as IInfoParametros,
    );
  });

  it("suma las vencidas por profesora y por plan, con el precio de hoy pedido una vez por plan y promoción", async () => {
    repositorio.situacionParaResumen.mockResolvedValue([
      vencida(1, 4, "2026-10-01"),
      vencida(2, 5, "2026-10-10", { id_promocion: 9, profesora: CARLA }),
      vencida(3, 4, "2026-10-05", { id_plan: 1, nombre_plan: "Básico" }),
      // En los días de gracia: todavía no está vencida.
      vencida(4, 8, "2026-10-14"),
      vencida(5, 6, "2026-10-01"),
    ]);

    const resumen = await servicio.resumenCuotasVencidas(HOY_RESUMEN);

    expect(repositorio.situacionParaResumen).toHaveBeenCalledWith(HOY_RESUMEN);
    expect(planes.precioACobrar).toHaveBeenCalledTimes(3);
    expect(planes.precioACobrar).toHaveBeenCalledWith(2, HOY_RESUMEN, null);
    expect(planes.precioACobrar).toHaveBeenCalledWith(2, HOY_RESUMEN, 9);
    expect(planes.precioACobrar).toHaveBeenCalledWith(1, HOY_RESUMEN, null);
    expect(resumen).toMatchObject({
      cantidad: 4,
      cantidad_alumnos: 3,
      monto_estimado: 87000,
      sin_precio: 1,
      por_profesora: [
        { ...LUCIA, cantidad: 3, monto_estimado: 60000 },
        { ...CARLA, cantidad: 1, monto_estimado: 27000 },
      ],
      por_plan: [
        { id_plan: 2, nombre: "Intermedio", cantidad: 3, monto_estimado: 87000 },
        { id_plan: 1, nombre: "Básico", cantidad: 1, monto_estimado: 0 },
      ],
    });
    expect(
      resumen.mas_atrasadas.map(({ id_inscripcion, dias_vencida }) => [id_inscripcion, dias_vencida]),
    ).toEqual([
      [1, 15],
      [5, 15],
      [3, 11],
      [2, 6],
    ]);
    expect(resumen.mas_atrasadas[2]).toEqual({
      id_inscripcion: 3,
      alumno: { id_alumno: 4, nombre: "Alumno 4", apellido: "Pérez" },
      plan: { id_plan: 1, nombre: "Básico" },
      profesora: LUCIA,
      fecha_vencimiento: new Date("2026-10-05T00:00:00Z"),
      dias_vencida: 11,
      monto_estimado: null,
    });
  });

  it("el detalle trae solo las 5 más atrasadas; los totales, todas", async () => {
    repositorio.situacionParaResumen.mockResolvedValue(
      [1, 2, 3, 4, 5, 6].map((id) => vencida(id, id, `2026-10-0${id}`)),
    );

    const resumen = await servicio.resumenCuotasVencidas(HOY_RESUMEN);

    expect(resumen.cantidad).toBe(6);
    expect(resumen.mas_atrasadas.map(({ id_inscripcion }) => id_inscripcion)).toEqual([1, 2, 3, 4, 5]);
  });

  it("sin vencidas devuelve todo en cero y no consulta precios", async () => {
    repositorio.situacionParaResumen.mockResolvedValue([vencida(4, 8, "2026-10-14")]);

    await expect(servicio.resumenCuotasVencidas(HOY_RESUMEN)).resolves.toEqual({
      cantidad: 0,
      cantidad_alumnos: 0,
      monto_estimado: 0,
      sin_precio: 0,
      por_profesora: [],
      por_plan: [],
      mas_atrasadas: [],
    });
    expect(planes.precioACobrar).not.toHaveBeenCalled();
  });

  it("cuotasVencidasDetalladas devuelve el listado completo con contacto y monto adeudado (o cero si no tiene precio)", async () => {
    planes.precioACobrar.mockImplementation(async (idPlan: number) => {
      if (idPlan === 2) return { precio_lista: 30000, descuento: 0, monto: 30000 };
      return null;
    });

    repositorio.situacionParaInforme.mockResolvedValue([
      vencidaParaInforme(1, 4, "2026-10-01"),
      {
        ...vencidaParaInforme(3, 6, "2026-10-02"),
        id_plan: 1,
        nombre_plan: "Básico",
      },
      vencidaParaInforme(2, 5, "2026-10-15"), // no vencida (en gracia)
    ]);

    const resultado = await servicio.cuotasVencidasDetalladas(HOY_RESUMEN);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual({
      id_inscripcion: 1,
      alumno: { id_alumno: 4, nombre: "Alumno 4", apellido: "Pérez", telefono: "123", email: "a@b.com" },
      plan: { id_plan: 2, nombre: "Intermedio" },
      profesora: LUCIA,
      fecha_vencimiento: new Date("2026-10-01T00:00:00.000Z"),
      dias_vencida: 15,
      monto_adeudado: 30000,
    });
    expect(resultado[1]).toEqual({
      id_inscripcion: 3,
      alumno: { id_alumno: 6, nombre: "Alumno 6", apellido: "Pérez", telefono: "123", email: "a@b.com" },
      plan: { id_plan: 1, nombre: "Básico" },
      profesora: LUCIA,
      fecha_vencimiento: new Date("2026-10-02T00:00:00.000Z"),
      dias_vencida: 14,
      monto_adeudado: 0,
    });
  });
});
