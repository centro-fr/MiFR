import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgresoRepository } from "../progreso.repository.js";

const transaccion = {
  medidas_corporales: { deleteMany: vi.fn() },
  registros_progreso: { update: vi.fn() },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  registros_progreso: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};

const CON_MEDIDAS = {
  medidas: { include: { tipo_medida: true }, orderBy: { id_tipo_medida: "asc" } },
};
const FECHA = new Date("2026-10-20T00:00:00Z");

function fila(parcial: Record<string, unknown> = {}) {
  return {
    id_registro: 1,
    id_alumno: 5,
    id_profesora: 10,
    fecha: FECHA,
    observaciones: "Control mensual",
    fecha_modificacion: null,
    id_usuario_modifica: null,
    fecha_baja: null,
    id_usuario_baja: null,
    medidas: [{ valor: new Prisma.Decimal("62.4"), tipo_medida: { codigo: "PESO", unidad: "kg" } }],
    ...parcial,
  };
}

const REGISTRO = {
  id_registro: 1,
  id_alumno: 5,
  id_profesora: 10,
  fecha: FECHA,
  observaciones: "Control mensual",
  fecha_modificacion: null,
  id_usuario_modifica: null,
  medidas: [{ codigo: "PESO", unidad: "kg", valor: 62.4 }],
};

const MEDIDA_A_CREAR = {
  valor: 62.4,
  tipo_medida: { connectOrCreate: { where: { codigo: "PESO" }, create: { codigo: "PESO", unidad: "kg" } } },
};

describe("ProgresoRepository", () => {
  let repositorio: ProgresoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T15:00:00Z"));
    prisma.registros_progreso.create.mockResolvedValue(fila());
    transaccion.registros_progreso.update.mockResolvedValue(fila());
    repositorio = new ProgresoRepository(prisma as unknown as PrismaClient);
  });

  it("crear guarda el registro con sus medidas y las traduce a números", async () => {
    const creado = await repositorio.crear({
      id_alumno: 5,
      id_profesora: 10,
      fecha: FECHA,
      observaciones: "Control mensual",
      medidas: [{ codigo: "PESO", unidad: "kg", valor: 62.4 }],
    });

    expect(creado).toEqual(REGISTRO);
    expect(prisma.registros_progreso.create).toHaveBeenCalledWith({
      data: {
        id_alumno: 5,
        id_profesora: 10,
        fecha: FECHA,
        observaciones: "Control mensual",
        medidas: { create: [MEDIDA_A_CREAR] },
      },
      include: CON_MEDIDAS,
    });
  });

  it("buscarPorId no encuentra un registro dado de baja", async () => {
    prisma.registros_progreso.findFirst.mockResolvedValue(null);

    expect(await repositorio.buscarPorId(1)).toBeNull();
    expect(prisma.registros_progreso.findFirst).toHaveBeenCalledWith({
      where: { id_registro: 1, fecha_baja: null },
      include: CON_MEDIDAS,
    });
  });

  it("buscarPorId devuelve el registro vigente", async () => {
    prisma.registros_progreso.findFirst.mockResolvedValue(fila());

    expect(await repositorio.buscarPorId(1)).toEqual(REGISTRO);
  });

  it("listarDeAlumno trae los vigentes del más reciente al más antiguo", async () => {
    prisma.registros_progreso.findMany.mockResolvedValue([fila()]);

    expect(await repositorio.listarDeAlumno(5)).toEqual([REGISTRO]);
    expect(prisma.registros_progreso.findMany).toHaveBeenCalledWith({
      where: { id_alumno: 5, fecha_baja: null },
      orderBy: [{ fecha: "desc" }, { id_registro: "desc" }],
      include: CON_MEDIDAS,
    });
  });

  describe("actualizar", () => {
    it("reemplaza las medidas y deja quién y cuándo en la misma transacción", async () => {
      await repositorio.actualizar(
        1,
        { fecha: FECHA, observaciones: null, medidas: [{ codigo: "PESO", unidad: "kg", valor: 62.4 }] },
        7,
      );

      expect(transaccion.medidas_corporales.deleteMany).toHaveBeenCalledWith({ where: { id_registro: 1 } });
      expect(transaccion.registros_progreso.update).toHaveBeenCalledWith({
        where: { id_registro: 1 },
        data: {
          fecha_modificacion: new Date("2026-10-27T15:00:00Z"),
          usuario_modifica: { connect: { id_usuario: 7 } },
          fecha: FECHA,
          observaciones: null,
          medidas: { create: [MEDIDA_A_CREAR] },
        },
        include: CON_MEDIDAS,
      });
    });

    it("sin medidas nuevas no toca las anteriores ni los campos que no vienen", async () => {
      await repositorio.actualizar(1, { observaciones: "Corregida" }, 7);

      expect(transaccion.medidas_corporales.deleteMany).not.toHaveBeenCalled();
      expect(transaccion.registros_progreso.update).toHaveBeenCalledWith({
        where: { id_registro: 1 },
        data: {
          fecha_modificacion: new Date("2026-10-27T15:00:00Z"),
          usuario_modifica: { connect: { id_usuario: 7 } },
          observaciones: "Corregida",
        },
        include: CON_MEDIDAS,
      });
    });
  });

  it("actualizar con solo la fecha deja las observaciones como estaban", async () => {
    await repositorio.actualizar(1, { fecha: FECHA }, 7);

    expect(transaccion.registros_progreso.update.mock.calls[0]?.[0].data).not.toHaveProperty("observaciones");
  });

  it("darDeBaja marca la baja con quién y cuándo, sin borrar el registro", async () => {
    await repositorio.darDeBaja(1, 7);

    expect(prisma.registros_progreso.update).toHaveBeenCalledWith({
      where: { id_registro: 1 },
      data: { fecha_baja: new Date("2026-10-27T15:00:00Z"), usuario_baja: { connect: { id_usuario: 7 } } },
    });
  });
});
