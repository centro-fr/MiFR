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
  pagos: { findMany: vi.fn(), findUnique: vi.fn() },
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
    beforeEach(() => {
      prisma.pagos.findMany.mockResolvedValue([{ ...filaPago, cuota: { inscripcion: { alumno } } }]);
    });

    it("listarTransferencias filtra por estado y alumno, de la más vieja a la más nueva, con el alumno", async () => {
      await expect(repositorio.listarTransferencias({ estado: "PENDIENTE", id_alumno: 5 })).resolves.toEqual([
        { ...filaPago, monto: 30000, alumno: { id_alumno: 5, nombre: "Valentina", apellido: "Herrera" } },
      ]);
      expect(prisma.pagos.findMany.mock.calls[0][0]).toMatchObject({
        where: { forma_pago: "TRANSFERENCIA", estado: "PENDIENTE", cuota: { inscripcion: { id_alumno: 5 } } },
        orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
      });

      await repositorio.listarTransferencias({});
      expect(prisma.pagos.findMany.mock.calls[1][0].where).toEqual({ forma_pago: "TRANSFERENCIA" });
    });

    it("listarTransferencias trae como mucho 100 por pedido, o la página pedida", async () => {
      await repositorio.listarTransferencias({});
      await repositorio.listarTransferencias({ limit: 10, offset: 30 });

      expect(prisma.pagos.findMany.mock.calls[0][0]).toMatchObject({ take: 100, skip: 0 });
      expect(prisma.pagos.findMany.mock.calls[1][0]).toMatchObject({ take: 10, skip: 30 });
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

  it("buscarParaComprobante trae los datos del comprobante, o null", async () => {
    prisma.pagos.findUnique.mockResolvedValueOnce({ ...filaPago, cuota: { numero_cuota: 2 } });

    await expect(repositorio.buscarParaComprobante(7)).resolves.toMatchObject({
      monto: 30000,
      cuota: { numero_cuota: 2 },
    });
    prisma.pagos.findUnique.mockResolvedValueOnce(null);
    await expect(repositorio.buscarParaComprobante(8)).resolves.toBeNull();
  });
});
