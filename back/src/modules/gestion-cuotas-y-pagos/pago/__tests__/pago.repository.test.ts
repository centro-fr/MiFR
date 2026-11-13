import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagoRepository } from "../pago.repository.js";
import type { CuotaAGuardar, DatosDePago } from "../pago.types.js";

const transaccion = {
  $executeRaw: vi.fn(),
  cuotas: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  pagos: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
};
const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  pagos: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  cuotas: { findMany: vi.fn() },
  plan_precios: { findFirst: vi.fn() },
};

const AHORA = new Date("2026-10-09T15:00:00Z");
const VENCIMIENTO = new Date("2026-11-09T00:00:00Z");
const decimal = (valor: number) => new Prisma.Decimal(valor);
const filaPago = { id_pago: 7, id_cuota: 3, estado: "CONFIRMADO", fecha_pago: AHORA, monto: decimal(30000) };
const cuotaNueva: CuotaAGuardar = {
  idInscripcion: 12,
  idCuotaExistente: null,
  numeroCuota: 2,
  fechaVencimiento: VENCIMIENTO,
  monto: 30000,
};
const datos = {
  forma_pago: "EFECTIVO",
  estado: "CONFIRMADO",
  monto: 30000,
  fecha_pago: AHORA,
} as DatosDePago;
const alumno = { id_alumno: 5, usuario: { nombre: "Valentina", apellido: "Herrera" } };

