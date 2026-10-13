import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlumnoRepository } from "../alumno.repository.js";
import type { Alumno } from "../alumno.types.js";

const transaccion = {
  usuarios: { create: vi.fn() },
  alumnos: { create: vi.fn(), update: vi.fn() },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: unknown) => unknown) => operacion(prismaDentroDeTransaccion())),
  $queryRaw: vi.fn(),
  alumnos: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};

const actualizarEnTransaccion = {
  usuarios: { updateMany: vi.fn() },
};

function prismaDentroDeTransaccion() {
  return {
    usuarios: { ...transaccion.usuarios, ...actualizarEnTransaccion.usuarios },
    alumnos: transaccion.alumnos,
  };
}

const DATOS_PERSONALES = {
  id_usuario: true,
  nombre: true,
  apellido: true,
  dni: true,
  email: true,
  telefono: true,
  fecha_nacimiento: true,
  direccion: true,
  estado: true,
};
const CON_DATOS = { usuario: { select: DATOS_PERSONALES }, responsable: { select: DATOS_PERSONALES } };

const usuarioNuevo = {
  nombre: "Tomás",
  apellido: "Pérez",
  fecha_nacimiento: new Date("2014-05-10T00:00:00Z"),
};
const tutorNuevo = {
  nombre: "Laura",
  apellido: "Pérez",
  telefono: "3794 112233",
  email: "laura@example.com",
  fecha_nacimiento: new Date("1985-03-02T00:00:00Z"),
};

function sqlDeLaLlamada(numero: number): Prisma.Sql {
  const [partes, ...valores] = prisma.$queryRaw.mock.calls[numero] as [TemplateStringsArray, ...unknown[]];
  return Prisma.sql(partes, ...valores);
}

