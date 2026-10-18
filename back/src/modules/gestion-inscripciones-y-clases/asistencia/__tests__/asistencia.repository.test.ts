import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AsistenciaRepository } from "../asistencia.repository.js";

const FECHA = new Date("2026-10-12T21:00:00Z");
const marca = { idClase: 20, idUsuario: 2, fechaRegistro: FECHA };
const ana = { id_alumno: 5, id_inscripcion: 50, alumno: { usuario: { nombre: "Ana", apellido: "Paz" } } };
const beto = { id_alumno: 6, id_inscripcion: 60, alumno: { usuario: { nombre: "Beto", apellido: "Sosa" } } };

function crearPrismaMock() {
  return {
    asistencias: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      count: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    seguimientos_inactividad: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
}

describe("AsistenciaRepository", () => {
  let prisma: ReturnType<typeof crearPrismaMock>;
  let repositorio: AsistenciaRepository;

  beforeEach(() => {
    prisma = crearPrismaMock();
    repositorio = new AsistenciaRepository(prisma as unknown as PrismaClient);
  });

  it("listarDeClase trae las asistencias de la clase", async () => {
    await repositorio.listarDeClase(20);

    expect(prisma.asistencias.findMany).toHaveBeenCalledWith({
      where: { id_clase: 20 },
      orderBy: { id_alumno: "asc" },
    });
  });

  it("marcar crea o pisa la fila del alumno en la clase con quién y cuándo, sin tocar las observaciones", async () => {
    await repositorio.marcar(ana, { asistio: false }, marca);

    const registro = { id_inscripcion: 50, asistio: false, id_usuario_registra: 2, fecha_registro: FECHA };
    expect(prisma.asistencias.upsert).toHaveBeenCalledWith({
      where: { id_clase_id_alumno: { id_clase: 20, id_alumno: 5 } },
      create: { id_clase: 20, id_alumno: 5, ...registro },
      update: registro,
    });
  });

  it.each([
    ["las guarda", "Llegó tarde"],
    ["las borra con null", null],
  ])("marcar con observaciones %s", async (_caso, observaciones) => {
    await repositorio.marcar(ana, { asistio: true, observaciones }, marca);

    const registro = {
      id_inscripcion: 50,
      asistio: true,
      id_usuario_registra: 2,
      fecha_registro: FECHA,
      observaciones,
    };
    expect(prisma.asistencias.upsert).toHaveBeenCalledWith({
      where: { id_clase_id_alumno: { id_clase: 20, id_alumno: 5 } },
      create: { id_clase: 20, id_alumno: 5, ...registro },
      update: registro,
    });
  });

  it("marcarPresentes pisa a los ya marcados y crea a los que faltan, sin una consulta por alumno", async () => {
    await repositorio.marcarPresentes([ana, beto], marca);

    const registro = { asistio: true, id_usuario_registra: 2, fecha_registro: FECHA };
    expect(prisma.asistencias.updateMany).toHaveBeenCalledWith({
      where: { id_clase: 20, id_alumno: { in: [5, 6] } },
      data: registro,
    });
    expect(prisma.asistencias.createMany).toHaveBeenCalledWith({
      data: [
        { id_clase: 20, id_alumno: 5, id_inscripcion: 50, ...registro },
        { id_clase: 20, id_alumno: 6, id_inscripcion: 60, ...registro },
      ],
      skipDuplicates: true,
    });
  });

  it("marcarPresentes no consulta la base sin inscriptos", async () => {
    await repositorio.marcarPresentes([], marca);

    expect(prisma.asistencias.updateMany).not.toHaveBeenCalled();
    expect(prisma.asistencias.createMany).not.toHaveBeenCalled();
  });

  it("tieneMarcasManuales cuenta solo las filas que registró una persona", async () => {
    prisma.asistencias.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    await expect(repositorio.tieneMarcasManuales(20)).resolves.toBe(false);
    await expect(repositorio.tieneMarcasManuales(20)).resolves.toBe(true);
    expect(prisma.asistencias.count).toHaveBeenCalledWith({
      where: { id_clase: 20, id_usuario_registra: { not: null } },
    });
  });

  it("completarAusentes crea ausentes sin usuario y deja intactos a los ya marcados", async () => {
    await expect(repositorio.completarAusentes(20, [ana, beto], FECHA)).resolves.toBe(2);

    const ausente = { id_clase: 20, asistio: false, id_usuario_registra: null, fecha_registro: FECHA };
    expect(prisma.asistencias.createMany).toHaveBeenCalledWith({
      data: [
        { ...ausente, id_alumno: 5, id_inscripcion: 50 },
        { ...ausente, id_alumno: 6, id_inscripcion: 60 },
      ],
      skipDuplicates: true,
    });
  });

  it("completarAusentes no consulta la base sin inscriptos", async () => {
    await expect(repositorio.completarAusentes(20, [], FECHA)).resolves.toBe(0);
    expect(prisma.asistencias.createMany).not.toHaveBeenCalled();
  });

  describe("detección de inactivos (US-22)", () => {
    const MARCA = new Date("2026-10-15T12:00:00Z");

    function sqlDeLaConsulta(): Prisma.Sql {
      const [partes, ...valores] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      return Prisma.sql(partes, ...valores);
    }

    it("rachasDeInasistencia cuenta de una sola consulta, solo en clases cerradas, y devuelve un mapa por inscripción", async () => {
      const ultima = new Date("2026-10-06T00:00:00Z");
      prisma.$queryRaw.mockResolvedValue([
        { id_inscripcion: 50, inasistencias_consecutivas: 3, fecha_ultima_asistencia: ultima },
        { id_inscripcion: 60, inasistencias_consecutivas: 0, fecha_ultima_asistencia: null },
      ]);

      await expect(repositorio.rachasDeInasistencia([50, 60])).resolves.toEqual(
        new Map([
          [50, { inasistencias_consecutivas: 3, fecha_ultima_asistencia: ultima }],
          [60, { inasistencias_consecutivas: 0, fecha_ultima_asistencia: null }],
        ]),
      );
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sql = sqlDeLaConsulta();
      expect(sql.values).toEqual([50, 60]);
      expect(sql.sql).toContain("c.estado = 'DICTADA'");
    });

    it("rachasDeInasistencia no consulta la base sin inscripciones", async () => {
      await expect(repositorio.rachasDeInasistencia([])).resolves.toEqual(new Map());
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("buscarSeguimientos trae la marca de cada inscripción", async () => {
      prisma.seguimientos_inactividad.findMany.mockResolvedValue([
        { id_inscripcion: 50, estado: "CONTACTADO", fecha_registro: MARCA },
      ]);

      await expect(repositorio.buscarSeguimientos([50, 60])).resolves.toEqual(
        new Map([[50, { estado: "CONTACTADO", fecha_registro: MARCA }]]),
      );
      expect(prisma.seguimientos_inactividad.findMany).toHaveBeenCalledWith({
        where: { id_inscripcion: { in: [50, 60] } },
        select: { id_inscripcion: true, estado: true, fecha_registro: true },
      });
    });

    it("ultimasPresenciasRegistradas agrupa las presencias por inscripción", async () => {
      prisma.asistencias.groupBy.mockResolvedValue([
        { id_inscripcion: 50, _max: { fecha_registro: MARCA } },
        { id_inscripcion: 60, _max: { fecha_registro: null } },
      ]);

      await expect(repositorio.ultimasPresenciasRegistradas([50, 60])).resolves.toEqual(
        new Map([[50, MARCA]]),
      );
      expect(prisma.asistencias.groupBy).toHaveBeenCalledWith({
        by: ["id_inscripcion"],
        where: { id_inscripcion: { in: [50, 60] }, asistio: true },
        _max: { fecha_registro: true },
      });
    });

    it("registrarSeguimiento crea o pisa la marca de la inscripción con quién y cuándo", async () => {
      await repositorio.registrarSeguimiento(50, "IGNORADO", 1, MARCA);

      const marca = { estado: "IGNORADO", id_usuario_registra: 1, fecha_registro: MARCA };
      expect(prisma.seguimientos_inactividad.upsert).toHaveBeenCalledWith({
        where: { id_inscripcion: 50 },
        create: { id_inscripcion: 50, ...marca },
        update: marca,
      });
    });

    it("quitarSeguimiento informa si había una marca", async () => {
      await expect(repositorio.quitarSeguimiento(50)).resolves.toBe(true);
      expect(prisma.seguimientos_inactividad.deleteMany).toHaveBeenCalledWith({
        where: { id_inscripcion: 50 },
      });

      prisma.seguimientos_inactividad.deleteMany.mockResolvedValue({ count: 0 });
      await expect(repositorio.quitarSeguimiento(50)).resolves.toBe(false);
    });
  });
});