describe("PagoRepository", () => {
  let repositorio: PagoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    transaccion.cuotas.findUnique.mockResolvedValue(null);
    transaccion.cuotas.create.mockResolvedValue({ id_cuota: 3 });
    transaccion.pagos.create.mockResolvedValue(filaPago);
    transaccion.pagos.count.mockResolvedValue(0);
    repositorio = new PagoRepository(prisma as unknown as PrismaClient);
  });

  describe("guardar", () => {
    it("bloquea la inscripción, crea la cuota siguiente y el pago, y entrega el monto como number", async () => {
      await expect(repositorio.guardar(cuotaNueva, datos)).resolves.toMatchObject({
        id_pago: 7,
        monto: 30000,
      });

      expect(transaccion.$executeRaw.mock.calls[0][1]).toBe("cobro-inscripcion:12");
      expect(transaccion.cuotas.create).toHaveBeenCalledWith({
        data: {
          id_inscripcion: 12,
          numero_cuota: 2,
          fecha_vencimiento: VENCIMIENTO,
          monto: 30000,
          fecha_generacion: AHORA,
        },
      });
      expect(transaccion.pagos.create).toHaveBeenCalledWith({ data: { ...datos, id_cuota: 3 } });
    });

    it("devuelve null si otro cobro ya creó esa cuota", async () => {
      transaccion.cuotas.findUnique.mockResolvedValue({ id_cuota: 9 });

      await expect(repositorio.guardar(cuotaNueva, datos)).resolves.toBeNull();
      expect(transaccion.pagos.create).not.toHaveBeenCalled();
    });

    it("reusa la cuota sin pagar y la pone al día", async () => {
      await repositorio.guardar({ ...cuotaNueva, idCuotaExistente: 3 }, datos);

      expect(transaccion.pagos.count).toHaveBeenCalledWith({
        where: { id_cuota: 3, estado: { not: "RECHAZADO" } },
      });
      expect(transaccion.cuotas.update).toHaveBeenCalledWith({
        where: { id_cuota: 3 },
        data: { fecha_vencimiento: VENCIMIENTO, monto: 30000, fecha_generacion: AHORA },
      });
      expect(transaccion.cuotas.create).not.toHaveBeenCalled();
    });

    it("devuelve null si mientras tanto la cuota sin pagar recibió un pago", async () => {
      transaccion.pagos.count.mockResolvedValue(1);

      await expect(repositorio.guardar({ ...cuotaNueva, idCuotaExistente: 3 }, datos)).resolves.toBeNull();
      expect(transaccion.cuotas.update).not.toHaveBeenCalled();
    });
  });

  it("fechasDeTransferenciasIguales busca las del alumno por ese monto que no se rechazaron", async () => {
    prisma.pagos.findMany.mockResolvedValue([
      { fecha_hora_transferencia: AHORA },
      { fecha_hora_transferencia: null },
    ]);

    await expect(repositorio.fechasDeTransferenciasIguales(5, 30000)).resolves.toEqual([AHORA]);
    expect(prisma.pagos.findMany.mock.calls[0][0].where).toEqual({
      forma_pago: "TRANSFERENCIA",
      estado: { not: "RECHAZADO" },
      monto: 30000,
      cuota: { inscripcion: { id_alumno: 5 } },
    });
  });

  it("buscarConCuota trae la inscripción y el monto de la cuota, o null", async () => {
    prisma.pagos.findUnique.mockResolvedValueOnce({
      ...filaPago,
      cuota: { id_inscripcion: 12, monto: decimal(28000) },
    });

    await expect(repositorio.buscarConCuota(7)).resolves.toMatchObject({
      monto: 30000,
      cuota: { id_inscripcion: 12, monto: 28000 },
    });
    prisma.pagos.findUnique.mockResolvedValueOnce(null);
    await expect(repositorio.buscarConCuota(8)).resolves.toBeNull();
  });

  describe("resolver", () => {
    const resolucion = {
      estado: "CONFIRMADO" as const,
      id_usuario_confirma: 1,
      fecha_confirmacion: AHORA,
      motivo_rechazo: null,
    };

    it("solo cambia un pago que sigue pendiente", async () => {
      transaccion.pagos.updateMany.mockResolvedValue({ count: 1 });
      transaccion.pagos.findUniqueOrThrow.mockResolvedValue(filaPago);

      await expect(repositorio.resolver(7, resolucion)).resolves.toMatchObject({ id_pago: 7, monto: 30000 });
      expect(transaccion.pagos.updateMany).toHaveBeenCalledWith({
        where: { id_pago: 7, estado: "PENDIENTE" },
        data: resolucion,
      });
    });

    it("devuelve null si ya no estaba pendiente", async () => {
      transaccion.pagos.updateMany.mockResolvedValue({ count: 0 });

      await expect(repositorio.resolver(7, resolucion)).resolves.toBeNull();
      expect(transaccion.pagos.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe("listados de transferencias", () => {
    const plan = { nombre: "Intermedio", tipo: "MENSUAL" };
    const cuotaDelPago = (numero_cuota: number) => ({
      id_inscripcion: 12,
      numero_cuota,
      monto: decimal(28000),
      inscripcion: { plan, alumno },
    });
    const enRevision = {
      ...filaPago,
      monto: 30000,
      alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" },
      plan: "Intermedio",
      tipo_plan: "MENSUAL",
      monto_esperado: 28000,
    };
    const PAGINA = { limit: 100, offset: 0 };

    beforeEach(() => {
      prisma.pagos.findMany.mockResolvedValue([{ ...filaPago, cuota: { inscripcion: { alumno } } }]);
    });

    it("listarParaRevisar trae el plan, la cuota y el vencimiento de la cuota anterior", async () => {
      prisma.pagos.findMany.mockResolvedValue([
        { ...filaPago, cuota: cuotaDelPago(3) },
        { ...filaPago, id_pago: 8, cuota: cuotaDelPago(1) },
      ]);
      prisma.cuotas.findMany.mockResolvedValue([
        { id_inscripcion: 12, numero_cuota: 2, fecha_vencimiento: VENCIMIENTO },
      ]);

      await expect(repositorio.listarParaRevisar({}, "asc", PAGINA)).resolves.toEqual([
        { ...enRevision, numero_cuota: 3, vencimiento_anterior: VENCIMIENTO },
        { ...enRevision, id_pago: 8, numero_cuota: 1, vencimiento_anterior: null },
      ]);
      expect(prisma.cuotas.findMany).toHaveBeenCalledWith({
        where: { OR: [{ id_inscripcion: 12, numero_cuota: 2 }] },
        select: { id_inscripcion: true, numero_cuota: true, fecha_vencimiento: true },
      });
    });

    it("listarParaRevisar no busca vencimientos si todas son primeras cuotas, y deja null el que falta", async () => {
      prisma.pagos.findMany.mockResolvedValue([{ ...filaPago, cuota: cuotaDelPago(1) }]);
      await repositorio.listarParaRevisar({}, "asc", PAGINA);
      expect(prisma.cuotas.findMany).not.toHaveBeenCalled();

      prisma.pagos.findMany.mockResolvedValue([{ ...filaPago, cuota: cuotaDelPago(2) }]);
      prisma.cuotas.findMany.mockResolvedValue([]);
      await expect(repositorio.listarParaRevisar({}, "asc", PAGINA)).resolves.toEqual([
        { ...enRevision, numero_cuota: 2, vencimiento_anterior: null },
      ]);
    });

    it("listarParaRevisar filtra por estado, alumno y fecha de carga, en el orden y la página pedidos", async () => {
      prisma.pagos.findMany.mockResolvedValue([]);
      const inicio = new Date("2026-10-01T03:00:00Z");
      const fin = new Date("2026-10-11T03:00:00Z");

      await repositorio.listarParaRevisar({ estado: "PENDIENTE", id_alumno: 5, inicio, fin }, "asc", PAGINA);
      await repositorio.listarParaRevisar({ inicio }, "desc", { limit: 10, offset: 30 });
      await repositorio.listarParaRevisar({ fin }, "asc", PAGINA);
      await repositorio.listarParaRevisar({}, "asc", PAGINA);

      expect(prisma.pagos.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          forma_pago: "TRANSFERENCIA",
          estado: "PENDIENTE",
          cuota: { inscripcion: { id_alumno: 5 } },
          fecha_pago: { gte: inicio, lt: fin },
        },
        orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
        take: 100,
        skip: 0,
      });
      expect(prisma.pagos.findMany.mock.calls[1][0]).toMatchObject({
        where: { forma_pago: "TRANSFERENCIA", fecha_pago: { gte: inicio } },
        orderBy: [{ fecha_pago: "desc" }, { id_pago: "desc" }],
        take: 10,
        skip: 30,
      });
      expect(prisma.pagos.findMany.mock.calls[2][0].where).toEqual({
        forma_pago: "TRANSFERENCIA",
        fecha_pago: { lt: fin },
      });
      expect(prisma.pagos.findMany.mock.calls[3][0].where).toEqual({ forma_pago: "TRANSFERENCIA" });
    });

    it("contarTransferencias cuenta con el mismo filtro", async () => {
      prisma.pagos.count.mockResolvedValue(37);

      await expect(repositorio.contarTransferencias({ estado: "RECHAZADO" })).resolves.toBe(37);
      expect(prisma.pagos.count).toHaveBeenCalledWith({
        where: { forma_pago: "TRANSFERENCIA", estado: "RECHAZADO" },
      });
    });

    it("listarTransferenciasDeUsuario trae las del alumno y las de los menores a cargo", async () => {
      await repositorio.listarTransferenciasDeUsuario(30);

      expect(prisma.pagos.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          forma_pago: "TRANSFERENCIA",
          cuota: { inscripcion: { alumno: { OR: [{ id_usuario: 30 }, { id_usuario_responsable: 30 }] } } },
        },
        orderBy: [{ fecha_pago: "desc" }, { id_pago: "desc" }],
        take: 100,
      });
    });
  });

  it("buscarParaComprobante trae los datos del comprobante con el precio de lista del día de la cuota, o null", async () => {
    // 01:00 UTC del 10/10: en Argentina la cuota se generó el 9.
    const generada = new Date("2026-10-10T01:00:00Z");
    const inscripcion = { id_plan: 2, plan: { nombre: "Intermedio" }, promocion: null, alumno };
    prisma.pagos.findUnique.mockResolvedValueOnce({
      ...filaPago,
      cuota: {
        numero_cuota: 2,
        fecha_vencimiento: VENCIMIENTO,
        fecha_generacion: generada,
        monto: decimal(27000),
        inscripcion,
      },
    });
    prisma.plan_precios.findFirst.mockResolvedValueOnce({ precio: decimal(30000) });

    await expect(repositorio.buscarParaComprobante(7)).resolves.toMatchObject({
      monto: 30000,
      cuota: {
        numero_cuota: 2,
        monto: 27000,
        inscripcion: { plan: { nombre: "Intermedio" }, promocion: null, alumno },
      },
      precio_lista: 30000,
    });
    const dia = new Date("2026-10-09T00:00:00Z");
    expect(prisma.plan_precios.findFirst).toHaveBeenCalledWith({
      where: {
        id_plan: 2,
        fecha_vigencia_desde: { lte: dia },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: dia } }],
      },
      select: { precio: true },
    });

    prisma.pagos.findUnique.mockResolvedValueOnce({
      ...filaPago,
      cuota: {
        numero_cuota: 2,
        fecha_vencimiento: VENCIMIENTO,
        fecha_generacion: generada,
        monto: decimal(1),
        inscripcion,
      },
    });
    prisma.plan_precios.findFirst.mockResolvedValueOnce(null);
    await expect(repositorio.buscarParaComprobante(7)).resolves.toMatchObject({ precio_lista: null });

    prisma.pagos.findUnique.mockResolvedValueOnce(null);
    await expect(repositorio.buscarParaComprobante(8)).resolves.toBeNull();
  });
});

