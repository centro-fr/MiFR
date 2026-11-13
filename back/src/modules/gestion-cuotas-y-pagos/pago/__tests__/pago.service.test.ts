import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  MontoDistintoError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { CuotaACobrar } from "../../cuota/cuota.types.js";
import type { PagoRepository } from "../pago.repository.js";
import { PagoService, TOPE_FILTRO_TIPO_TRANSFERENCIA } from "../pago.service.js";
import type { TransferenciaParaRevisar } from "../pago.types.js";

const AHORA = new Date("2026-10-09T15:00:00Z");
const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };
const ALUMNA: Solicitante = { idUsuario: 30, esPropietaria: false };
const TUTORA: Solicitante = { idUsuario: 31, esPropietaria: false };

const cuota = {
  inscripcion: {
    id_inscripcion: 12,
    id_profesora: 3,
    alumno: { id_alumno: 5, id_usuario: 30, id_usuario_responsable: 31 },
  },
  idCuotaExistente: null,
  numeroCuota: 2,
  fechaVencimiento: new Date("2026-11-09T00:00:00Z"),
  monto: 30000,
} as unknown as CuotaACobrar;
const efectivo = { id_inscripcion: 12, monto: 30000, confirmar_monto_distinto: false };
const transferencia = {
  id_inscripcion: 12,
  monto: 30000,
  fecha_hora_transferencia: new Date("2026-10-09T13:30:00Z"),
  titular_cuenta_origen: "Paula Romero",
};
const pendiente = {
  id_pago: 7,
  forma_pago: "TRANSFERENCIA",
  estado: "PENDIENTE",
  monto: 30000,
  cuota: { id_inscripcion: 12, monto: 30000 },
};

function crearMocks() {
  return {
    repositorio: {
      guardar: vi.fn().mockResolvedValue({ id_pago: 7 }),
      fechasDeTransferenciasIguales: vi.fn().mockResolvedValue([]),
      buscarConCuota: vi.fn().mockResolvedValue(pendiente),
      resolver: vi.fn().mockResolvedValue({ id_pago: 7 }),
      listarParaRevisar: vi.fn().mockResolvedValue([]),
      contarTransferencias: vi.fn().mockResolvedValue(0),
      listarTransferenciasDeUsuario: vi.fn().mockResolvedValue([]),
      buscarParaComprobante: vi.fn(),
      obtenerCobranza: vi.fn(),
    },
    profesoras: { buscarPorUsuario: vi.fn().mockResolvedValue({ id_profesora: 3 }) },
  };
}

