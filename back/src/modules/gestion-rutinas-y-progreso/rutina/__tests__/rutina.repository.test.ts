import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RutinaRepository } from "../rutina.repository.js";
import type { NuevaRutina } from "../rutina.types.js";

const transaccion = {
  $executeRaw: vi.fn(),
  rutinas: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  rutinas: { findMany: vi.fn(), findFirst: vi.fn() },
  inscripciones: { findFirst: vi.fn() },
};

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);
const CONTENIDO = { dias: [{ nombre: "Día 1", ejercicios: [] }] };

function fila(parcial: Record<string, unknown> = {}) {
  return {
    id_rutina: 1,
    id_alumno: 5,
    id_profesora: 10,
    nombre: "Mes 1",
    fecha_desde: dia("2026-10-01"),
    fecha_hasta: null,
    contenido: CONTENIDO,
    observaciones: null,
    activa: true,
    ...parcial,
  };
}

const NUEVA: NuevaRutina = {
  id_alumno: 5,
  id_profesora: 10,
  nombre: "Mes 2",
  fecha_desde: dia("2026-11-01"),
  fecha_hasta: null,
  contenido: CONTENIDO,
  observaciones: null,
};

describe("RutinaRepository", () => {
  let repositorio: RutinaRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    transaccion.rutinas.findMany.mockResolvedValue([]);
    transaccion.rutinas.create.mockResolvedValue(fila({ id_rutina: 2, nombre: "Mes 2" }));
    repositorio = new RutinaRepository(prisma as unknown as PrismaClient);
  });

  it("listarDeAlumno trae el historial de la más reciente a la más antigua", async () => {
    prisma.rutinas.findMany.mockResolvedValue([fila()]);

    expect(await repositorio.listarDeAlumno(5)).toEqual([fila()]);
    expect(prisma.rutinas.findMany).toHaveBeenCalledWith({
      where: { id_alumno: 5 },
      orderBy: [{ fecha_desde: "desc" }, { id_rutina: "desc" }],
    });
  });

  it("buscarVigenteDeAlumno trae la rutina activa", async () => {
    prisma.rutinas.findFirst.mockResolvedValue(fila());

    expect(await repositorio.buscarVigenteDeAlumno(5)).toEqual(fila());
    expect(prisma.rutinas.findFirst).toHaveBeenCalledWith({ where: { id_alumno: 5, activa: true } });
  });

  it("buscarVigenteDeAlumno devuelve null si el alumno no tiene rutina", async () => {
    prisma.rutinas.findFirst.mockResolvedValue(null);

    expect(await repositorio.buscarVigenteDeAlumno(5)).toBeNull();
  });

  it.each([
    [{ id_inscripcion: 3 }, true],
    [null, false],
  ])("profesoraTieneAlumno busca una inscripción que no esté de baja (%j)", async (inscripcion, esperado) => {
    prisma.inscripciones.findFirst.mockResolvedValue(inscripcion);

    expect(await repositorio.profesoraTieneAlumno(10, 5)).toBe(esperado);
    expect(prisma.inscripciones.findFirst).toHaveBeenCalledWith({
      where: { id_alumno: 5, id_profesora: 10, estado: { not: "BAJA" } },
      select: { id_inscripcion: true },
    });
  });

  describe("crear", () => {
    it("bloquea al alumno y deja la nueva rutina vigente", async () => {
      const creada = await repositorio.crear(NUEVA);

      expect(transaccion.$executeRaw).toHaveBeenCalledTimes(1);
      expect(transaccion.rutinas.findMany).toHaveBeenCalledWith({ where: { id_alumno: 5, activa: true } });
      expect(transaccion.rutinas.update).not.toHaveBeenCalled();
      expect(transaccion.rutinas.create).toHaveBeenCalledWith({ data: { ...NUEVA, activa: true } });
      expect(creada.nombre).toBe("Mes 2");
    });

    it("cierra la anterior sin fecha de fin el día previo al inicio de la nueva", async () => {
      transaccion.rutinas.findMany.mockResolvedValue([fila()]);

      await repositorio.crear(NUEVA);

      expect(transaccion.rutinas.update).toHaveBeenCalledWith({
        where: { id_rutina: 1 },
        data: { activa: false, fecha_hasta: dia("2026-10-31") },
      });
    });

    it("a una anterior que empieza el mismo día le pone como fin su propio inicio", async () => {
      transaccion.rutinas.findMany.mockResolvedValue([fila({ fecha_desde: dia("2026-11-01") })]);

      await repositorio.crear(NUEVA);

      expect(transaccion.rutinas.update).toHaveBeenCalledWith({
        where: { id_rutina: 1 },
        data: { activa: false, fecha_hasta: dia("2026-11-01") },
      });
    });

    it("respeta la fecha de fin que ya tenía la anterior", async () => {
      transaccion.rutinas.findMany.mockResolvedValue([fila({ fecha_hasta: dia("2026-10-15") })]);

      await repositorio.crear(NUEVA);

      expect(transaccion.rutinas.update).toHaveBeenCalledWith({
        where: { id_rutina: 1 },
        data: { activa: false, fecha_hasta: dia("2026-10-15") },
      });
    });
  });
});
