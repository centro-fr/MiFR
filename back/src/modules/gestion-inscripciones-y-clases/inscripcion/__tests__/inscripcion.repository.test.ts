import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InscripcionRepository } from "../inscripcion.repository.js";
import {
  INCLUIR_DATOS_COBRO,
  INCLUIR_DATOS_INSCRIPCION,
  type InscripcionConDatos,
} from "../inscripcion.types.js";

const transaccion = {
  $executeRaw: vi.fn(),
  horarios: { findMany: vi.fn() },
  inscripciones: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  inscripcion_horarios: {
    groupBy: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};
const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  inscripciones: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  inscripcion_horarios: { groupBy: vi.fn() },
};

const DIA = new Date("2026-10-09T00:00:00Z");
const INSTANTE = new Date("2026-10-09T15:00:00Z");
const nueva = {
  id_alumno: 5,
  id_plan: 1,
  id_plan_precio: 15,
  id_profesora: 3,
  sin_cargo: false,
  fecha_inicio: DIA,
  estado: "PREINSCRIPTA" as const,
};
const actual = {
  id_inscripcion: 12,
  id_alumno: 5,
  id_plan: 1,
  horarios: [
    { id_horario: 8, fecha_hasta: null },
    { id_horario: 6, fecha_hasta: DIA },
  ],
} as unknown as InscripcionConDatos;

// Cupo de la actividad 2 y ningún inscripto: hay lugar en cualquier horario pedido.
function conCupoLibre(idsHorarios: number[] = [8]) {
  transaccion.horarios.findMany.mockResolvedValue(
    idsHorarios.map((id_horario) => ({
      id_horario,
      cupo_maximo: null,
      actividad: { cupo_maximo: 2, activo: true },
    })),
  );
  transaccion.inscripcion_horarios.groupBy.mockResolvedValue([]);
}

function clavesBloqueadas(): string[] {
  return transaccion.$executeRaw.mock.calls.map(([, clave]) => clave as string);
}