describe("AlumnoRepository", () => {
  let repositorio: AlumnoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new AlumnoRepository(prisma as unknown as PrismaClient);
  });

  describe("crear", () => {
    it("crea el usuario del alumno y el alumno, los dos INACTIVO, sin tutor", async () => {
      await repositorio.crear(usuarioNuevo, { apto_medico: false }, null);

      expect(transaccion.usuarios.create).not.toHaveBeenCalled();
      expect(transaccion.alumnos.create).toHaveBeenCalledWith({
        data: {
          apto_medico: false,
          estado: "INACTIVO",
          responsable: undefined,
          usuario: { create: { ...usuarioNuevo, estado: "INACTIVO" } },
        },
        include: CON_DATOS,
      });
    });

    it("da de alta al tutor nuevo como usuario INACTIVO en la misma transacción", async () => {
      transaccion.usuarios.create.mockResolvedValue({ id_usuario: 20 });

      await repositorio.crear(usuarioNuevo, {}, { nuevo: tutorNuevo });

      expect(transaccion.usuarios.create).toHaveBeenCalledWith({
        data: { ...tutorNuevo, estado: "INACTIVO" },
      });
      expect(transaccion.alumnos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ responsable: { connect: { id_usuario: 20 } } }),
        }),
      );
    });

    it("conecta un tutor que ya existía sin crearlo", async () => {
      await repositorio.crear(usuarioNuevo, {}, { id_usuario: 21 });

      expect(transaccion.usuarios.create).not.toHaveBeenCalled();
      expect(transaccion.alumnos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ responsable: { connect: { id_usuario: 21 } } }),
        }),
      );
    });
  });

  it("buscarPorId, buscarPorIdUsuario y buscarPorIds traen los datos personales", async () => {
    await repositorio.buscarPorId(1);
    await repositorio.buscarPorIdUsuario(10);
    await repositorio.buscarPorIds([1, 2]);

    expect(prisma.alumnos.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id_alumno: 1 },
      include: CON_DATOS,
    });
    expect(prisma.alumnos.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id_usuario: 10 },
      include: CON_DATOS,
    });
    expect(prisma.alumnos.findMany).toHaveBeenCalledWith({
      where: { id_alumno: { in: [1, 2] } },
      include: CON_DATOS,
    });
  });

  describe("listar", () => {
    it("devuelve la página en el orden del SQL y el total", async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ id_alumno: 2 }, { id_alumno: 1 }])
        .mockResolvedValueOnce([{ total: 2n }]);
      prisma.alumnos.findMany.mockResolvedValue([{ id_alumno: 1 }, { id_alumno: 2 }]);

      const resultado = await repositorio.listar({ limit: 20, offset: 0 });

      expect(resultado).toEqual({ datos: [{ id_alumno: 2 }, { id_alumno: 1 }], total: 2 });
      const pagina = sqlDeLaLlamada(0);
      expect(pagina.text).toContain("a.estado <> 'BAJA'");
      expect(pagina.values).toEqual([20, 0]);
    });

    it("no consulta las filas si la página está vacía", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await expect(repositorio.listar({ limit: 20, offset: 40 })).resolves.toEqual({ datos: [], total: 0 });
      expect(prisma.alumnos.findMany).not.toHaveBeenCalled();
    });

    it("combina el estado, el DNI y la búsqueda sin acentos, con los comodines escapados", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await repositorio.listar({ estado: "BAJA", dni: "40111222", busqueda: "100%_pe", limit: 5, offset: 0 });

      const total = sqlDeLaLlamada(1);
      expect(total.text).toContain("a.estado = $1::estado_alumno");
      expect(total.text).toContain("u.dni = $2");
      expect(total.text).toContain(
        "unaccent(concat_ws(' ', u.nombre, u.apellido, r.nombre, r.apellido)) ILIKE unaccent($3)",
      );
      expect(total.text).not.toContain("<> 'BAJA'");
      expect(total.values).toEqual(["BAJA", "40111222", "%100\\%\\_pe%"]);
    });

    it("restringe a los ids que salen de los filtros por inscripción", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await repositorio.listar({ ids: [4, 9], limit: 20, offset: 0 });

      const total = sqlDeLaLlamada(1);
      expect(total.text).toContain("a.id_alumno = ANY($1)");
      expect(total.values).toEqual([[4, 9]]);
    });

    it("con incluirBajas no filtra por estado", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await repositorio.listar({ incluirBajas: true, limit: 20, offset: 0 });

      expect(sqlDeLaLlamada(1).text).not.toContain("WHERE");
    });
  });

  describe("listarIds", () => {
    it("devuelve los ids en el orden del listado, con los mismos filtros y hasta el tope", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ id_alumno: 7 }, { id_alumno: 3 }]);

      await expect(repositorio.listarIds({ busqueda: "pe", ids: [3, 7] }, 501)).resolves.toEqual([7, 3]);

      const consulta = sqlDeLaLlamada(0);
      expect(consulta.text).toContain("a.estado <> 'BAJA'");
      expect(consulta.text).toContain("a.id_alumno = ANY($1)");
      expect(consulta.text).toContain("ORDER BY u.apellido, u.nombre, a.id_alumno");
      expect(consulta.values).toEqual([[3, 7], "%pe%", 501, 0]);
      expect(prisma.alumnos.findMany).not.toHaveBeenCalled();
    });
  });

  describe("actualizar", () => {
    it("actualiza ficha y usuario sin tocar el tutor si no viene", async () => {
      await repositorio.actualizar(1, { telefono: "3794 445566" }, { observaciones: "Nota" }, undefined);

      expect(transaccion.alumnos.update).toHaveBeenCalledWith({
        where: { id_alumno: 1 },
        data: {
          observaciones: "Nota",
          responsable: undefined,
          usuario: { update: { telefono: "3794 445566" } },
        },
        include: CON_DATOS,
      });
    });

    it("quita el tutor con null y conecta uno nuevo creándolo antes", async () => {
      transaccion.usuarios.create.mockResolvedValue({ id_usuario: 30 });

      await repositorio.actualizar(1, {}, {}, null);
      await repositorio.actualizar(1, {}, {}, { nuevo: tutorNuevo });

      expect(transaccion.alumnos.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ responsable: { disconnect: true } }) }),
      );
      expect(transaccion.alumnos.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ responsable: { connect: { id_usuario: 30 } } }),
        }),
      );
    });
  });

  describe("cambios de estado", () => {
    const alumno = { id_alumno: 1, id_usuario: 10, id_usuario_responsable: null } as Alumno;

    it("activar pone en ACTIVO al alumno, a su usuario y al de su tutor", async () => {
      await repositorio.activar({ ...alumno, id_usuario_responsable: 20 });

      expect(actualizarEnTransaccion.usuarios.updateMany).toHaveBeenCalledWith({
        where: { id_usuario: { in: [10, 20] } },
        data: { estado: "ACTIVO" },
      });
      expect(transaccion.alumnos.update).toHaveBeenCalledWith({
        where: { id_alumno: 1 },
        data: { estado: "ACTIVO" },
        include: CON_DATOS,
      });
    });

    it("activar sin tutor solo activa al usuario del alumno", async () => {
      await repositorio.activar(alumno);

      expect(actualizarEnTransaccion.usuarios.updateMany).toHaveBeenCalledWith({
        where: { id_usuario: { in: [10] } },
        data: { estado: "ACTIVO" },
      });
    });

    it("darDeBaja marca la baja e inactiva el usuario; reactivar deja a los dos en el estado pedido", async () => {
      await repositorio.darDeBaja(alumno);
      await repositorio.reactivar(alumno, "ACTIVO");
      await repositorio.reactivar(alumno, "INACTIVO");

      expect(prisma.alumnos.update).toHaveBeenNthCalledWith(1, {
        where: { id_alumno: 1 },
        data: { estado: "BAJA", fecha_baja: expect.any(Date), usuario: { update: { estado: "INACTIVO" } } },
        include: CON_DATOS,
      });
      expect(prisma.alumnos.update).toHaveBeenNthCalledWith(2, {
        where: { id_alumno: 1 },
        data: { estado: "ACTIVO", fecha_baja: null, usuario: { update: { estado: "ACTIVO" } } },
        include: CON_DATOS,
      });
      expect(prisma.alumnos.update).toHaveBeenNthCalledWith(3, {
        where: { id_alumno: 1 },
        data: { estado: "INACTIVO", fecha_baja: null, usuario: { update: { estado: "INACTIVO" } } },
        include: CON_DATOS,
      });
    });
  });
});
