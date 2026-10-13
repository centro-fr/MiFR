import type { PrismaClient } from "@prisma/client";
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
    },
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
});
