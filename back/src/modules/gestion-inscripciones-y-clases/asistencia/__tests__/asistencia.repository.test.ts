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

  describe("resúmenes para el ranking y los informes (US-30, US-31, US-33)", () => {
    const DESDE = new Date("2026-10-01T00:00:00Z");
    const HASTA = new Date("2026-10-31T00:00:00Z");

    function sqlDeLaConsulta(): Prisma.Sql {
      const [partes, ...valores] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      return Prisma.sql(partes, ...valores);
    }

    it("resumirPorAlumno cuenta solo clases dictadas del período y deja afuera a los dados de baja", async () => {
      const fila = { id_alumno: 5, clases_previstas: 4, clases_asistidas: 3 };
      prisma.$queryRaw.mockResolvedValue([fila]);

      await expect(repositorio.resumirPorAlumno({ desde: DESDE, hasta: HASTA })).resolves.toEqual([fila]);
      const sql = sqlDeLaConsulta();
      expect(sql.values).toEqual([DESDE, HASTA]);
      expect(sql.sql).toContain("c.estado = 'DICTADA'");
      expect(sql.sql).toContain("al.estado <> 'BAJA'");
      expect(sql.sql).toContain("JOIN usuarios u ON u.id_usuario = al.id_usuario");
    });

    it("resumirPorAlumno combina los filtros de alumno, profesora dictante y actividad, e incluye bajas si se pide", async () => {
      await repositorio.resumirPorAlumno({
        desde: DESDE,
        hasta: HASTA,
        id_alumno: 5,
        id_profesora: 2,
        id_actividad: 3,
        incluir_bajas: true,
      });

      const sql = sqlDeLaConsulta();
      expect(sql.values).toEqual([DESDE, HASTA, 5, 2, 3]);
      expect(sql.sql).toContain("a.id_alumno = ");
      expect(sql.sql).toContain("c.id_prof_dictante = ");
      expect(sql.sql).toContain("h.id_actividad = ");
      expect(sql.sql).not.toContain("al.estado <> 'BAJA'");
    });

    it("resumirPorProfesora agrupa por la profesora que dictó la clase", async () => {
      await repositorio.resumirPorProfesora({ desde: DESDE, hasta: HASTA, id_actividad: 3 });

      const sql = sqlDeLaConsulta();
      expect(sql.values).toEqual([DESDE, HASTA, 3]);
      expect(sql.sql).toContain("JOIN profesoras p ON p.id_profesora = c.id_prof_dictante");
      expect(sql.sql).toContain("COUNT(DISTINCT c.id_clase)");
    });

    it("historialDeAlumnos trae de una sola consulta las marcas de clases dictadas, en orden y con el inicio de la clase", async () => {
      const dia = new Date("2026-10-12T00:00:00Z");
      const hora = new Date("1970-01-01T18:30:00Z");
      prisma.asistencias.findMany.mockResolvedValue([
        { id_alumno: 5, asistio: true, clase: { fecha_clase: dia, horario: { hora_inicio: hora } } },
        { id_alumno: 6, asistio: false, clase: { fecha_clase: dia, horario: { hora_inicio: hora } } },
      ]);

      await expect(repositorio.historialDeAlumnos([5, 6, 7])).resolves.toEqual(
        new Map([
          [5, [{ asistio: true, inicio: new Date("2026-10-12T21:30:00Z") }]],
          [6, [{ asistio: false, inicio: new Date("2026-10-12T21:30:00Z") }]],
          [7, []],
        ]),
      );
      expect(prisma.asistencias.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_alumno: { in: [5, 6, 7] }, clase: { estado: "DICTADA" } },
          orderBy: [{ clase: { fecha_clase: "asc" } }, { clase: { horario: { hora_inicio: "asc" } } }],
        }),
      );
    });

    it("historialDeAlumnos no consulta la base sin alumnos", async () => {
      await expect(repositorio.historialDeAlumnos([])).resolves.toEqual(new Map());
      expect(prisma.asistencias.findMany).not.toHaveBeenCalled();
    });
  });
});