describe("InscripcionRepository", () => {
  let repositorio: InscripcionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    transaccion.inscripciones.findFirst.mockResolvedValue(null);
    transaccion.inscripciones.findUnique.mockResolvedValue({ estado: "PREINSCRIPTA" });
    transaccion.inscripciones.create.mockResolvedValue({ id_inscripcion: 20 });
    transaccion.inscripciones.update.mockResolvedValue({ id_inscripcion: 12 });
    transaccion.inscripciones.findUniqueOrThrow.mockResolvedValue({ id_inscripcion: 12 });
    conCupoLibre();
    repositorio = new InscripcionRepository(prisma as unknown as PrismaClient);
  });

  describe("consultas", () => {
    it("buscarParaCobro trae solo la inscripción con su alumno y su tutor", async () => {
      await repositorio.buscarParaCobro(12);

      expect(prisma.inscripciones.findUnique).toHaveBeenCalledWith({
        where: { id_inscripcion: 12 },
        include: INCLUIR_DATOS_COBRO,
      });
    });

    it("buscarPorId y listarVigentesPorAlumno traen los datos de la inscripción", async () => {
      await repositorio.buscarPorId(12);
      await repositorio.listarVigentesPorAlumno(5);

      expect(prisma.inscripciones.findUnique).toHaveBeenCalledWith({
        where: { id_inscripcion: 12 },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      expect(prisma.inscripciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_alumno: 5, estado: { in: ["PREINSCRIPTA", "ACTIVA"] } } }),
      );
    });

    it("listar combina los filtros; la actividad se busca en los horarios vigentes", async () => {
      await repositorio.listar({
        id_alumno: 5,
        id_plan: 1,
        id_profesora: 3,
        estado: "ACTIVA",
        id_actividad: 4,
      });
      await repositorio.listar({});

      expect(prisma.inscripciones.findMany.mock.calls[0][0].where).toEqual({
        id_alumno: 5,
        id_plan: 1,
        id_profesora: 3,
        estado: "ACTIVA",
        horarios: { some: { fecha_hasta: null, horario: { id_actividad: 4 } } },
      });
      expect(prisma.inscripciones.findMany.mock.calls[1][0].where).toEqual({});
    });

    it("buscarVigentePorAlumno busca la más reciente pre-inscripta o activa", async () => {
      await repositorio.buscarVigentePorAlumno(5);

      expect(prisma.inscripciones.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_alumno: 5, estado: { in: ["PREINSCRIPTA", "ACTIVA"] } } }),
      );
    });

    it("obtenerIdsDeAlumnos filtra los vigentes que no están de baja", async () => {
      prisma.inscripciones.findMany.mockResolvedValue([{ id_alumno: 5 }, { id_alumno: 7 }]);

      await expect(
        repositorio.obtenerIdsDeAlumnos({ id_plan: 1, id_profesora: 3, id_actividad: 4 }),
      ).resolves.toEqual([5, 7]);
      expect(prisma.inscripciones.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          estado: { in: ["PREINSCRIPTA", "ACTIVA"] },
          alumno: { estado: { not: "BAJA" } },
          id_plan: 1,
          id_profesora: 3,
          horarios: { some: { fecha_hasta: null, horario: { id_actividad: 4 } } },
        },
        distinct: ["id_alumno"],
      });

      await repositorio.obtenerIdsDeAlumnos({});
      expect(prisma.inscripciones.findMany.mock.calls[1][0].where).toEqual({
        estado: { in: ["PREINSCRIPTA", "ACTIVA"] },
        alumno: { estado: { not: "BAJA" } },
      });
    });

    it("resumirInscripcionesVigentes deja la más reciente de cada alumno, sin consultar si no hay ids", async () => {
      await expect(repositorio.resumirInscripcionesVigentes([])).resolves.toEqual([]);
      expect(prisma.inscripciones.findMany).not.toHaveBeenCalled();

      const fila = {
        id_alumno: 5,
        id_inscripcion: 20,
        estado: "ACTIVA",
        id_plan: 2,
        plan: { nombre: "Intermedio" },
        id_profesora: 3,
        profesora: { usuario: { nombre: "Lucía", apellido: "Gómez" } },
        horarios: [{ id_horario: 8 }],
      };
      prisma.inscripciones.findMany.mockResolvedValue([fila, { ...fila, id_inscripcion: 12, id_plan: 1 }]);

      await expect(repositorio.resumirInscripcionesVigentes([5])).resolves.toEqual([
        {
          id_alumno: 5,
          id_inscripcion: 20,
          estado: "ACTIVA",
          id_plan: 2,
          nombre_plan: "Intermedio",
          id_profesora: 3,
          nombre_profesora: "Lucía Gómez",
          ids_horarios: [8],
        },
      ]);
    });

    it("contarInscriptosVigentes cuenta por horario los abiertos de inscripciones vigentes", async () => {
      await expect(repositorio.contarInscriptosVigentes([])).resolves.toEqual(new Map());
      expect(prisma.inscripcion_horarios.groupBy).not.toHaveBeenCalled();

      prisma.inscripcion_horarios.groupBy.mockResolvedValue([{ id_horario: 8, _count: { id_horario: 3 } }]);

      await expect(repositorio.contarInscriptosVigentes([8, 9])).resolves.toEqual(new Map([[8, 3]]));
      expect(prisma.inscripcion_horarios.groupBy.mock.calls[0][0].where).toMatchObject({
        id_horario: { in: [8, 9] },
        fecha_hasta: null,
      });
    });
  });

  describe("crear", () => {
    it("bloquea alumno-plan y cada horario en orden antes de revisar duplicados y cupo", async () => {
      conCupoLibre([9, 8]);

      await expect(repositorio.crear(nueva, [9, 8], DIA)).resolves.toMatchObject({ resultado: "ok" });

      expect(clavesBloqueadas()).toEqual([
        "inscripcion-horario:8",
        "inscripcion-horario:9",
        "inscripcion-plan:5:1",
      ]);
      expect(transaccion.inscripciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: "PREINSCRIPTA",
            horarios: {
              create: [
                { id_horario: 9, fecha_desde: DIA },
                { id_horario: 8, fecha_desde: DIA },
              ],
            },
          }),
        }),
      );
    });

    it("no crea si el alumno ya tiene ese plan vigente", async () => {
      transaccion.inscripciones.findFirst.mockResolvedValue({ id_inscripcion: 3 });

      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toEqual({ resultado: "plan-duplicado" });
      expect(transaccion.inscripciones.create).not.toHaveBeenCalled();
    });

    it("no crea si un horario está completo", async () => {
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);

      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toEqual({ resultado: "sin-cupo" });
    });

    it("el cupo propio del horario manda sobre el de la actividad, y sin cupo no hay límite", async () => {
      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: 1, actividad: { cupo_maximo: 10, activo: true } },
      ]);
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 1 } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toEqual({ resultado: "sin-cupo" });

      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: null, actividad: { cupo_maximo: null, activo: true } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toMatchObject({ resultado: "ok" });
    });

    it("sin cupo si un horario no existe, está de baja o su actividad está inactiva", async () => {
      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toEqual({ resultado: "sin-cupo" });

      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: null, actividad: { cupo_maximo: 2, activo: false } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA)).resolves.toEqual({ resultado: "sin-cupo" });
    });
  });

  describe("activar", () => {
    beforeEach(() => {
      prisma.inscripciones.findUnique.mockResolvedValue(actual);
    });

    it("pasa a ACTIVA revalidando el cupo sin contarse a sí misma", async () => {
      await expect(repositorio.activar(12)).resolves.toMatchObject({ resultado: "ok" });

      expect(clavesBloqueadas()).toEqual(["inscripcion-horario:8", "inscripcion-plan:5:1"]);
      expect(transaccion.inscripcion_horarios.groupBy.mock.calls[0][0].where.inscripcion).toMatchObject({
        id_inscripcion: { not: 12 },
      });
      expect(transaccion.inscripciones.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_inscripcion: 12 }, data: { estado: "ACTIVA" } }),
      );
    });

    it("no activa si no existe, si se dio de baja mientras tanto o si no hay cupo", async () => {
      prisma.inscripciones.findUnique.mockResolvedValueOnce(null);
      await expect(repositorio.activar(12)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripciones.findUnique.mockResolvedValueOnce({ estado: "BAJA" });
      await expect(repositorio.activar(12)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripciones.findUnique.mockResolvedValueOnce(null);
      await expect(repositorio.activar(12)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);
      await expect(repositorio.activar(12)).resolves.toEqual({ resultado: "sin-cupo" });
      expect(transaccion.inscripciones.update).not.toHaveBeenCalled();
    });
  });

  describe("darDeBajaAlumno", () => {
    it("da de baja las vigentes con el instante y cierra sus horarios con el día", async () => {
      transaccion.inscripciones.findMany.mockResolvedValue([
        { id_inscripcion: 12, horarios: [{ id_horario: 8 }] },
        { id_inscripcion: 13, horarios: [{ id_horario: 9 }] },
      ]);

      await expect(
        repositorio.darDeBajaAlumno(5, { motivo_baja: "MUDANZA" }, { instante: INSTANTE, dia: DIA }),
      ).resolves.toEqual([12, 13]);

      expect(clavesBloqueadas()).toEqual(["inscripcion-horario:8", "inscripcion-horario:9"]);
      expect(transaccion.inscripciones.updateMany).toHaveBeenCalledWith({
        where: { id_inscripcion: { in: [12, 13] } },
        data: { estado: "BAJA", motivo_baja: "MUDANZA", fecha_baja: INSTANTE },
      });
      expect(transaccion.inscripcion_horarios.updateMany).toHaveBeenCalledWith({
        where: { id_inscripcion: { in: [12, 13] }, fecha_hasta: null },
        data: { fecha_hasta: DIA },
      });
    });

    it("sin inscripciones vigentes no actualiza nada", async () => {
      transaccion.inscripciones.findMany.mockResolvedValue([]);

      await expect(
        repositorio.darDeBajaAlumno(5, { motivo_baja: "OTRO" }, { instante: INSTANTE, dia: DIA }),
      ).resolves.toEqual([]);
      expect(transaccion.inscripciones.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("reactivar", () => {
    const reactivacion = { ...nueva, estado: "ACTIVA" as const };

    it("crea una inscripción nueva ACTIVA si hay cupo", async () => {
      await expect(repositorio.reactivar(reactivacion, [8], DIA)).resolves.toMatchObject({ resultado: "ok" });

      expect(transaccion.inscripciones.create.mock.calls[0][0].data).toMatchObject({ estado: "ACTIVA" });
    });

    it("devuelve la activa que ya existía en lugar de crear otra", async () => {
      transaccion.inscripciones.findFirst.mockResolvedValue({ id_inscripcion: 12 });

      await expect(repositorio.reactivar(reactivacion, [8], DIA)).resolves.toEqual({
        resultado: "ok",
        inscripcion: { id_inscripcion: 12 },
      });
      expect(transaccion.inscripciones.create).not.toHaveBeenCalled();
    });

    it("no crea sin cupo", async () => {
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);

      await expect(repositorio.reactivar(reactivacion, [8], DIA)).resolves.toEqual({ resultado: "sin-cupo" });
    });
  });

  describe("cambiarPlan", () => {
    const cambio = { id_plan: 2, id_profesora: 3, ids_horarios: [9], sin_cargo: false };
    const fechas = { instante: INSTANTE, dia: DIA };

    it("da de baja la actual con CAMBIO_PLAN y crea la nueva con el mismo estado", async () => {
      conCupoLibre([9]);
      transaccion.inscripciones.findUnique.mockResolvedValue({ estado: "ACTIVA" });

      await expect(repositorio.cambiarPlan(actual, cambio, 16, fechas)).resolves.toMatchObject({
        resultado: "ok",
      });

      expect(clavesBloqueadas()).toEqual([
        "inscripcion-horario:8",
        "inscripcion-horario:9",
        "inscripcion-plan:5:1",
        "inscripcion-plan:5:2",
      ]);
      expect(transaccion.inscripciones.update).toHaveBeenCalledWith({
        where: { id_inscripcion: 12 },
        data: { estado: "BAJA", motivo_baja: "CAMBIO_PLAN", fecha_baja: INSTANTE },
      });
      expect(transaccion.inscripciones.create.mock.calls[0][0].data).toMatchObject({
        id_plan: 2,
        id_plan_precio: 16,
        estado: "ACTIVA",
        fecha_inicio: DIA,
        horarios: { create: [{ id_horario: 9, fecha_desde: DIA }] },
      });
    });

    it("no cambia si dejó de estar vigente, si el plan nuevo ya está vigente o si no hay cupo", async () => {
      transaccion.inscripciones.findUnique.mockResolvedValueOnce({ estado: "BAJA" });
      await expect(repositorio.cambiarPlan(actual, cambio, 16, fechas)).resolves.toEqual({
        resultado: "no-vigente",
      });

      transaccion.inscripciones.findFirst.mockResolvedValueOnce({ id_inscripcion: 30 });
      await expect(repositorio.cambiarPlan(actual, cambio, 16, fechas)).resolves.toEqual({
        resultado: "plan-duplicado",
      });

      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(repositorio.cambiarPlan(actual, cambio, 16, fechas)).resolves.toEqual({
        resultado: "sin-cupo",
      });
      expect(transaccion.inscripciones.create).not.toHaveBeenCalled();
    });
  });

  describe("actualizarHorarios", () => {
    it("cierra los que salen, reabre uno que ya tuvo y crea los nuevos", async () => {
      conCupoLibre([6, 9]);
      transaccion.inscripcion_horarios.findUnique
        .mockResolvedValueOnce({ fecha_hasta: DIA })
        .mockResolvedValueOnce(null);

      await expect(
        repositorio.actualizarHorarios(actual, { ids_horarios: [6, 9] }, DIA),
      ).resolves.toMatchObject({
        resultado: "ok",
      });

      expect(transaccion.inscripcion_horarios.updateMany).toHaveBeenCalledWith({
        where: { id_inscripcion: 12, id_horario: { in: [8] }, fecha_hasta: null },
        data: { fecha_hasta: DIA },
      });
      expect(transaccion.inscripcion_horarios.update).toHaveBeenCalledWith({
        where: { id_inscripcion_id_horario: { id_inscripcion: 12, id_horario: 6 } },
        data: { fecha_desde: DIA, fecha_hasta: null },
      });
      expect(transaccion.inscripcion_horarios.create).toHaveBeenCalledWith({
        data: { id_inscripcion: 12, id_horario: 9, fecha_desde: DIA },
      });
    });

    it("no cambia si dejó de estar vigente o si no hay cupo", async () => {
      transaccion.inscripciones.findUnique.mockResolvedValueOnce(null);
      await expect(repositorio.actualizarHorarios(actual, { ids_horarios: [9] }, DIA)).resolves.toEqual({
        resultado: "no-vigente",
      });

      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(repositorio.actualizarHorarios(actual, { ids_horarios: [9] }, DIA)).resolves.toEqual({
        resultado: "sin-cupo",
      });
      expect(transaccion.inscripcion_horarios.updateMany).not.toHaveBeenCalled();
    });
  });
});
