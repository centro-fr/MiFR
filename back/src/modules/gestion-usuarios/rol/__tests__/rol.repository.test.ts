import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolRepository } from "../rol.repository.js";

const prisma = {
  roles: { findUnique: vi.fn(), findMany: vi.fn() },
  usuario_roles: { create: vi.fn(), delete: vi.fn() },
  permisos: { findMany: vi.fn() },
  rol_permisos: {
    count: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn().mockReturnValue("otorgar"),
    deleteMany: vi.fn().mockReturnValue("quitar"),
  },
  $transaction: vi.fn(),
};

describe("RolRepository", () => {
  let repositorio: RolRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new RolRepository(prisma as unknown as PrismaClient);
  });

  it("buscarRolPorCodigo busca en la tabla roles por codigo", async () => {
    const rol = { id_rol: 1, codigo: "PROPIETARIA" as const, nombre: "Propietaria", descripcion: null };
    vi.mocked(prisma.roles.findUnique).mockResolvedValue(rol);

    await expect(repositorio.buscarRolPorCodigo("PROPIETARIA")).resolves.toEqual(rol);
    expect(prisma.roles.findUnique).toHaveBeenCalledWith({ where: { codigo: "PROPIETARIA" } });
  });

  it("buscarRolPorCodigo devuelve null si el rol no está cargado", async () => {
    vi.mocked(prisma.roles.findUnique).mockResolvedValue(null);

    await expect(repositorio.buscarRolPorCodigo("TUTOR")).resolves.toBeNull();
  });

  it("asignarRol crea la fila de usuario_roles con id_usuario e id_rol", async () => {
    await repositorio.asignarRol(1, 3);

    expect(prisma.usuario_roles.create).toHaveBeenCalledWith({ data: { id_usuario: 1, id_rol: 3 } });
  });

  it("quitarRol borra la fila de usuario_roles por su PK compuesta", async () => {
    await repositorio.quitarRol(1, 3);

    expect(prisma.usuario_roles.delete).toHaveBeenCalledWith({
      where: { id_usuario_id_rol: { id_usuario: 1, id_rol: 3 } },
    });
  });

  it("contarRolesDeUsuarioConPermiso cuenta en rol_permisos los roles del usuario que otorgan el permiso", async () => {
    vi.mocked(prisma.rol_permisos.count).mockResolvedValue(2);

    await expect(repositorio.contarRolesDeUsuarioConPermiso(1, "PAGOS_CONFIRMAR")).resolves.toBe(2);
    expect(prisma.rol_permisos.count).toHaveBeenCalledWith({
      where: { permiso: { codigo: "PAGOS_CONFIRMAR" }, rol: { usuarios: { some: { id_usuario: 1 } } } },
    });
  });

  it("listarCodigosPermisoDeUsuario devuelve solo los códigos de los permisos de sus roles", async () => {
    vi.mocked(prisma.permisos.findMany).mockResolvedValue([
      { codigo: "ACTIVIDADES_VER" },
      { codigo: "HORARIOS_VER" },
    ] as never);

    await expect(repositorio.listarCodigosPermisoDeUsuario(1)).resolves.toEqual([
      "ACTIVIDADES_VER",
      "HORARIOS_VER",
    ]);
    expect(prisma.permisos.findMany).toHaveBeenCalledWith({
      where: { roles: { some: { rol: { usuarios: { some: { id_usuario: 1 } } } } } },
      select: { codigo: true },
      orderBy: { codigo: "asc" },
    });
  });

  it("listarPermisos ordena por módulo y código para armar la matriz", async () => {
    vi.mocked(prisma.permisos.findMany).mockResolvedValue([]);

    await repositorio.listarPermisos();

    expect(prisma.permisos.findMany).toHaveBeenCalledWith({
      orderBy: [{ modulo: "asc" }, { codigo: "asc" }],
    });
  });

  it("aplicarCambios inserta y borra filas de rol_permisos en una sola transacción", async () => {
    const otorgar = [{ id_rol: 2, id_permiso: 5 }];
    const quitar = [{ id_rol: 2, id_permiso: 7 }];

    await repositorio.aplicarCambios(otorgar, quitar);

    expect(prisma.rol_permisos.createMany).toHaveBeenCalledWith({ data: otorgar, skipDuplicates: true });
    expect(prisma.rol_permisos.deleteMany).toHaveBeenCalledWith({ where: { OR: quitar } });
    expect(prisma.$transaction).toHaveBeenCalledWith(["otorgar", "quitar"]);
  });

  it("aplicarCambios no arma el borrado si no hay nada para quitar", async () => {
    await repositorio.aplicarCambios([{ id_rol: 2, id_permiso: 5 }], []);

    expect(prisma.rol_permisos.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(["otorgar"]);
  });
});
