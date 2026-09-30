import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../shared/errors/app-error.js";
import { PermisoService } from "../permiso.service.js";
import type { PermisoRepository } from "../permiso.repository.js";

const rolPropietaria = {
  id_rol: 1,
  codigo: "PROPIETARIA" as const,
  nombre: "Propietaria",
  descripcion: null,
};
const rolAlumno = { id_rol: 3, codigo: "ALUMNO" as const, nombre: "Alumno", descripcion: null };

const usuario = {
  id_usuario: 1,
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: new Date("1990-01-01"),
  direccion: null,
  estado: "ACTIVO" as const,
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [{ id_usuario: 1, id_rol: 1, rol: rolPropietaria, fecha_asignacion: new Date() }],
};

function crearRepositorioMock() {
  return {
    buscarRolPorCodigo: vi.fn(),
    asignarRol: vi.fn(),
    quitarRol: vi.fn(),
    contarRolesConPermiso: vi.fn(),
  };
}

describe("PermisoService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let permisoService: PermisoService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    permisoService = new PermisoService(repositorio as unknown as PermisoRepository);
  });

  it("tieneRol detecta si el usuario tiene el rol", () => {
    expect(permisoService.tieneRol(usuario, "PROPIETARIA")).toBe(true);
    expect(permisoService.tieneRol(usuario, "PROFESORA")).toBe(false);
  });

  it("asignarRol busca el rol por código y crea el registro en usuario_roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(rolAlumno);

    await permisoService.asignarRol(usuario.id_usuario, "ALUMNO");

    expect(repositorio.buscarRolPorCodigo).toHaveBeenCalledWith("ALUMNO");
    expect(repositorio.asignarRol).toHaveBeenCalledWith(usuario.id_usuario, rolAlumno.id_rol);
  });

  it("asignarRol lanza NotFoundError si el rol no está cargado en la tabla roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(null);

    await expect(permisoService.asignarRol(usuario.id_usuario, "TUTOR")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repositorio.asignarRol).not.toHaveBeenCalled();
  });

  it("quitarRol elimina el registro de usuario_roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(rolPropietaria);

    await permisoService.quitarRol(usuario.id_usuario, "PROPIETARIA");

    expect(repositorio.quitarRol).toHaveBeenCalledWith(usuario.id_usuario, rolPropietaria.id_rol);
  });

  it("tienePermiso es true si alguno de sus roles otorga el permiso", async () => {
    repositorio.contarRolesConPermiso.mockResolvedValue(1);

    await expect(permisoService.tienePermiso(usuario, "PAGOS_CONFIRMAR")).resolves.toBe(true);
    expect(repositorio.contarRolesConPermiso).toHaveBeenCalledWith([1], "PAGOS_CONFIRMAR");
  });

  it("tienePermiso es false si ningún rol otorga el permiso", async () => {
    repositorio.contarRolesConPermiso.mockResolvedValue(0);

    await expect(permisoService.tienePermiso(usuario, "PAGOS_CONFIRMAR")).resolves.toBe(false);
  });

  it("tienePermiso es false sin consultar la base si el usuario no tiene roles", async () => {
    await expect(permisoService.tienePermiso({ ...usuario, roles: [] }, "PAGOS_CONFIRMAR")).resolves.toBe(
      false,
    );
    expect(repositorio.contarRolesConPermiso).not.toHaveBeenCalled();
  });

  it("quitarRol lanza NotFoundError si el rol no está cargado en la tabla roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(null);

    await expect(permisoService.quitarRol(usuario.id_usuario, "TUTOR")).rejects.toBeInstanceOf(NotFoundError);
    expect(repositorio.quitarRol).not.toHaveBeenCalled();
  });

  it("tieneRol es false si el usuario no tiene roles", () => {
    expect(permisoService.tieneRol({ ...usuario, roles: [] }, "ALUMNO")).toBe(false);
  });

  it("tieneRol reconoce cualquiera de los roles de un usuario multi-rol", () => {
    const multiRol = {
      ...usuario,
      roles: [...usuario.roles, { id_usuario: 1, id_rol: 3, rol: rolAlumno, fecha_asignacion: new Date() }],
    };

    expect(permisoService.tieneRol(multiRol, "PROPIETARIA")).toBe(true);
    expect(permisoService.tieneRol(multiRol, "ALUMNO")).toBe(true);
    expect(permisoService.tieneRol(multiRol, "TUTOR")).toBe(false);
  });

  it("tienePermiso consulta con todos los roles del usuario multi-rol (unión de permisos)", async () => {
    const multiRol = {
      ...usuario,
      roles: [...usuario.roles, { id_usuario: 1, id_rol: 3, rol: rolAlumno, fecha_asignacion: new Date() }],
    };
    repositorio.contarRolesConPermiso.mockResolvedValue(1);

    await expect(permisoService.tienePermiso(multiRol, "RUTINAS_VER")).resolves.toBe(true);
    expect(repositorio.contarRolesConPermiso).toHaveBeenCalledWith([1, 3], "RUTINAS_VER");
  });
});