describe("PagoRepository: rendición del efectivo (US-19)", () => {
  const prismaRendicion = {
    pagos: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    profesoras: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
  const EFECTIVO_DE_PROFESORA = {
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    id_profesora_cobra: { not: null },
  };
  const INICIO = new Date("2026-10-01T03:00:00Z");
  const FIN = new Date("2026-11-01T03:00:00Z");
  const filaCobro = {
    id_pago: 7,
    monto: decimal(25000),
    fecha_pago: AHORA,
    fecha_rendicion: null,
    cuota: {
      numero_cuota: 2,
      fecha_vencimiento: VENCIMIENTO,
      inscripcion: { plan: { nombre: "Intermedio" }, alumno },
    },
    profesora_cobra: { id_profesora: 3, usuario: { nombre: "Carla", apellido: "Ruiz" } },
  };
  const cobro = {
    id_pago: 7,
    monto: 25000,
    fecha_pago: AHORA,
    fecha_rendicion: null,
    alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" },
    plan: "Intermedio",
    cuota: { numero: 2, vencimiento: VENCIMIENTO },
    profesora: { id_profesora: 3, nombre: "Carla", apellido: "Ruiz" },
  };
  let repositorio: PagoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new PagoRepository(prismaRendicion as unknown as PrismaClient);
  });

  it("totalesSinRendir agrupa en la base por profesora, con los nombres, y ordena por apellido", async () => {
    prismaRendicion.pagos.groupBy.mockResolvedValue([
      { id_profesora_cobra: 3, _count: { id_pago: 2 }, _sum: { monto: decimal(50000) } },
      { id_profesora_cobra: 4, _count: { id_pago: 1 }, _sum: { monto: decimal(30000) } },
    ]);
    prismaRendicion.profesoras.findMany.mockResolvedValue([
      { id_profesora: 3, usuario: { nombre: "Lucía", apellido: "Gómez" } },
      { id_profesora: 4, usuario: { nombre: "Ana", apellido: "Gómez" } },
    ]);

    await expect(
      repositorio.totalesSinRendir({ id_profesora: 3, inicio: INICIO, fin: FIN }),
    ).resolves.toEqual([
      { id_profesora: 4, nombre: "Ana", apellido: "Gómez", cantidad: 1, total: 30000 },
      { id_profesora: 3, nombre: "Lucía", apellido: "Gómez", cantidad: 2, total: 50000 },
    ]);
    expect(prismaRendicion.pagos.groupBy.mock.calls[0][0].where).toEqual({
      ...EFECTIVO_DE_PROFESORA,
      rendido: false,
      id_profesora_cobra: 3,
      fecha_pago: { gte: INICIO, lt: FIN },
    });
  });

  it("totalesSinRendir sin pendientes no busca profesoras", async () => {
    prismaRendicion.pagos.groupBy.mockResolvedValue([]);

    await expect(repositorio.totalesSinRendir({})).resolves.toEqual([]);
    expect(prismaRendicion.profesoras.findMany).not.toHaveBeenCalled();
    expect(prismaRendicion.pagos.groupBy.mock.calls[0][0].where).toEqual({
      ...EFECTIVO_DE_PROFESORA,
      rendido: false,
    });
  });

  it("listarSinRendir pagina los más viejos primero, con un extremo abierto", async () => {
    prismaRendicion.pagos.findMany.mockResolvedValue([filaCobro]);

    await expect(repositorio.listarSinRendir({ fin: FIN }, { limit: 10, offset: 20 })).resolves.toEqual([
      cobro,
    ]);
    expect(prismaRendicion.pagos.findMany.mock.calls[0][0]).toMatchObject({
      where: { ...EFECTIVO_DE_PROFESORA, rendido: false, fecha_pago: { lt: FIN } },
      orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
      take: 10,
      skip: 20,
    });
  });

  it("listarRendidos pagina lo rendido por la fecha de rendición, con el total", async () => {
    prismaRendicion.pagos.findMany.mockResolvedValue([{ ...filaCobro, fecha_rendicion: AHORA }]);
    prismaRendicion.pagos.count.mockResolvedValue(31);

    await expect(repositorio.listarRendidos({ inicio: INICIO }, { limit: 10, offset: 20 })).resolves.toEqual({
      datos: [{ ...cobro, fecha_rendicion: AHORA }],
      total: 31,
    });
    const where = { ...EFECTIVO_DE_PROFESORA, rendido: true, fecha_rendicion: { gte: INICIO } };
    expect(prismaRendicion.pagos.findMany.mock.calls[0][0]).toMatchObject({
      where,
      orderBy: [{ fecha_rendicion: "desc" }, { id_pago: "desc" }],
      take: 10,
      skip: 20,
    });
    expect(prismaRendicion.pagos.count).toHaveBeenCalledWith({ where });
  });

  it("idsSinRendirDeProfesora trae los cobros pendientes de esa profesora", async () => {
    prismaRendicion.pagos.findMany.mockResolvedValue([{ id_pago: 7 }, { id_pago: 9 }]);

    await expect(repositorio.idsSinRendirDeProfesora(3)).resolves.toEqual([7, 9]);
    expect(prismaRendicion.pagos.findMany.mock.calls[0][0].where).toEqual({
      ...EFECTIVO_DE_PROFESORA,
      rendido: false,
      id_profesora_cobra: 3,
    });
  });

  it("rendir marca en una sola sentencia solo el efectivo de profesora sin rendir y devuelve los rendidos", async () => {
    prismaRendicion.$queryRaw.mockResolvedValue([{ id_pago: 7, monto: decimal(25000.5) }]);

    await expect(repositorio.rendir([7, 8], AHORA)).resolves.toEqual([{ id_pago: 7, monto: 25000.5 }]);
    const [consulta, ...valores] = prismaRendicion.$queryRaw.mock.calls[0];
    const texto = consulta.join("?");
    expect(texto).toContain("UPDATE pagos SET rendido = true, fecha_rendicion = ?");
    expect(texto).toContain("forma_pago = 'EFECTIVO'");
    expect(texto).toContain("estado = 'CONFIRMADO'");
    expect(texto).toContain("id_profesora_cobra IS NOT NULL");
    expect(texto).toContain("rendido = false");
    expect(texto).toContain("RETURNING id_pago, monto");
    expect(valores).toEqual([AHORA, [7, 8]]);
  });

  it("motivosSinRendir explica por qué no se rindió cada cobro", async () => {
    prismaRendicion.pagos.findMany.mockResolvedValue([
      { id_pago: 7, rendido: true, forma_pago: "EFECTIVO", estado: "CONFIRMADO", id_profesora_cobra: 3 },
      { id_pago: 8, rendido: true, forma_pago: "EFECTIVO", estado: "CONFIRMADO", id_profesora_cobra: null },
      {
        id_pago: 9,
        rendido: false,
        forma_pago: "TRANSFERENCIA",
        estado: "CONFIRMADO",
        id_profesora_cobra: null,
      },
      { id_pago: 10, rendido: false, forma_pago: "EFECTIVO", estado: "RECHAZADO", id_profesora_cobra: 3 },
    ]);

    await expect(repositorio.motivosSinRendir([7, 8, 9, 10, 11])).resolves.toEqual(
      new Map([
        [7, "YA_RENDIDO"],
        [8, "NO_ES_EFECTIVO_DE_PROFESORA"],
        [9, "NO_ES_EFECTIVO_DE_PROFESORA"],
        [10, "NO_ES_EFECTIVO_DE_PROFESORA"],
        [11, "NO_EXISTE"],
      ]),
    );
  });

  describe("obtenerCobranza", () => {
    it("consulta pagos confirmados paginados y totales agrupados por forma de pago", async () => {
      const fechaPago = new Date("2026-10-10T12:00:00Z");
      prismaRendicion.pagos.findMany.mockResolvedValue([
        {
          id_pago: 10,
          id_cuota: 5,
          monto: decimal(25000),
          forma_pago: "EFECTIVO",
          fecha_pago: fechaPago,
          profesora_cobra: {
            id_profesora: 3,
            usuario: { nombre: "Carla", apellido: "Ruiz" },
          },
          cuota: {
            inscripcion: {
              plan: { id_plan: 2, nombre: "Intermedio" },
              alumno: {
                id_alumno: 4,
                usuario: { nombre: "Ana", apellido: "López" },
              },
            },
          },
        },
      ]);
      prismaRendicion.pagos.count.mockResolvedValue(1);
      prismaRendicion.pagos.groupBy.mockResolvedValue([
        { forma_pago: "EFECTIVO", _sum: { monto: decimal(25000) }, _count: { id_pago: 1 } },
      ]);

      const resultado = await repositorio.obtenerCobranza(
        { inicio: INICIO, fin: FIN, forma_pago: "EFECTIVO", id_profesora: 3 },
        { limit: 10, offset: 0 },
      );

      expect(resultado).toEqual({
        total: 1,
        pagos: [
          {
            id_pago: 10,
            id_cuota: 5,
            monto: 25000,
            forma_pago: "EFECTIVO",
            fecha_pago: fechaPago,
            alumno: { id_alumno: 4, nombre: "Ana", apellido: "López" },
            plan: { id_plan: 2, nombre: "Intermedio" },
            profesora_cobra: { id_profesora: 3, nombre: "Carla", apellido: "Ruiz" },
          },
        ],
        totalesPorForma: [
          {
            forma_pago: "EFECTIVO",
            total: 25000,
            cantidad: 1,
          },
        ],
      });
      expect(prismaRendicion.pagos.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        }),
      );
    });

    it("consulta sin filtros de forma de pago ni profesora, maneja profesora_cobra nulo y sumatoria nula", async () => {
      const fechaPago = new Date("2026-10-10T12:00:00Z");
      prismaRendicion.pagos.findMany.mockResolvedValue([
        {
          id_pago: 11,
          id_cuota: 6,
          monto: decimal(15000),
          forma_pago: "TRANSFERENCIA",
          fecha_pago: fechaPago,
          profesora_cobra: null,
          cuota: {
            inscripcion: {
              plan: { id_plan: 1, nombre: "Básico" },
              alumno: {
                id_alumno: 5,
                usuario: { nombre: "Juan", apellido: "Pérez" },
              },
            },
          },
        },
      ]);
      prismaRendicion.pagos.count.mockResolvedValue(1);
      prismaRendicion.pagos.groupBy.mockResolvedValue([
        { forma_pago: "TRANSFERENCIA", _sum: { monto: null }, _count: { id_pago: 1 } },
      ]);

      const resultado = await repositorio.obtenerCobranza(
        { inicio: INICIO, fin: FIN },
        { limit: 20, offset: 5 },
      );

      expect(resultado).toEqual({
        total: 1,
        pagos: [
          {
            id_pago: 11,
            id_cuota: 6,
            monto: 15000,
            forma_pago: "TRANSFERENCIA",
            fecha_pago: fechaPago,
            alumno: { id_alumno: 5, nombre: "Juan", apellido: "Pérez" },
            plan: { id_plan: 1, nombre: "Básico" },
            profesora_cobra: null,
          },
        ],
        totalesPorForma: [
          {
            forma_pago: "TRANSFERENCIA",
            total: 0,
            cantidad: 1,
          },
        ],
      });
      expect(prismaRendicion.pagos.findMany).toHaveBeenCalledWith({
        where: {
          estado: "CONFIRMADO",
          fecha_pago: { gte: INICIO, lt: FIN },
        },
        select: expect.any(Object),
        orderBy: [{ fecha_pago: "desc" }, { id_pago: "desc" }],
        take: 20,
        skip: 5,
      });
    });
  });
});