describe("PagoService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: PagoService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    mocks = crearMocks();
    servicio = new PagoService(
      mocks.repositorio as unknown as PagoRepository,
      mocks.profesoras as unknown as IInfoProfesores,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe("profesoraQueCobra (US-15)", () => {
    it("devuelve la profesora a cargo que cobra, o null si cobra la propietaria", async () => {
      await expect(servicio.profesoraQueCobra(cuota.inscripcion, PROFESORA)).resolves.toBe(3);
      expect(mocks.profesoras.buscarPorUsuario).toHaveBeenCalledWith(2);

      await expect(servicio.profesoraQueCobra(cuota.inscripcion, PROPIETARIA)).resolves.toBeNull();
    });

    it("rechaza a otra profesora y a quien no es profesora", async () => {
      mocks.profesoras.buscarPorUsuario.mockResolvedValueOnce({ id_profesora: 9 });
      await expect(servicio.profesoraQueCobra(cuota.inscripcion, PROFESORA)).rejects.toThrow(ForbiddenError);

      mocks.profesoras.buscarPorUsuario.mockResolvedValueOnce(null);
      await expect(servicio.profesoraQueCobra(cuota.inscripcion, PROFESORA)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("prepararEfectivo (US-15)", () => {
    it("la profesora a cargo cobra: el pago queda confirmado y pendiente de rendición", () => {
      expect(servicio.prepararEfectivo(cuota, efectivo, PROFESORA, 3)).toEqual({
        forma_pago: "EFECTIVO",
        estado: "CONFIRMADO",
        monto: 30000,
        fecha_pago: AHORA,
        titular_cuenta_origen: null,
        fecha_hora_transferencia: null,
        id_usuario_registra: 2,
        id_profesora_cobra: 3,
        rendido: false,
        id_usuario_confirma: 2,
        fecha_confirmacion: AHORA,
        observaciones: null,
      });
    });

    it("si cobra la propietaria no hay profesora ni nada que rendir", () => {
      expect(servicio.prepararEfectivo(cuota, efectivo, PROPIETARIA, null)).toMatchObject({
        id_profesora_cobra: null,
        rendido: true,
      });
    });

    it("un monto distinto del esperado pasa solo confirmado", () => {
      expect(() =>
        servicio.prepararEfectivo(cuota, { ...efectivo, monto: 25000 }, PROPIETARIA, null),
      ).toThrow(MontoDistintoError);
      expect(
        servicio.prepararEfectivo(
          cuota,
          { ...efectivo, monto: 25000, confirmar_monto_distinto: true },
          PROPIETARIA,
          null,
        ),
      ).toMatchObject({ monto: 25000 });
    });
  });

  describe("transferencias (US-16)", () => {
    it.each([
      ["la alumna", ALUMNA],
      ["la tutora", TUTORA],
    ])("%s informa una transferencia que queda pendiente", async (_caso, solicitante) => {
      await expect(servicio.prepararTransferencia(cuota, transferencia, solicitante)).resolves.toMatchObject({
        forma_pago: "TRANSFERENCIA",
        estado: "PENDIENTE",
        fecha_pago: AHORA,
        fecha_hora_transferencia: transferencia.fecha_hora_transferencia,
        titular_cuenta_origen: "Paula Romero",
        id_usuario_registra: solicitante.idUsuario,
        id_profesora_cobra: null,
        id_usuario_confirma: null,
        fecha_confirmacion: null,
      });
    });

    it("sin titular ni observaciones los guarda como null", async () => {
      const { titular_cuenta_origen: _titular, ...sinTitular } = transferencia;

      await expect(servicio.prepararTransferencia(cuota, sinTitular, ALUMNA)).resolves.toMatchObject({
        titular_cuenta_origen: null,
        observaciones: null,
      });
    });

    it("la misma transferencia (alumno, monto y día de Argentina) no se informa dos veces", async () => {
      // 23:00 del 8 en Argentina: otro día, no se repite.
      mocks.repositorio.fechasDeTransferenciasIguales.mockResolvedValueOnce([
        new Date("2026-10-09T02:00:00Z"),
      ]);
      await expect(servicio.prepararTransferencia(cuota, transferencia, ALUMNA)).resolves.toBeDefined();

      mocks.repositorio.fechasDeTransferenciasIguales.mockResolvedValueOnce([
        new Date("2026-10-09T20:00:00Z"),
      ]);
      await expect(servicio.prepararTransferencia(cuota, transferencia, ALUMNA)).rejects.toThrow(
        ConflictError,
      );
      expect(mocks.repositorio.fechasDeTransferenciasIguales).toHaveBeenCalledWith(5, 30000);
    });

    it("la que carga la propietaria queda confirmada en el momento y controla el monto", async () => {
      const recibida = { ...transferencia, confirmar_monto_distinto: false };

      await expect(
        servicio.prepararTransferenciaRecibida(cuota, recibida, PROPIETARIA),
      ).resolves.toMatchObject({
        estado: "CONFIRMADO",
        id_usuario_confirma: 1,
        fecha_confirmacion: AHORA,
      });
      await expect(
        servicio.prepararTransferenciaRecibida(cuota, { ...recibida, monto: 1 }, PROPIETARIA),
      ).rejects.toThrow(MontoDistintoError);
    });
  });

  describe("guardar", () => {
    it("pasa al repositorio la cuota sin la inscripción completa", async () => {
      await servicio.guardar(cuota, { estado: "CONFIRMADO" } as never);

      expect(mocks.repositorio.guardar).toHaveBeenCalledWith(
        {
          idInscripcion: 12,
          idCuotaExistente: null,
          numeroCuota: 2,
          fechaVencimiento: cuota.fechaVencimiento,
          monto: 30000,
        },
        { estado: "CONFIRMADO" },
      );
    });

    it("lanza ConflictError si otro cobro tomó la cuota al mismo tiempo", async () => {
      mocks.repositorio.guardar.mockResolvedValue(null);

      await expect(servicio.guardar(cuota, {} as never)).rejects.toThrow(ConflictError);
    });
  });

  describe("revisión de transferencias (US-17)", () => {
    it("prepararAprobacion devuelve la inscripción de una transferencia pendiente", async () => {
      await expect(servicio.prepararAprobacion(7, { confirmar_monto_distinto: false })).resolves.toBe(12);
    });

    it("prepararAprobacion exige confirmar un monto distinto del de la cuota", async () => {
      mocks.repositorio.buscarConCuota.mockResolvedValue({ ...pendiente, monto: 25000 });

      await expect(servicio.prepararAprobacion(7, { confirmar_monto_distinto: false })).rejects.toThrow(
        MontoDistintoError,
      );
      await expect(servicio.prepararAprobacion(7, { confirmar_monto_distinto: true })).resolves.toBe(12);
    });

    it.each([
      ["no existe", null, NotFoundError],
      ["ya está confirmada", { ...pendiente, estado: "CONFIRMADO" }, ConflictError],
      ["es un cobro en efectivo", { ...pendiente, forma_pago: "EFECTIVO" }, ConflictError],
    ])("no se aprueba ni rechaza un pago que %s", async (_caso, pago, error) => {
      mocks.repositorio.buscarConCuota.mockResolvedValue(pago);

      await expect(servicio.prepararAprobacion(7, { confirmar_monto_distinto: true })).rejects.toThrow(error);
      await expect(servicio.rechazar(7, { motivo_rechazo: "No figura" }, PROPIETARIA)).rejects.toThrow(error);
    });

    it("confirmar y rechazar registran quién y cuándo, y el motivo del rechazo", async () => {
      await servicio.confirmar(7, PROPIETARIA);
      await servicio.rechazar(7, { motivo_rechazo: "No figura en el extracto" }, PROPIETARIA);

      expect(mocks.repositorio.resolver.mock.calls).toEqual([
        [
          7,
          { estado: "CONFIRMADO", id_usuario_confirma: 1, fecha_confirmacion: AHORA, motivo_rechazo: null },
        ],
        [
          7,
          {
            estado: "RECHAZADO",
            id_usuario_confirma: 1,
            fecha_confirmacion: AHORA,
            motivo_rechazo: "No figura en el extracto",
          },
        ],
      ]);
    });

    it("dos aprobaciones seguidas: la segunda lanza ConflictError", async () => {
      mocks.repositorio.resolver.mockResolvedValue(null);

      await expect(servicio.confirmar(7, PROPIETARIA)).rejects.toThrow("ya fue resuelta");
    });

    const VENCIO_EL_9 = new Date("2026-10-09T00:00:00Z");
    function paraRevisar(datos: Partial<TransferenciaParaRevisar>): TransferenciaParaRevisar {
      return {
        id_pago: 1,
        estado: "PENDIENTE",
        fecha_pago: new Date("2026-10-08T15:00:00Z"),
        alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" },
        plan: "Intermedio",
        tipo_plan: "MENSUAL",
        numero_cuota: 2,
        monto_esperado: 28000,
        vencimiento_anterior: VENCIO_EL_9,
        ...datos,
      } as TransferenciaParaRevisar;
    }
    const SIN_FILTROS = { orden: "asc", limit: 100, offset: 0 } as const;

    it("listarTransferencias marca las pendientes que pasaron las 24 horas y pagina en la base", async () => {
      mocks.repositorio.listarParaRevisar.mockResolvedValue([
        paraRevisar({ id_pago: 1, fecha_pago: new Date("2026-10-08T14:00:00Z") }),
        paraRevisar({ id_pago: 2, fecha_pago: new Date("2026-10-08T16:00:00Z") }),
        paraRevisar({ id_pago: 3, estado: "CONFIRMADO", fecha_pago: new Date("2026-10-01T15:00:00Z") }),
      ]);
      mocks.repositorio.contarTransferencias.mockResolvedValue(37);

      const pagina = await servicio.listarTransferencias({ ...SIN_FILTROS, estado: "PENDIENTE", limit: 3 });

      expect(
        pagina.datos.map(({ horas_desde_la_carga, supera_24_horas }) => [
          horas_desde_la_carga,
          supera_24_horas,
        ]),
      ).toEqual([
        [25, true],
        [23, false],
        [192, false],
      ]);
      expect(pagina).toMatchObject({ total: 37, limit: 3, offset: 0 });
      expect(mocks.repositorio.listarParaRevisar).toHaveBeenCalledWith({ estado: "PENDIENTE" }, "asc", {
        limit: 3,
        offset: 0,
      });
      expect(mocks.repositorio.contarTransferencias).toHaveBeenCalledWith({ estado: "PENDIENTE" });
    });

    it("listarTransferencias responde el plan, el monto esperado y el tipo, sin los datos internos", async () => {
      mocks.repositorio.listarParaRevisar.mockResolvedValue([paraRevisar({ numero_cuota: 1 })]);

      const { datos } = await servicio.listarTransferencias(SIN_FILTROS);

      expect(datos).toEqual([
        {
          id_pago: 1,
          estado: "PENDIENTE",
          fecha_pago: new Date("2026-10-08T15:00:00Z"),
          alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" },
          plan: "Intermedio",
          monto_esperado: 28000,
          tipo: "PRIMERA_CUOTA",
          horas_desde_la_carga: 24,
          supera_24_horas: true,
        },
      ]);
    });

    it("listarTransferencias calcula el tipo con el día de Argentina en que se cargó", async () => {
      mocks.repositorio.listarParaRevisar.mockResolvedValue([
        // 23:00 del 9 en Argentina: el día del vencimiento todavía está cubierto.
        paraRevisar({ fecha_pago: new Date("2026-10-10T02:00:00Z") }),
        // 00:00 del 10 en Argentina.
        paraRevisar({ fecha_pago: new Date("2026-10-10T03:00:00Z") }),
        paraRevisar({ tipo_plan: "CLASE_SUELTA", fecha_pago: new Date("2026-10-20T15:00:00Z") }),
        paraRevisar({ vencimiento_anterior: null, fecha_pago: new Date("2026-10-20T15:00:00Z") }),
      ]);

      const { datos } = await servicio.listarTransferencias(SIN_FILTROS);

      expect(datos.map(({ tipo }) => tipo)).toEqual([
        "RENOVACION",
        "CUOTA_VENCIDA",
        "RENOVACION",
        "RENOVACION",
      ]);
    });

    it("listarTransferencias convierte los días desde y hasta en instantes de Argentina", async () => {
      await servicio.listarTransferencias({
        ...SIN_FILTROS,
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-10T00:00:00Z"),
        orden: "desc",
      });

      expect(mocks.repositorio.listarParaRevisar).toHaveBeenCalledWith(
        { inicio: new Date("2026-10-01T03:00:00Z"), fin: new Date("2026-10-11T03:00:00Z") },
        "desc",
        { limit: 100, offset: 0 },
      );
    });

    it("listarTransferencias por tipo calcula sobre las que cumplen los otros filtros y pagina en memoria", async () => {
      mocks.repositorio.listarParaRevisar.mockResolvedValue([
        paraRevisar({ id_pago: 1, numero_cuota: 1 }),
        paraRevisar({ id_pago: 2, fecha_pago: new Date("2026-10-10T15:00:00Z") }),
        paraRevisar({ id_pago: 3, numero_cuota: 1 }),
        paraRevisar({ id_pago: 4, numero_cuota: 1 }),
      ]);

      const pagina = await servicio.listarTransferencias({
        ...SIN_FILTROS,
        id_alumno: 5,
        tipo: "PRIMERA_CUOTA",
        limit: 1,
        offset: 1,
      });

      expect(pagina).toMatchObject({ total: 3, limit: 1, offset: 1 });
      expect(pagina.datos.map(({ id_pago }) => id_pago)).toEqual([3]);
      expect(mocks.repositorio.listarParaRevisar).toHaveBeenCalledWith({ id_alumno: 5 }, "asc", {
        limit: TOPE_FILTRO_TIPO_TRANSFERENCIA + 1,
        offset: 0,
      });
      expect(mocks.repositorio.contarTransferencias).not.toHaveBeenCalled();
    });

    it("listarTransferencias por tipo lanza ValidationError si hay más de 500 para calcular", async () => {
      mocks.repositorio.listarParaRevisar.mockResolvedValue(
        Array.from({ length: TOPE_FILTRO_TIPO_TRANSFERENCIA + 1 }, (_, i) => paraRevisar({ id_pago: i + 1 })),
      );

      const pedido = servicio.listarTransferencias({ ...SIN_FILTROS, tipo: "RENOVACION" });

      await expect(pedido).rejects.toThrow(ValidationError);
      await expect(pedido).rejects.toThrow("acote la búsqueda");
    });

    it("listarMisTransferencias busca por el usuario que pide", async () => {
      await servicio.listarMisTransferencias(TUTORA);

      expect(mocks.repositorio.listarTransferenciasDeUsuario).toHaveBeenCalledWith(31);
    });
  });

  describe("obtenerComprobante", () => {
    const paraComprobante = {
      id_pago: 7,
      estado: "CONFIRMADO",
      forma_pago: "EFECTIVO",
      monto: 30000,
      fecha_pago: AHORA,
      id_usuario_registra: 2,
      cuota: {
        numero_cuota: 2,
        fecha_vencimiento: cuota.fechaVencimiento,
        monto: 30000,
        inscripcion: {
          plan: { nombre: "Intermedio" },
          promocion: null,
          alumno: {
            id_usuario: 30,
            id_usuario_responsable: null,
            usuario: { nombre: "Valentina", apellido: "Herrera", dni: "39222333" },
          },
        },
      },
      usuario_registra: { nombre: "Carla", apellido: "Ruiz" },
      profesora_cobra: { usuario: { nombre: "Carla", apellido: "Ruiz" } },
      precio_lista: 30000,
    };

    beforeEach(() => {
      mocks.repositorio.buscarParaComprobante.mockResolvedValue(paraComprobante);
    });

    it("arma el comprobante con número, alumno, plan, período y quién cobró", async () => {
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).resolves.toEqual({
        numero: 7,
        fecha: AHORA,
        forma_pago: "EFECTIVO",
        monto: 30000,
        alumno: { nombre: "Valentina", apellido: "Herrera", dni: "39222333" },
        plan: "Intermedio",
        cuota: { numero: 2, vencimiento: cuota.fechaVencimiento, monto: 30000 },
        precio_lista: 30000,
        descuento: 0,
        promocion: null,
        registrado_por: { nombre: "Carla", apellido: "Ruiz" },
        profesora_cobra: { nombre: "Carla", apellido: "Ruiz" },
      });
    });

    it("muestra el precio de lista y lo que descontó la promoción (US-13)", async () => {
      const promocion = { codigo: "VERANO26", nombre: "Verano" };
      mocks.repositorio.buscarParaComprobante.mockResolvedValue({
        ...paraComprobante,
        cuota: {
          ...paraComprobante.cuota,
          monto: 27000.5,
          inscripcion: { ...paraComprobante.cuota.inscripcion, promocion },
        },
      });

      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).resolves.toMatchObject({
        precio_lista: 30000,
        descuento: 2999.5,
        promocion,
        cuota: { monto: 27000.5 },
      });
    });

    it("sin precio de lista ese día, o si la promoción ya no aplicaba, no muestra descuento", async () => {
      const promocion = { codigo: "VERANO26", nombre: "Verano" };
      const conPromocion = {
        ...paraComprobante,
        cuota: { ...paraComprobante.cuota, inscripcion: { ...paraComprobante.cuota.inscripcion, promocion } },
      };
      mocks.repositorio.buscarParaComprobante.mockResolvedValueOnce({ ...conPromocion, precio_lista: null });
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).resolves.toMatchObject({
        descuento: 0,
        promocion: null,
      });

      mocks.repositorio.buscarParaComprobante.mockResolvedValueOnce(conPromocion);
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).resolves.toMatchObject({
        descuento: 0,
        promocion: null,
      });
    });

    it("lo ven quien registró el pago y el alumno; nadie más", async () => {
      await expect(servicio.obtenerComprobante(7, PROFESORA)).resolves.toBeDefined();
      await expect(servicio.obtenerComprobante(7, ALUMNA)).resolves.toBeDefined();
      // A quien no le corresponde se le responde como si el pago no existiera.
      await expect(servicio.obtenerComprobante(7, TUTORA)).rejects.toThrow(NotFoundError);
    });

    it("sin profesora que cobró sale null; no existe o no está confirmado, error", async () => {
      mocks.repositorio.buscarParaComprobante.mockResolvedValueOnce({
        ...paraComprobante,
        profesora_cobra: null,
      });
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).resolves.toMatchObject({
        profesora_cobra: null,
      });

      mocks.repositorio.buscarParaComprobante.mockResolvedValueOnce(null);
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).rejects.toThrow(NotFoundError);

      mocks.repositorio.buscarParaComprobante.mockResolvedValueOnce({
        ...paraComprobante,
        estado: "PENDIENTE",
      });
      await expect(servicio.obtenerComprobante(7, PROPIETARIA)).rejects.toThrow(ConflictError);
    });
  });
});

