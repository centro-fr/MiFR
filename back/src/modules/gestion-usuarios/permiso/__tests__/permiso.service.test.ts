import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../shared/db/client.js", () => ({
  prisma: {
    usuario_roles: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { prisma } = await import("../../../../shared/db/client.js");
const { PermisoService } = await import("../permiso.service.js");

const usuario = {
  id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: null,
  direccion: null,
  estado: "ACTIVO" as const,
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [
    {
      id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      rol: "PROPIETARIO" as const,
      fecha_asignacion: new Date(),
    },
  ],
};

describe("PermisoService", () => {
  let permisoService: InstanceType<typeof PermisoService>;

  beforeEach(() => {
    vi.clearAllMocks();
    permisoService = new PermisoService();
  });

  it("tienePermiso detecta si el usuario tiene el rol", () => {
    expect(permisoService.tienePermiso(usuario, "PROPIETARIO")).toBe(true);
    expect(permisoService.tienePermiso(usuario, "PROFESORA")).toBe(false);
  });

  it("asignarRol crea el registro en usuario_roles", async () => {
    await permisoService.asignarRol(usuario.id_usuario, "ALUMNO");

    expect(prisma.usuario_roles.create).toHaveBeenCalledWith({
      data: { id_usuario: usuario.id_usuario, rol: "ALUMNO" },
    });
  });

  it("quitarRol elimina el registro de usuario_roles", async () => {
    await permisoService.quitarRol(usuario.id_usuario, "PROPIETARIO");

    expect(prisma.usuario_roles.delete).toHaveBeenCalledWith({
      where: { id_usuario_rol: { id_usuario: usuario.id_usuario, rol: "PROPIETARIO" } },
    });
  });
});
