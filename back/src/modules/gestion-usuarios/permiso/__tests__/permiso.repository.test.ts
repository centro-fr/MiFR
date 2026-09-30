import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../shared/db/client.js", () => ({
  prisma: {
    roles: { findUnique: vi.fn() },
    usuario_roles: { create: vi.fn(), delete: vi.fn() },
    rol_permisos: { count: vi.fn() },
  },
}));

const { prisma } = await import("../../../../shared/db/client.js");
const { PermisoRepository } = await import("../permiso.repository.js");

describe("PermisoRepository", () => {
  let repositorio: InstanceType<typeof PermisoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new PermisoRepository();
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

  it("contarRolesConPermiso cuenta en rol_permisos los roles que otorgan ese código de permiso", async () => {
    vi.mocked(prisma.rol_permisos.count).mockResolvedValue(2);

    await expect(repositorio.contarRolesConPermiso([1, 2], "PAGOS_CONFIRMAR")).resolves.toBe(2);
    expect(prisma.rol_permisos.count).toHaveBeenCalledWith({
      where: { id_rol: { in: [1, 2] }, permiso: { codigo: "PAGOS_CONFIRMAR" } },
    });
  });
});
