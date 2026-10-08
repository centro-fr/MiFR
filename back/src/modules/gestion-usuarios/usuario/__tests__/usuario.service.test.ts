import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { UsuarioService } from "../usuario.service.js";
import type { IAutorizacion } from "../../rol/interface/i-autorizacion.js";
import type { UsuarioRepository } from "../usuario.repository.js";
import type { UsuarioConRoles } from "../usuario.types.js";

const rolAlumno = { id_rol: 3, codigo: "ALUMNO" as const, nombre: "Alumno", descripcion: null };

function crearUsuario(cambios: Partial<UsuarioConRoles> = {}): UsuarioConRoles {
  return {
    id_usuario: 1,
    google_id: "google-123",
    email: "test@example.com",
    nombre: "Ana",
    apellido: "Perez",
    dni: null,
    telefono: null,
    fecha_nacimiento: new Date("1990-01-01"),
    direccion: null,
    estado: "ACTIVO",
    fecha_alta: new Date(),
    fecha_actualizacion: new Date(),
    roles: [],
    ...cambios,
  };
}

const nuevoUsuario = {
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  fecha_nacimiento: new Date("1990-01-01"),
};

function crearRepositorioMock() {
  return {
    buscarPorId: vi.fn(),
    buscarPorGoogleId: vi.fn(),
    buscarPorEmail: vi.fn(),
    buscarPorEmailOGoogleId: vi.fn(),
    buscarPorDni: vi.fn(),
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    vincularGoogleId: vi.fn(),
    eliminar: vi.fn(),
  };
}

function crearAutorizacionMock() {
  return { asignarRol: vi.fn(), quitarRol: vi.fn(), tieneRol: vi.fn(), tienePermiso: vi.fn() };
}

