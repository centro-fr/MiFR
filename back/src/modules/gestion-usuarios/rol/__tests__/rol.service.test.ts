import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotFoundError,
  PermisoCriticoInmutableError,
  PermisoExclusivoPropietariaError,
} from "../../../../shared/errors/app-error.js";
import { RolService } from "../rol.service.js";
import type { RolRepository } from "../rol.repository.js";

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
  foto_url: null,
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
    contarRolesDeUsuarioConPermiso: vi.fn(),
    listarCodigosPermisoDeUsuario: vi.fn(),
    listarRoles: vi.fn(),
    listarPermisos: vi.fn(),
    listarAsignaciones: vi.fn(),
    aplicarCambios: vi.fn(),
  };
}

describe("RolService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let rolService: RolService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    rolService = new RolService(repositorio as unknown as RolRepository);
  });

  it("tieneRol detecta si el usuario tiene el rol", () => {
    expect(rolService.tieneRol(usuario, "PROPIETARIA")).toBe(true);
    expect(rolService.tieneRol(usuario, "PROFESORA")).toBe(false);
  });

  it("asignarRol busca el rol por código y crea el registro en usuario_roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(rolAlumno);

    await rolService.asignarRol(usuario.id_usuario, "ALUMNO");

    expect(repositorio.buscarRolPorCodigo).toHaveBeenCalledWith("ALUMNO");
    expect(repositorio.asignarRol).toHaveBeenCalledWith(usuario.id_usuario, rolAlumno.id_rol);
  });

  it("asignarRol lanza NotFoundError si el rol no está cargado en la tabla roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(null);

    await expect(rolService.asignarRol(usuario.id_usuario, "TUTOR")).rejects.toBeInstanceOf(NotFoundError);
    expect(repositorio.asignarRol).not.toHaveBeenCalled();
  });

  it("quitarRol elimina el registro de usuario_roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(rolPropietaria);

    await rolService.quitarRol(usuario.id_usuario, "PROPIETARIA");

    expect(repositorio.quitarRol).toHaveBeenCalledWith(usuario.id_usuario, rolPropietaria.id_rol);
  });

  it("quitarRol lanza NotFoundError si el rol no está cargado en la tabla roles", async () => {
    repositorio.buscarRolPorCodigo.mockResolvedValue(null);

    await expect(rolService.quitarRol(usuario.id_usuario, "TUTOR")).rejects.toBeInstanceOf(NotFoundError);
    expect(repositorio.quitarRol).not.toHaveBeenCalled();
  });

  it("tieneRol es false si el usuario no tiene roles", () => {
    expect(rolService.tieneRol({ ...usuario, roles: [] }, "ALUMNO")).toBe(false);
  });

  it("tieneRol reconoce cualquiera de los roles de un usuario multi-rol", () => {
    const multiRol = {
      ...usuario,
      roles: [...usuario.roles, { id_usuario: 1, id_rol: 3, rol: rolAlumno, fecha_asignacion: new Date() }],
    };

    expect(rolService.tieneRol(multiRol, "PROPIETARIA")).toBe(true);
    expect(rolService.tieneRol(multiRol, "ALUMNO")).toBe(true);
    expect(rolService.tieneRol(multiRol, "TUTOR")).toBe(false);
  });

  it("tienePermiso es true si alguno de los roles del usuario otorga el permiso", async () => {
    repositorio.contarRolesDeUsuarioConPermiso.mockResolvedValue(1);

    await expect(rolService.tienePermiso(1, "PAGOS_CONFIRMAR")).resolves.toBe(true);
    expect(repositorio.contarRolesDeUsuarioConPermiso).toHaveBeenCalledWith(1, "PAGOS_CONFIRMAR");
  });

  it("tienePermiso es true para un usuario multi-rol si lo otorgan varios de sus roles", async () => {
    repositorio.contarRolesDeUsuarioConPermiso.mockResolvedValue(2);

    await expect(rolService.tienePermiso(1, "RUTINAS_VER")).resolves.toBe(true);
  });

  it("tienePermiso es false si ningún rol del usuario otorga el permiso", async () => {
    repositorio.contarRolesDeUsuarioConPermiso.mockResolvedValue(0);

    await expect(rolService.tienePermiso(1, "PAGOS_CONFIRMAR")).resolves.toBe(false);
  });

  it("permisosEfectivos devuelve la unión de los permisos de sus roles", async () => {
    repositorio.listarCodigosPermisoDeUsuario.mockResolvedValue(["ACTIVIDADES_VER", "HORARIOS_VER"]);

    await expect(rolService.permisosEfectivos(1)).resolves.toEqual(["ACTIVIDADES_VER", "HORARIOS_VER"]);
    expect(repositorio.listarCodigosPermisoDeUsuario).toHaveBeenCalledWith(1);
  });

  describe("matriz", () => {
    const rolProfesora = { id_rol: 2, codigo: "PROFESORA" as const, nombre: "Profesora", descripcion: null };
    const roles = [rolPropietaria, rolProfesora, rolAlumno];
    const permisos = [
      { id_permiso: 1, codigo: "HONORARIOS_VER_PROPIOS", modulo: "HONORARIOS", descripcion: "Propios" },
      { id_permiso: 2, codigo: "HONORARIOS_VER_TODOS", modulo: "HONORARIOS", descripcion: "Todos" },
      { id_permiso: 3, codigo: "RUTINAS_EDITAR", modulo: "RUTINAS", descripcion: null },
    ];

    beforeEach(() => {
      repositorio.listarRoles.mockResolvedValue(roles);
      repositorio.listarPermisos.mockResolvedValue(permisos);
    });

    it("obtenerMatriz agrupa los permisos por módulo y marca los críticos", async () => {
      repositorio.listarAsignaciones.mockResolvedValue([]);

      const { modulos } = await rolService.obtenerMatriz();

      expect(modulos).toEqual([
        {
          modulo: "HONORARIOS",
          permisos: [
            { id_permiso: 1, codigo: "HONORARIOS_VER_PROPIOS", descripcion: "Propios", critico: false },
            { id_permiso: 2, codigo: "HONORARIOS_VER_TODOS", descripcion: "Todos", critico: true },
          ],
        },
        {
          modulo: "RUTINAS",
          permisos: [{ id_permiso: 3, codigo: "RUTINAS_EDITAR", descripcion: null, critico: false }],
        },
      ]);
    });

    it("obtenerMatriz lista por rol los permisos otorgados, con lista vacía si no tiene ninguno", async () => {
      repositorio.listarAsignaciones.mockResolvedValue([
        { rol: { codigo: "PROPIETARIA" }, permiso: { codigo: "HONORARIOS_VER_TODOS" } },
        { rol: { codigo: "PROFESORA" }, permiso: { codigo: "HONORARIOS_VER_PROPIOS" } },
        { rol: { codigo: "PROPIETARIA" }, permiso: { codigo: "RUTINAS_EDITAR" } },
      ]);

      const { roles: rolesMatriz, matriz } = await rolService.obtenerMatriz();

      expect(rolesMatriz).toEqual([
        { id_rol: 1, codigo: "PROPIETARIA", nombre: "Propietaria" },
        { id_rol: 2, codigo: "PROFESORA", nombre: "Profesora" },
        { id_rol: 3, codigo: "ALUMNO", nombre: "Alumno" },
      ]);
      expect(matriz).toEqual({
        PROPIETARIA: ["HONORARIOS_VER_TODOS", "RUTINAS_EDITAR"],
        PROFESORA: ["HONORARIOS_VER_PROPIOS"],
        ALUMNO: [],
      });
    });

    it("actualizarMatriz separa los permisos a otorgar de los que se quitan", async () => {
      await rolService.actualizarMatriz([
        { rol: "PROFESORA", permiso: "RUTINAS_EDITAR", otorgado: true },
        { rol: "PROFESORA", permiso: "HONORARIOS_VER_PROPIOS", otorgado: false },
      ]);

      expect(repositorio.aplicarCambios).toHaveBeenCalledWith(
        [{ id_rol: 2, id_permiso: 3 }],
        [{ id_rol: 2, id_permiso: 1 }],
      );
    });

    it("actualizarMatriz deja quitarle a la propietaria un permiso que no es crítico", async () => {
      await rolService.actualizarMatriz([{ rol: "PROPIETARIA", permiso: "RUTINAS_EDITAR", otorgado: false }]);

      expect(repositorio.aplicarCambios).toHaveBeenCalledWith([], [{ id_rol: 1, id_permiso: 3 }]);
    });

    it("actualizarMatriz lanza PermisoCriticoInmutableError al quitarle un permiso crítico a la propietaria", async () => {
      await expect(
        rolService.actualizarMatriz([
          { rol: "PROFESORA", permiso: "RUTINAS_EDITAR", otorgado: true },
          { rol: "PROPIETARIA", permiso: "HONORARIOS_VER_TODOS", otorgado: false },
        ]),
      ).rejects.toBeInstanceOf(PermisoCriticoInmutableError);
      expect(repositorio.aplicarCambios).not.toHaveBeenCalled();
    });

    it("actualizarMatriz lanza PermisoExclusivoPropietariaError al otorgar un permiso financiero a otro rol", async () => {
      await expect(
        rolService.actualizarMatriz([{ rol: "PROFESORA", permiso: "HONORARIOS_VER_TODOS", otorgado: true }]),
      ).rejects.toBeInstanceOf(PermisoExclusivoPropietariaError);
      expect(repositorio.aplicarCambios).not.toHaveBeenCalled();
    });

    it("actualizarMatriz permite quitarle a otro rol un permiso exclusivo que tuviera cargado", async () => {
      await rolService.actualizarMatriz([
        { rol: "PROFESORA", permiso: "HONORARIOS_VER_TODOS", otorgado: false },
      ]);

      expect(repositorio.aplicarCambios).toHaveBeenCalledWith([], [{ id_rol: 2, id_permiso: 2 }]);
    });

    it("actualizarMatriz lanza NotFoundError si el permiso no existe", async () => {
      await expect(
        rolService.actualizarMatriz([{ rol: "PROFESORA", permiso: "NO_EXISTE", otorgado: true }]),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repositorio.aplicarCambios).not.toHaveBeenCalled();
    });

    it("actualizarMatriz lanza NotFoundError si el rol no está cargado", async () => {
      await expect(
        rolService.actualizarMatriz([{ rol: "TUTOR", permiso: "RUTINAS_EDITAR", otorgado: true }]),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repositorio.aplicarCambios).not.toHaveBeenCalled();
    });
  });
});