describe("PagoService: rendición del efectivo (US-19)", () => {
  // 01:00 UTC del 13/10: en Argentina todavía es el 12.
  const AHORA_RENDICION = new Date("2026-10-13T01:00:00Z");
  let repositorio: Record<string, ReturnType<typeof vi.fn>>;
  let servicio: PagoService;

  function cobroDe(id_pago: number, id_profesora: number, fecha_pago: Date) {
    return {
      id_pago,
      monto: 25000,
      fecha_pago,
      fecha_rendicion: null,
      alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" },
      plan: "Intermedio",
      cuota: { numero: 2, vencimiento: new Date("2026-11-09T00:00:00Z") },
      profesora: { id_profesora, nombre: "Carla", apellido: "Ruiz" },
    };
  }

  const totales = [
    { id_profesora: 3, nombre: "Carla", apellido: "Ruiz", cantidad: 2, total: 50000.1 },
    { id_profesora: 4, nombre: "Lucía", apellido: "Gómez", cantidad: 1, total: 25000.2 },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA_RENDICION);
    repositorio = {
      totalesSinRendir: vi.fn().mockResolvedValue(totales),
      listarSinRendir: vi.fn(),
      listarRendidos: vi.fn(),
      idsSinRendirDeProfesora: vi.fn(),
      rendir: vi.fn(),
      motivosSinRendir: vi.fn(),
      obtenerCobranza: vi.fn(),
    };
    servicio = new PagoService(repositorio as unknown as PagoRepository, {} as IInfoProfesores);
  });

  afterEach(() => vi.useRealTimers());

  describe("efectivoPendiente", () => {
    it("trae los totales completos y una página de cobros con los días de Argentina sin rendir", async () => {
      repositorio.listarSinRendir.mockResolvedValue([
        // 22:00 del 10/10 en Argentina: lleva dos días, aunque en UTC ya fuera el 11.
        cobroDe(7, 3, new Date("2026-10-11T01:00:00Z")),
        cobroDe(8, 4, new Date("2026-10-12T15:00:00Z")),
      ]);

      const pendiente = await servicio.efectivoPendiente(
        { id_profesora: 3, desde: new Date("2026-10-01T00:00:00Z") },
        { limit: 2, offset: 4 },
      );

      const filtro = { id_profesora: 3, inicio: new Date("2026-10-01T03:00:00Z"), fin: undefined };
      expect(repositorio.totalesSinRendir).toHaveBeenCalledWith(filtro);
      expect(repositorio.listarSinRendir).toHaveBeenCalledWith(filtro, { limit: 2, offset: 4 });
      expect(pendiente).toMatchObject({
        cantidad: 3,
        total: 75000.3,
        profesoras: totales,
        limit: 2,
        offset: 4,
      });
      expect(pendiente.cobros.map(({ id_pago, dias_sin_rendir }) => [id_pago, dias_sin_rendir])).toEqual([
        [7, 2],
        [8, 0],
      ]);
      expect(pendiente.cobros[0]).not.toHaveProperty("fecha_rendicion");
    });
  });

  it("listarRendiciones pagina lo rendido con el filtro en instantes", async () => {
    repositorio.listarRendidos.mockResolvedValue({ datos: ["rendido"], total: 1 });

    await expect(
      servicio.listarRendiciones({ hasta: new Date("2026-10-31T00:00:00Z") }, { limit: 10, offset: 0 }),
    ).resolves.toEqual({ datos: ["rendido"], total: 1, limit: 10, offset: 0 });
    expect(repositorio.listarRendidos).toHaveBeenCalledWith(
      { id_profesora: undefined, inicio: undefined, fin: new Date("2026-11-01T03:00:00Z") },
      { limit: 10, offset: 0 },
    );
  });

  describe("rendirLote", () => {
    it("rinde todo lo pendiente de una profesora con la fecha de hoy", async () => {
      repositorio.idsSinRendirDeProfesora.mockResolvedValue([7, 9]);
      repositorio.rendir.mockResolvedValue([
        { id_pago: 7, monto: 25000.1 },
        { id_pago: 9, monto: 30000.2 },
      ]);

      await expect(servicio.rendirLote({ id_profesora: 3 })).resolves.toEqual({
        rendidos: [7, 9],
        cantidad: 2,
        total: 55000.3,
        salteados: [],
      });
      expect(repositorio.rendir).toHaveBeenCalledWith([7, 9], AHORA_RENDICION);
      expect(repositorio.motivosSinRendir).not.toHaveBeenCalled();
    });

    it("una profesora sin pendientes no rinde nada", async () => {
      repositorio.idsSinRendirDeProfesora.mockResolvedValue([]);

      await expect(servicio.rendirLote({ id_profesora: 3 })).resolves.toEqual({
        rendidos: [],
        cantidad: 0,
        total: 0,
        salteados: [],
      });
      expect(repositorio.rendir).not.toHaveBeenCalled();
    });

    it("con una lista, saltea los que no se pueden rendir e informa por qué", async () => {
      repositorio.rendir.mockResolvedValue([{ id_pago: 7, monto: 25000 }]);
      repositorio.motivosSinRendir.mockResolvedValue(
        new Map([
          [8, "YA_RENDIDO"],
          [9, "NO_EXISTE"],
        ]),
      );

      await expect(servicio.rendirLote({ ids_pagos: [7, 8, 9] })).resolves.toEqual({
        rendidos: [7],
        cantidad: 1,
        total: 25000,
        salteados: [
          { id_pago: 8, motivo: "YA_RENDIDO" },
          { id_pago: 9, motivo: "NO_EXISTE" },
        ],
      });
      expect(repositorio.motivosSinRendir).toHaveBeenCalledWith([8, 9]);
    });
  });

  describe("rendir", () => {
    it("rinde un cobro", async () => {
      repositorio.rendir.mockResolvedValue([{ id_pago: 7, monto: 25000 }]);

      await expect(servicio.rendir(7)).resolves.toMatchObject({ rendidos: [7], total: 25000 });
    });

    it.each([
      ["NO_EXISTE", NotFoundError],
      ["YA_RENDIDO", ConflictError],
      ["NO_ES_EFECTIVO_DE_PROFESORA", ConflictError],
    ] as const)("responde el motivo %s con su error", async (motivo, error) => {
      repositorio.rendir.mockResolvedValue([]);
      repositorio.motivosSinRendir.mockResolvedValue(new Map([[7, motivo]]));

      await expect(servicio.rendir(7)).rejects.toBeInstanceOf(error);
    });
  });

  describe("obtenerCobranza", () => {
    it("convierte fechas con rangoDeDiasArgentinos y delega al repositorio", async () => {
      const desde = new Date("2026-10-01T00:00:00Z");
      const hasta = new Date("2026-10-15T00:00:00Z");
      const esperado = { pagos: [], total: 0, totalesPorForma: [] };
      repositorio.obtenerCobranza.mockResolvedValue(esperado);

      const paginacion = { limit: 20, offset: 0 };
      const resultado = await servicio.obtenerCobranza(
        { desde, hasta, forma_pago: "EFECTIVO", id_profesora: 3 },
        paginacion,
      );

      expect(resultado).toBe(esperado);
      expect(repositorio.obtenerCobranza).toHaveBeenCalledWith(
        expect.objectContaining({
          forma_pago: "EFECTIVO",
          id_profesora: 3,
        }),
        paginacion,
      );
    });
  });
});
