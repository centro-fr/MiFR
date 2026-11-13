import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsuarioRepository } from "../usuario.repository.js";

const prisma = {
  usuarios: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  usuario_roles: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
};

// Todas las consultas traen los roles con su fila de la tabla roles (usuario_roles -> roles).
const CON_ROLES = { include: { roles: { include: { rol: true } } } };

describe("UsuarioRepository", () => {
  let repositorio: UsuarioRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new UsuarioRepository(prisma as unknown as PrismaClient);
  });

  it("buscarPorId busca por id_usuario numérico e incluye los roles", async () => {
    await repositorio.buscarPorId(1);

    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({ where: { id_usuario: 1 }, ...CON_ROLES });
  });

  it("buscarPorGoogleId busca por google_id", async () => {
    await repositorio.buscarPorGoogleId("google-123");

    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({
      where: { google_id: "google-123" },
      ...CON_ROLES,
    });
  });

  it("buscarPorEmail busca por email", async () => {
    await repositorio.buscarPorEmail("ana@example.com");

    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({
      where: { email: "ana@example.com" },
      ...CON_ROLES,
    });
  });

  it("buscarPorDni busca por dni", async () => {
    await repositorio.buscarPorDni("40123456");

    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({ where: { dni: "40123456" }, ...CON_ROLES });
  });

  describe("buscarPorEmailOGoogleId", () => {
    it("busca por email o google_id cuando vienen los dos", async () => {
      await repositorio.buscarPorEmailOGoogleId("ana@example.com", "google-123");

      expect(prisma.usuarios.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: "ana@example.com" }, { google_id: "google-123" }] },
        ...CON_ROLES,
      });
    });

    it("busca solo por email si no viene google_id", async () => {
      await repositorio.buscarPorEmailOGoogleId("ana@example.com");

      expect(prisma.usuarios.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: "ana@example.com" }] },
        ...CON_ROLES,
      });
    });

    it("busca solo por google_id si no viene email", async () => {
      await repositorio.buscarPorEmailOGoogleId(undefined, "google-123");

      expect(prisma.usuarios.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ google_id: "google-123" }] },
        ...CON_ROLES,
      });
    });

    it("devuelve null sin consultar si no viene ninguno (menor sin email)", async () => {
      await expect(repositorio.buscarPorEmailOGoogleId()).resolves.toBeNull();
      expect(prisma.usuarios.findFirst).not.toHaveBeenCalled();
    });
  });

  it("listar ordena por fecha_alta descendente", async () => {
    await repositorio.listar();

    expect(prisma.usuarios.findMany).toHaveBeenCalledWith({ orderBy: { fecha_alta: "desc" }, ...CON_ROLES });
  });

  it("crear pasa los datos tal cual a Prisma", async () => {
    const datos = { nombre: "Ana", apellido: "Perez", fecha_nacimiento: new Date("1990-01-01") };

    await repositorio.crear(datos);

    expect(prisma.usuarios.create).toHaveBeenCalledWith({ data: datos, ...CON_ROLES });
  });

  it("actualizar actualiza por id_usuario", async () => {
    await repositorio.actualizar(1, { nombre: "Nueva" });

    expect(prisma.usuarios.update).toHaveBeenCalledWith({
      where: { id_usuario: 1 },
      data: { nombre: "Nueva" },
      ...CON_ROLES,
    });
  });

  it("vincularGoogleId guarda solo el google_id y solo si la cuenta no tenía uno", async () => {
    prisma.usuarios.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuarios.findUnique.mockResolvedValue({ id_usuario: 1 });

    await expect(repositorio.vincularGoogleId(1, "google-123")).resolves.toEqual({ id_usuario: 1 });
    expect(prisma.usuarios.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: 1, google_id: null },
      data: { google_id: "google-123" },
    });
    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({ where: { id_usuario: 1 }, ...CON_ROLES });
  });

  it("vincularGoogleId devuelve null sin releer si la cuenta ya estaba vinculada", async () => {
    prisma.usuarios.updateMany.mockResolvedValue({ count: 0 });

    await expect(repositorio.vincularGoogleId(1, "google-123")).resolves.toBeNull();
    expect(prisma.usuarios.findUnique).not.toHaveBeenCalled();
  });

  it("actualizarFoto guarda la foto y devuelve el usuario con sus roles", async () => {
    const foto = "https://lh3.googleusercontent.com/a/foto=s96-c";
    const actualizado = { id_usuario: 1, foto_url: foto, roles: [] };
    prisma.usuarios.update.mockResolvedValue(actualizado);

    await expect(repositorio.actualizarFoto(1, foto)).resolves.toEqual(actualizado);
    expect(prisma.usuarios.update).toHaveBeenCalledWith({
      where: { id_usuario: 1 },
      data: { foto_url: foto },
      ...CON_ROLES,
    });
  });

  it("contarPropietariasActivas cuenta usuarios ACTIVOS con el rol PROPIETARIA", async () => {
    prisma.usuarios.count.mockResolvedValue(2);

    await expect(repositorio.contarPropietariasActivas()).resolves.toBe(2);
    expect(prisma.usuarios.count).toHaveBeenCalledWith({
      where: { estado: "ACTIVO", roles: { some: { rol: { codigo: "PROPIETARIA" } } } },
    });
  });

  it("listarPropietariasActivas lista usuarios ACTIVOS con el rol PROPIETARIA e incluye roles", async () => {
    const lista = [{ id_usuario: 1, roles: [] }];
    prisma.usuarios.findMany.mockResolvedValue(lista);

    await expect(repositorio.listarPropietariasActivas()).resolves.toEqual(lista);
    expect(prisma.usuarios.findMany).toHaveBeenCalledWith({
      where: { estado: "ACTIVO", roles: { some: { rol: { codigo: "PROPIETARIA" } } } },
      ...CON_ROLES,
    });
  });

  it("eliminar borra primero sus usuario_roles y después el usuario, en una transacción (FK NO ACTION)", async () => {
    vi.mocked(prisma.usuario_roles.deleteMany).mockReturnValue("borrar-roles" as never);
    vi.mocked(prisma.usuarios.delete).mockReturnValue("borrar-usuario" as never);

    await repositorio.eliminar(1);

    expect(prisma.usuario_roles.deleteMany).toHaveBeenCalledWith({ where: { id_usuario: 1 } });
    expect(prisma.usuarios.delete).toHaveBeenCalledWith({ where: { id_usuario: 1 } });
    expect(prisma.$transaction).toHaveBeenCalledWith(["borrar-roles", "borrar-usuario"]);
  });

  it("eliminar devuelve true si borró el usuario", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await expect(repositorio.eliminar(1)).resolves.toBe(true);
  });

  it("eliminar devuelve false si otra tabla todavía referencia al usuario (P2003)", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "test" }),
    );

    await expect(repositorio.eliminar(1)).resolves.toBe(false);
  });

  it("eliminar propaga cualquier otro error de la base", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("conexión caída"));

    await expect(repositorio.eliminar(1)).rejects.toThrow("conexión caída");
  });
});
