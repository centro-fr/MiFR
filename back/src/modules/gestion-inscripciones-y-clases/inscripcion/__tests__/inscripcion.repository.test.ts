import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InscripcionRepository } from "../inscripcion.repository.js";
import {
  INCLUIR_DATOS_COBRO,
  INCLUIR_DATOS_INSCRIPCION,
  type InscripcionGuardada,
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
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};
const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  inscripciones: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
  inscripcion_horarios: { groupBy: vi.fn() },
};

const DIA = new Date("2026-10-09T00:00:00Z");
const INSTANTE = new Date("2026-10-09T15:00:00Z");
// Con 3 días de reserva, el 9 todavía reservan las pre-inscripciones que empezaron desde el 6.
const RESERVAS = new Date("2026-10-06T00:00:00Z");
const OCUPAN_LUGAR = {
  OR: [{ estado: "ACTIVA" }, { estado: "PREINSCRIPTA", fecha_inicio: { gte: RESERVAS } }],
};
const nueva = {
  id_alumno: 5,
  id_plan: 1,
  id_plan_precio: 15,
  id_promocion: 4,
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
} as unknown as InscripcionGuardada;

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

    it("listarDeLaUltimaBaja trae las inscripciones que cerró la última baja del alumno, sin los cambios de plan", async () => {
      const instante = new Date("2026-10-05T14:00:00Z");
      prisma.inscripciones.findFirst.mockResolvedValue({ fecha_baja: instante });
      prisma.inscripciones.findMany.mockResolvedValue([{ id_inscripcion: 12 }]);

      await expect(repositorio.listarDeLaUltimaBaja(5)).resolves.toEqual([{ id_inscripcion: 12 }]);

      const deBaja = { id_alumno: 5, estado: "BAJA", motivo_baja: { not: "CAMBIO_PLAN" } };
      expect(prisma.inscripciones.findFirst).toHaveBeenCalledWith({
        where: deBaja,
        orderBy: { fecha_baja: "desc" },
        select: { fecha_baja: true },
      });
      expect(prisma.inscripciones.findMany).toHaveBeenCalledWith({
        where: { ...deBaja, fecha_baja: instante },
        include: INCLUIR_DATOS_INSCRIPCION,
        orderBy: { id_inscripcion: "asc" },
      });
    });

    it("listarDeLaUltimaBaja no devuelve nada si el alumno nunca se dio de baja", async () => {
      prisma.inscripciones.findFirst.mockResolvedValue(null);

      await expect(repositorio.listarDeLaUltimaBaja(5)).resolves.toEqual([]);
      expect(prisma.inscripciones.findMany).not.toHaveBeenCalled();
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

    it("listar trae como mucho 100 por pedido, o la página pedida", async () => {
      await repositorio.listar({});
      await repositorio.listar({ limit: 20, offset: 40 });

      expect(prisma.inscripciones.findMany.mock.calls[0][0]).toMatchObject({ take: 100, skip: 0 });
      expect(prisma.inscripciones.findMany.mock.calls[1][0]).toMatchObject({ take: 20, skip: 40 });
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

    it("resumirInscripcionesVigentes trae todas las vigentes de cada alumno, sin consultar si no hay ids", async () => {
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
        expect.objectContaining({ id_alumno: 5, id_inscripcion: 12, id_plan: 1 }),
      ]);
      expect(prisma.inscripciones.findMany.mock.calls[0][0].orderBy).toEqual([
        { fecha_inicio: "desc" },
        { id_inscripcion: "desc" },
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

    it("aCargoEnPeriodo trae las activas y las bajas que se cruzan con el período, sin las pre-inscriptas", async () => {
      const fila = { id_inscripcion: 12, estado: "ACTIVA" };
      prisma.inscripciones.findMany.mockResolvedValue([fila]);

      await expect(
        repositorio.aCargoEnPeriodo(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-31T00:00:00Z")),
      ).resolves.toEqual([fila]);
      expect(prisma.inscripciones.findMany.mock.calls[0][0].where).toEqual({
        estado: { in: ["ACTIVA", "BAJA"] },
        fecha_inicio: { lte: new Date("2026-10-31T00:00:00Z") },
        // Una baja del 01/10 a las 00:30 de Argentina ya es del período: 03:30 UTC.
        OR: [{ fecha_baja: null }, { fecha_baja: { gte: new Date("2026-10-01T03:00:00Z") } }],
      });
    });

    it("listarParaInactividad trae las activas de plan mensual de alumnos no dados de baja, con los filtros", async () => {
      prisma.inscripciones.findMany.mockResolvedValue([
        {
          id_inscripcion: 12,
          id_alumno: 5,
          plan: { id_plan: 2, nombre: "Intermedio" },
          profesora: { id_profesora: 3, usuario: { nombre: "Lucía", apellido: "Gómez" } },
        },
      ]);

      await expect(repositorio.listarParaInactividad({ id_profesora: 3 })).resolves.toEqual([
        {
          id_inscripcion: 12,
          id_alumno: 5,
          plan: { id_plan: 2, nombre: "Intermedio" },
          profesora: { id_profesora: 3, nombre: "Lucía", apellido: "Gómez" },
        },
      ]);
      expect(prisma.inscripciones.findMany.mock.calls[0][0].where).toEqual({
        estado: "ACTIVA",
        plan: { tipo: "MENSUAL" },
        alumno: { estado: { not: "BAJA" } },
        id_profesora: 3,
      });

      await repositorio.listarParaInactividad({ id_inscripcion: 12, id_plan: 2 });
      expect(prisma.inscripciones.findMany.mock.calls[1][0].where).toMatchObject({
        id_inscripcion: 12,
        id_plan: 2,
      });
    });

    const INSCRIPTOS_DEL_HORARIO_8 = {
      id_horario: 8,
      fecha_desde: { lte: DIA },
      OR: [{ fecha_hasta: null }, { fecha_hasta: { gte: DIA } }],
      // Solo la inscripción activa: un pre-inscripto no está en la clase.
      inscripcion: { estado: "ACTIVA", alumno: { estado: { not: "BAJA" } } },
    };
    const SELECCION_INSCRIPTO = {
      inscripcion: {
        select: {
          id_inscripcion: true,
          id_alumno: true,
          alumno: { select: { usuario: { select: { nombre: true, apellido: true } } } },
        },
      },
    };
    const inscripto = {
      id_inscripcion: 12,
      id_alumno: 5,
      alumno: { usuario: { nombre: "Ana", apellido: "Paz" } },
    };

    it("listarParaAsistencia bloquea el horario y trae los inscriptos vigentes ese día, por apellido", async () => {
      transaccion.inscripcion_horarios.findMany.mockResolvedValue([{ inscripcion: inscripto }]);

      await expect(repositorio.listarParaAsistencia(8, DIA)).resolves.toEqual([inscripto]);
      expect(clavesBloqueadas()).toEqual(["inscripcion-horario:8"]);
      expect(transaccion.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        transaccion.inscripcion_horarios.findMany.mock.invocationCallOrder[0]!,
      );
      expect(transaccion.inscripcion_horarios.findMany).toHaveBeenCalledWith({
        where: INSCRIPTOS_DEL_HORARIO_8,
        select: SELECCION_INSCRIPTO,
        orderBy: [
          { inscripcion: { alumno: { usuario: { apellido: "asc" } } } },
          { inscripcion: { alumno: { usuario: { nombre: "asc" } } } },
        ],
      });
    });

    it("buscarParaAsistencia bloquea el horario y devuelve solo una inscripción vigente del alumno", async () => {
      transaccion.inscripcion_horarios.findFirst.mockResolvedValue({ inscripcion: inscripto });

      await expect(repositorio.buscarParaAsistencia(8, 5, DIA)).resolves.toEqual(inscripto);
      expect(clavesBloqueadas()).toEqual(["inscripcion-horario:8"]);
      expect(transaccion.inscripcion_horarios.findFirst).toHaveBeenCalledWith({
        where: {
          ...INSCRIPTOS_DEL_HORARIO_8,
          inscripcion: { ...INSCRIPTOS_DEL_HORARIO_8.inscripcion, id_alumno: 5 },
        },
        select: SELECCION_INSCRIPTO,
      });
    });

    it("buscarParaAsistencia devuelve null cuando el alumno dejó de estar inscripto", async () => {
      transaccion.inscripcion_horarios.findFirst.mockResolvedValue(null);

      await expect(repositorio.buscarParaAsistencia(8, 5, DIA)).resolves.toBeNull();
    });

    it("contarInscriptosParaAsistencia devuelve vacío sin consultar y agrupa por fecha vigente", async () => {
      await expect(repositorio.contarInscriptosParaAsistencia([], DIA)).resolves.toEqual(new Map());
      expect(prisma.inscripcion_horarios.groupBy).not.toHaveBeenCalled();

      prisma.inscripcion_horarios.groupBy.mockResolvedValue([{ id_horario: 8, _count: { id_horario: 2 } }]);
      await expect(repositorio.contarInscriptosParaAsistencia([8, 9], DIA)).resolves.toEqual(
        new Map([[8, 2]]),
      );
      expect(prisma.inscripcion_horarios.groupBy).toHaveBeenCalledWith({
        by: ["id_horario"],
        where: { ...INSCRIPTOS_DEL_HORARIO_8, id_horario: { in: [8, 9] } },
        _count: { id_horario: true },
      });
    });

    it("contarLugaresOcupados cuenta por horario las activas y las pre-inscripciones con la reserva vigente", async () => {
      await expect(repositorio.contarLugaresOcupados([], RESERVAS)).resolves.toEqual(new Map());
      expect(prisma.inscripcion_horarios.groupBy).not.toHaveBeenCalled();

      prisma.inscripcion_horarios.groupBy.mockResolvedValue([{ id_horario: 8, _count: { id_horario: 2 } }]);

      await expect(repositorio.contarLugaresOcupados([8, 9], RESERVAS)).resolves.toEqual(new Map([[8, 2]]));
      expect(prisma.inscripcion_horarios.groupBy).toHaveBeenCalledWith({
        by: ["id_horario"],
        where: { id_horario: { in: [8, 9] }, fecha_hasta: null, inscripcion: OCUPAN_LUGAR },
        _count: { id_horario: true },
      });
    });
  });

  describe("crear", () => {
    it("bloquea alumno-plan y cada horario en orden antes de revisar duplicados y cupo", async () => {
      conCupoLibre([9, 8]);

      await expect(repositorio.crear(nueva, [9, 8], DIA, RESERVAS)).resolves.toMatchObject({
        resultado: "ok",
      });

      expect(clavesBloqueadas()).toEqual([
        "inscripcion-horario:8",
        "inscripcion-horario:9",
        "inscripcion-plan:5:1",
      ]);
      expect(transaccion.inscripciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: "PREINSCRIPTA",
            id_promocion: 4,
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

      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toEqual({
        resultado: "plan-duplicado",
      });
      expect(transaccion.inscripciones.create).not.toHaveBeenCalled();
    });

    it("para el cupo cuenta las activas y las pre-inscripciones con la reserva vigente", async () => {
      conCupoLibre();

      await repositorio.crear(nueva, [8], DIA, RESERVAS);

      expect(transaccion.inscripcion_horarios.groupBy.mock.calls[0][0].where.inscripcion).toEqual(
        OCUPAN_LUGAR,
      );
    });

    it("no crea si un horario está completo", async () => {
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);

      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toEqual({ resultado: "sin-cupo" });
    });

    it("el cupo propio del horario manda sobre el de la actividad, y sin cupo no hay límite", async () => {
      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: 1, actividad: { cupo_maximo: 10, activo: true } },
      ]);
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 1 } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toEqual({ resultado: "sin-cupo" });

      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: null, actividad: { cupo_maximo: null, activo: true } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toMatchObject({ resultado: "ok" });
    });

    it("sin cupo si un horario no existe, está de baja o su actividad está inactiva", async () => {
      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toEqual({ resultado: "sin-cupo" });

      transaccion.horarios.findMany.mockResolvedValue([
        { id_horario: 8, cupo_maximo: null, actividad: { cupo_maximo: 2, activo: false } },
      ]);
      await expect(repositorio.crear(nueva, [8], DIA, RESERVAS)).resolves.toEqual({ resultado: "sin-cupo" });
    });
  });

  describe("activar", () => {
    beforeEach(() => {
      prisma.inscripciones.findUnique.mockResolvedValue(actual);
    });

    it("pasa a ACTIVA revalidando el cupo sin contarse a sí misma", async () => {
      await expect(repositorio.activar(12, RESERVAS)).resolves.toMatchObject({ resultado: "ok" });

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
      await expect(repositorio.activar(12, RESERVAS)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripciones.findUnique.mockResolvedValueOnce({ estado: "BAJA" });
      await expect(repositorio.activar(12, RESERVAS)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripciones.findUnique.mockResolvedValueOnce(null);
      await expect(repositorio.activar(12, RESERVAS)).resolves.toEqual({ resultado: "no-vigente" });

      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);
      await expect(repositorio.activar(12, RESERVAS)).resolves.toEqual({ resultado: "sin-cupo" });
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
        data: { estado: "BAJA", motivo_baja: "MUDANZA", detalle_baja: null, fecha_baja: INSTANTE },
      });
      expect(transaccion.inscripcion_horarios.updateMany).toHaveBeenCalledWith({
        where: { id_inscripcion: { in: [12, 13] }, fecha_hasta: null },
        data: { fecha_hasta: DIA },
      });
    });

    it("guarda el detalle del motivo OTRO en todas las vigentes", async () => {
      transaccion.inscripciones.findMany.mockResolvedValue([
        { id_inscripcion: 12, horarios: [] },
        { id_inscripcion: 13, horarios: [] },
      ]);

      await repositorio.darDeBajaAlumno(
        5,
        { motivo_baja: "OTRO", detalle_baja: "Se pasó a un gimnasio más cerca" },
        { instante: INSTANTE, dia: DIA },
      );

      expect(transaccion.inscripciones.updateMany).toHaveBeenCalledWith({
        where: { id_inscripcion: { in: [12, 13] } },
        data: {
          estado: "BAJA",
          motivo_baja: "OTRO",
          detalle_baja: "Se pasó a un gimnasio más cerca",
          fecha_baja: INSTANTE,
        },
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

    it("crea una inscripción nueva en el estado pedido si hay cupo", async () => {
      await expect(repositorio.reactivar(reactivacion, [8], DIA, RESERVAS)).resolves.toMatchObject({
        resultado: "ok",
      });
      await repositorio.reactivar({ ...reactivacion, estado: "PREINSCRIPTA" }, [8], DIA, RESERVAS);

      expect(transaccion.inscripciones.create.mock.calls[0][0].data).toMatchObject({ estado: "ACTIVA" });
      expect(transaccion.inscripciones.create.mock.calls[1][0].data).toMatchObject({
        estado: "PREINSCRIPTA",
      });
    });

    it("devuelve la vigente que ya existía en lugar de crear otra", async () => {
      transaccion.inscripciones.findFirst.mockResolvedValue({ id_inscripcion: 12 });

      await expect(repositorio.reactivar(reactivacion, [8], DIA, RESERVAS)).resolves.toEqual({
        resultado: "ok",
        inscripcion: { id_inscripcion: 12 },
      });
      expect(transaccion.inscripciones.findFirst.mock.calls[0][0].where).toEqual({
        id_alumno: 5,
        estado: { in: ["PREINSCRIPTA", "ACTIVA"] },
      });
      expect(transaccion.inscripciones.create).not.toHaveBeenCalled();
    });

    it("no crea sin cupo", async () => {
      transaccion.inscripcion_horarios.groupBy.mockResolvedValue([
        { id_horario: 8, _count: { id_horario: 2 } },
      ]);

      await expect(repositorio.reactivar(reactivacion, [8], DIA, RESERVAS)).resolves.toEqual({
        resultado: "sin-cupo",
      });
    });
  });

  describe("cambiarPlan", () => {
    const cambio = { id_plan: 2, id_profesora: 3, ids_horarios: [9], sin_cargo: false };
    const fechas = { instante: INSTANTE, dia: DIA };
    // US-13: la inscripción nueva guarda la promoción vigente del plan nuevo.
    const PRECIO_NUEVO = { id_plan_precio: 16, id_promocion: 6 };

    it("da de baja la actual con CAMBIO_PLAN y crea la nueva con el mismo estado", async () => {
      conCupoLibre([9]);
      transaccion.inscripciones.findUnique.mockResolvedValue({ estado: "ACTIVA" });

      await expect(
        repositorio.cambiarPlan(actual, cambio, PRECIO_NUEVO, fechas, RESERVAS),
      ).resolves.toMatchObject({
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
        id_promocion: 6,
        estado: "ACTIVA",
        fecha_inicio: DIA,
        horarios: { create: [{ id_horario: 9, fecha_desde: DIA }] },
      });
    });

    it("una pre-inscripción conserva su fecha de inicio para no renovar la reserva de cupo", async () => {
      conCupoLibre([9]);
      const empezoAntes = new Date("2026-10-02T00:00:00Z");

      await repositorio.cambiarPlan(
        { ...actual, fecha_inicio: empezoAntes },
        cambio,
        PRECIO_NUEVO,
        fechas,
        RESERVAS,
      );

      expect(transaccion.inscripciones.create.mock.calls[0][0].data).toMatchObject({
        estado: "PREINSCRIPTA",
        fecha_inicio: empezoAntes,
        horarios: { create: [{ id_horario: 9, fecha_desde: DIA }] },
      });
    });

    it("no cambia si dejó de estar vigente, si el plan nuevo ya está vigente o si no hay cupo", async () => {
      transaccion.inscripciones.findUnique.mockResolvedValueOnce({ estado: "BAJA" });
      await expect(repositorio.cambiarPlan(actual, cambio, PRECIO_NUEVO, fechas, RESERVAS)).resolves.toEqual({
        resultado: "no-vigente",
      });

      transaccion.inscripciones.findFirst.mockResolvedValueOnce({ id_inscripcion: 30 });
      await expect(repositorio.cambiarPlan(actual, cambio, PRECIO_NUEVO, fechas, RESERVAS)).resolves.toEqual({
        resultado: "plan-duplicado",
      });

      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(repositorio.cambiarPlan(actual, cambio, PRECIO_NUEVO, fechas, RESERVAS)).resolves.toEqual({
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
        repositorio.actualizarHorarios(actual, { ids_horarios: [6, 9] }, DIA, RESERVAS),
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
      await expect(
        repositorio.actualizarHorarios(actual, { ids_horarios: [9] }, DIA, RESERVAS),
      ).resolves.toEqual({
        resultado: "no-vigente",
      });

      transaccion.horarios.findMany.mockResolvedValue([]);
      await expect(
        repositorio.actualizarHorarios(actual, { ids_horarios: [9] }, DIA, RESERVAS),
      ).resolves.toEqual({
        resultado: "sin-cupo",
      });
      expect(transaccion.inscripcion_horarios.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("contarActivasPorPlan", () => {
    it("agrupa y cuenta inscripciones activas por plan con filtros opcionales", async () => {
      prisma.inscripciones.groupBy.mockResolvedValue([
        { id_plan: 1, _count: { id_inscripcion: 5 } },
        { id_plan: 2, _count: { id_inscripcion: 8 } },
      ]);

      const resultado = await repositorio.contarActivasPorPlan({
        id_profesora: 3,
        id_actividad: 2,
      });

      expect(resultado).toEqual(
        new Map([
          [1, 5],
          [2, 8],
        ]),
      );
      expect(prisma.inscripciones.groupBy).toHaveBeenCalledWith({
        by: ["id_plan"],
        where: {
          estado: "ACTIVA",
          alumno: { estado: { not: "BAJA" } },
          id_profesora: 3,
          plan: { id_actividad_exclusiva: 2 },
        },
        _count: { id_inscripcion: true },
      });
    });

    it("agrupa y cuenta sin filtros opcionales", async () => {
      prisma.inscripciones.groupBy.mockResolvedValue([{ id_plan: 1, _count: { id_inscripcion: 3 } }]);

      const resultado = await repositorio.contarActivasPorPlan();

      expect(resultado).toEqual(new Map([[1, 3]]));
      expect(prisma.inscripciones.groupBy).toHaveBeenCalledWith({
        by: ["id_plan"],
        where: {
          estado: "ACTIVA",
          alumno: { estado: { not: "BAJA" } },
        },
        _count: { id_inscripcion: true },
      });
    });
  });

  describe("contarBajasPorMotivo", () => {
    const inicio = new Date("2026-01-01T03:00:00Z");
    const fin = new Date("2027-01-01T03:00:00Z");

    it("agrupa las bajas del período por motivo, de más a menos, con el plan y la profesora", async () => {
      prisma.inscripciones.groupBy.mockResolvedValue([
        { motivo_baja: "MUDANZA", _count: { id_inscripcion: 1 } },
        { motivo_baja: "ABANDONO", _count: { id_inscripcion: 4 } },
        { motivo_baja: null, _count: { id_inscripcion: 2 } },
      ]);

      const resultado = await repositorio.contarBajasPorMotivo({ inicio, fin, id_plan: 2, id_profesora: 3 });

      expect(resultado).toEqual([
        { motivo: "ABANDONO", cantidad: 4 },
        { motivo: null, cantidad: 2 },
        { motivo: "MUDANZA", cantidad: 1 },
      ]);
      expect(prisma.inscripciones.groupBy).toHaveBeenCalledWith({
        by: ["motivo_baja"],
        where: { estado: "BAJA", fecha_baja: { gte: inicio, lt: fin }, id_plan: 2, id_profesora: 3 },
        _count: { id_inscripcion: true },
      });
    });

    it("sin plan ni profesora cuenta todas las bajas del período", async () => {
      prisma.inscripciones.groupBy.mockResolvedValue([]);

      expect(await repositorio.contarBajasPorMotivo({ inicio, fin })).toEqual([]);
      expect(prisma.inscripciones.groupBy).toHaveBeenCalledWith({
        by: ["motivo_baja"],
        where: { estado: "BAJA", fecha_baja: { gte: inicio, lt: fin } },
        _count: { id_inscripcion: true },
      });
    });
  });
});