describe("UsuarioService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let autorizacion: ReturnType<typeof crearAutorizacionMock>;
  let service: UsuarioService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    autorizacion = crearAutorizacionMock();
    service = new UsuarioService(
      repositorio as unknown as UsuarioRepository,
      autorizacion as unknown as IAutorizacion,
    );
  });

  describe("crear", () => {
    it("crear crea un usuario nuevo con los datos recibidos", async () => {
      repositorio.buscarPorEmailOGoogleId.mockResolvedValue(null);
      repositorio.crear.mockResolvedValue(crearUsuario());

      const resultado = await service.crear(nuevoUsuario);

      expect(repositorio.buscarPorEmailOGoogleId).toHaveBeenCalledWith("test@example.com", "google-123");
      expect(repositorio.crear).toHaveBeenCalledWith(nuevoUsuario);
      expect(resultado.email).toBe("test@example.com");
    });

    it("crear permite un menor sin email ni google_id (DER: email NULL en menores)", async () => {
      const menor = { nombre: "Juan", apellido: "Perez", fecha_nacimiento: new Date("2015-02-01") };
      repositorio.buscarPorEmailOGoogleId.mockResolvedValue(null);
      repositorio.crear.mockResolvedValue(crearUsuario({ ...menor, email: null, google_id: null }));

      const resultado = await service.crear(menor);

      expect(repositorio.buscarPorEmailOGoogleId).toHaveBeenCalledWith(undefined, undefined);
      expect(resultado.email).toBeNull();
    });

    it("crear lanza ConflictError si el email o google_id ya existen", async () => {
      repositorio.buscarPorEmailOGoogleId.mockResolvedValue(crearUsuario());

      await expect(service.crear(nuevoUsuario)).rejects.toBeInstanceOf(ConflictError);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe("listar", () => {
    it("listar devuelve los usuarios del repositorio", async () => {
      const usuarios = [crearUsuario(), crearUsuario({ id_usuario: 2, email: "otro@example.com" })];
      repositorio.listar.mockResolvedValue(usuarios);

      await expect(service.listar()).resolves.toEqual(usuarios);
    });

    it("listar devuelve una lista vacía si no hay usuarios", async () => {
      repositorio.listar.mockResolvedValue([]);

      await expect(service.listar()).resolves.toEqual([]);
    });
  });

  describe("obtenerPorId", () => {
    it("obtenerPorId retorna el usuario", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());

      const resultado = await service.obtenerPorId(1);

      expect(repositorio.buscarPorId).toHaveBeenCalledWith(1);
      expect(resultado.id_usuario).toBe(1);
    });

    it("obtenerPorId lanza NotFoundError si no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.obtenerPorId(99)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("buscarPorId", () => {
    it("buscarPorId devuelve null si no existe, sin lanzar", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).resolves.toBeNull();
    });
  });

  describe("buscarPorEmail", () => {
    it("buscarPorEmail devuelve el usuario del repositorio, o null sin lanzar", async () => {
      repositorio.buscarPorEmail.mockResolvedValueOnce(crearUsuario()).mockResolvedValueOnce(null);

      await expect(service.buscarPorEmail("ana@example.com")).resolves.toMatchObject({ id_usuario: 1 });
      await expect(service.buscarPorEmail("nadie@example.com")).resolves.toBeNull();
      expect(repositorio.buscarPorEmail).toHaveBeenCalledWith("ana@example.com");
    });
  });

  describe("buscarPorDni", () => {
    it("buscarPorDni devuelve el usuario del repositorio, o null sin lanzar", async () => {
      repositorio.buscarPorDni.mockResolvedValueOnce(crearUsuario()).mockResolvedValueOnce(null);

      await expect(service.buscarPorDni("30111222")).resolves.toMatchObject({ id_usuario: 1 });
      await expect(service.buscarPorDni("40111222")).resolves.toBeNull();
      expect(repositorio.buscarPorDni).toHaveBeenCalledWith("30111222");
    });
  });

  describe("identificarPorGoogle", () => {
    it("identificarPorGoogle devuelve el usuario con ese google_id sin buscar por email", async () => {
      repositorio.buscarPorGoogleId.mockResolvedValue(crearUsuario());

      await expect(service.identificarPorGoogle("google-123", "test@example.com")).resolves.toMatchObject({
        id_usuario: 1,
      });
      expect(repositorio.buscarPorGoogleId).toHaveBeenCalledWith("google-123");
      expect(repositorio.buscarPorEmail).not.toHaveBeenCalled();
      expect(repositorio.vincularGoogleId).not.toHaveBeenCalled();
    });

    it("identificarPorGoogle vincula el google_id al usuario precargado con ese email", async () => {
      repositorio.buscarPorGoogleId.mockResolvedValue(null);
      repositorio.buscarPorEmail.mockResolvedValue(crearUsuario({ google_id: null }));
      repositorio.vincularGoogleId.mockResolvedValue(crearUsuario({ google_id: "google-123" }));

      const usuario = await service.identificarPorGoogle("google-123", "test@example.com");

      expect(repositorio.buscarPorEmail).toHaveBeenCalledWith("test@example.com");
      expect(repositorio.vincularGoogleId).toHaveBeenCalledWith(1, "google-123");
      expect(usuario?.google_id).toBe("google-123");
    });

    it("identificarPorGoogle devuelve null si no hay usuario con ese google_id ni ese email", async () => {
      repositorio.buscarPorGoogleId.mockResolvedValue(null);
      repositorio.buscarPorEmail.mockResolvedValue(null);

      await expect(service.identificarPorGoogle("google-123", "test@example.com")).resolves.toBeNull();
      expect(repositorio.vincularGoogleId).not.toHaveBeenCalled();
      expect(repositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe("actualizar", () => {
    it("actualizar actualiza campos permitidos", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.actualizar.mockResolvedValue(crearUsuario({ nombre: "Nueva" }));

      const resultado = await service.actualizar(1, { nombre: "Nueva" });

      expect(repositorio.actualizar).toHaveBeenCalledWith(1, { nombre: "Nueva" });
      expect(resultado.nombre).toBe("Nueva");
    });

    it("actualizar no consulta el dni si no viene en el input", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.actualizar.mockResolvedValue(crearUsuario());

      await service.actualizar(1, { telefono: "3511234567" });

      expect(repositorio.buscarPorDni).not.toHaveBeenCalled();
    });

    it("actualizar permite un dni que no usa nadie", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.buscarPorDni.mockResolvedValue(null);
      repositorio.actualizar.mockResolvedValue(crearUsuario({ dni: "40123456" }));

      const resultado = await service.actualizar(1, { dni: "40123456" });

      expect(resultado.dni).toBe("40123456");
    });

    it("actualizar permite reenviar el dni que ya tiene el mismo usuario", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario({ dni: "40123456" }));
      repositorio.buscarPorDni.mockResolvedValue(crearUsuario({ dni: "40123456" }));
      repositorio.actualizar.mockResolvedValue(crearUsuario({ dni: "40123456" }));

      await expect(service.actualizar(1, { dni: "40123456" })).resolves.toBeDefined();
      expect(repositorio.actualizar).toHaveBeenCalled();
    });

    it("actualizar lanza ConflictError si el dni pertenece a otro usuario", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.buscarPorDni.mockResolvedValue(crearUsuario({ id_usuario: 2, dni: "40123456" }));

      await expect(service.actualizar(1, { dni: "40123456" })).rejects.toBeInstanceOf(ConflictError);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
    });

    it("actualizar lanza NotFoundError si el usuario no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.actualizar(99, { nombre: "Nueva" })).rejects.toBeInstanceOf(NotFoundError);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
    });
  });

  describe("eliminar", () => {
    it("eliminar elimina un usuario existente", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.eliminar.mockResolvedValue(true);

      await service.eliminar(1);

      expect(repositorio.eliminar).toHaveBeenCalledWith(1);
    });

    it("eliminar lanza ConflictError si el usuario tiene registros asociados", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      repositorio.eliminar.mockResolvedValue(false);

      await expect(service.eliminar(1)).rejects.toBeInstanceOf(ConflictError);
    });

    it("eliminar lanza NotFoundError si el usuario no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.eliminar(99)).rejects.toBeInstanceOf(NotFoundError);
      expect(repositorio.eliminar).not.toHaveBeenCalled();
    });
  });

  describe("asignarRol", () => {
    it("asignarRol delega en IAutorizacion y devuelve el usuario actualizado", async () => {
      const conRol = crearUsuario({
        roles: [{ id_usuario: 1, id_rol: 3, rol: rolAlumno, fecha_asignacion: new Date() }],
      });
      repositorio.buscarPorId.mockResolvedValueOnce(crearUsuario()).mockResolvedValueOnce(conRol);
      autorizacion.tieneRol.mockReturnValue(false);

      const resultado = await service.asignarRol(1, "ALUMNO");

      expect(autorizacion.asignarRol).toHaveBeenCalledWith(1, "ALUMNO");
      expect(resultado.roles.map((r) => r.rol.codigo)).toEqual(["ALUMNO"]);
    });

    it("asignarRol lanza ConflictError si el rol ya esta asignado", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      autorizacion.tieneRol.mockReturnValue(true);

      await expect(service.asignarRol(1, "ALUMNO")).rejects.toBeInstanceOf(ConflictError);
      expect(autorizacion.asignarRol).not.toHaveBeenCalled();
    });

    it("asignarRol lanza NotFoundError si el usuario no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.asignarRol(99, "ALUMNO")).rejects.toBeInstanceOf(NotFoundError);
      expect(autorizacion.asignarRol).not.toHaveBeenCalled();
    });

    it("asignarRol propaga el error si el rol no está cargado en la tabla roles", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      autorizacion.tieneRol.mockReturnValue(false);
      autorizacion.asignarRol.mockRejectedValue(new NotFoundError("El rol TUTOR no está cargado"));

      await expect(service.asignarRol(1, "TUTOR")).rejects.toThrow("El rol TUTOR no está cargado");
    });
  });

  describe("quitarRol", () => {
    it("quitarRol delega en IAutorizacion si el usuario tiene el rol", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      autorizacion.tieneRol.mockReturnValue(true);

      await service.quitarRol(1, "ALUMNO");

      expect(autorizacion.quitarRol).toHaveBeenCalledWith(1, "ALUMNO");
      expect(repositorio.buscarPorId).toHaveBeenCalledTimes(2);
    });

    it("quitarRol lanza NotFoundError si el usuario no tiene ese rol", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearUsuario());
      autorizacion.tieneRol.mockReturnValue(false);

      await expect(service.quitarRol(1, "ALUMNO")).rejects.toBeInstanceOf(NotFoundError);
      expect(autorizacion.quitarRol).not.toHaveBeenCalled();
    });

    it("quitarRol lanza NotFoundError si el usuario no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.quitarRol(99, "ALUMNO")).rejects.toBeInstanceOf(NotFoundError);
      expect(autorizacion.quitarRol).not.toHaveBeenCalled();
    });
  });
});
