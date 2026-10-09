import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../errors/app-error.js";
import {
  crearControlDeAcceso,
  solicitanteDe,
  requierePermiso,
  requierePropioOPermiso,
  requiereRol,
  requiereSesion,
} from "../auth.js";
import type { IAutorizacion } from "../../../modules/gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../modules/gestion-usuarios/sesion/interface/i-autenticacion.js";

function crearRequest(cambios: Partial<Request> = {}): Request {
  return { headers: {}, ...cambios } as Request;
}

const res = {} as Response;

describe("requiereSesion", () => {
  let autenticacion: IAutenticacion;
  let next: NextFunction;

  beforeEach(() => {
    autenticacion = {
      validarSesion: vi.fn().mockResolvedValue({ usuarioId: 1, roles: ["PROPIETARIA"] }),
      iniciarSesion: vi.fn(),
      iniciarSesionDesarrollo: vi.fn(),
      obtenerPerfil: vi.fn(),
    };
    next = vi.fn();
  });

  it("requiereSesion carga req.usuario con el id y los roles vigentes y sigue", async () => {
    const req = crearRequest({ headers: { authorization: "Bearer token-valido" } });

    await requiereSesion(autenticacion)(req, res, next);

    expect(autenticacion.validarSesion).toHaveBeenCalledWith("token-valido");
    expect(req.usuario).toEqual({ id_usuario: 1, roles: ["PROPIETARIA"] });
    expect(next).toHaveBeenCalledWith();
  });

  it("requiereSesion lanza UnauthorizedError sin header Authorization", async () => {
    await expect(requiereSesion(autenticacion)(crearRequest(), res, next)).rejects.toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["Basic abc", "bearer token", "Token abc", "Bearer"])(
    "requiereSesion lanza UnauthorizedError con el header %j",
    async (authorization) => {
      const req = crearRequest({ headers: { authorization } });

      await expect(requiereSesion(autenticacion)(req, res, next)).rejects.toThrow(UnauthorizedError);
      expect(autenticacion.validarSesion).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["el token es inválido", new UnauthorizedError("Token inválido o expirado")],
    ["el usuario fue dado de baja", new ForbiddenError("Usuario inactivo")],
  ])("requiereSesion propaga el error si %s", async (_caso, error) => {
    vi.mocked(autenticacion.validarSesion).mockRejectedValue(error);
    const req = crearRequest({ headers: { authorization: "Bearer token" } });

    await expect(requiereSesion(autenticacion)(req, res, next)).rejects.toBe(error);
    expect(req.usuario).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requiereRol", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("requiereRol deja pasar si el usuario tiene el rol", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["PROPIETARIA"] } });

    requiereRol("PROPIETARIA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol deja pasar si tiene alguno de los roles permitidos", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["PROFESORA"] } });

    requiereRol("PROPIETARIA", "PROFESORA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol deja pasar a un usuario multi-rol si uno de sus roles alcanza", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["ALUMNO", "PROPIETARIA"] } });

    requiereRol("PROPIETARIA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol lanza ForbiddenError si ninguno de sus roles alcanza", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["ALUMNO", "TUTOR"] } });

    expect(() => requiereRol("PROPIETARIA")(req, res, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it("requiereRol lanza ForbiddenError si el usuario no tiene roles", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: [] } });

    expect(() => requiereRol("PROPIETARIA")(req, res, next)).toThrow(ForbiddenError);
  });

  it("requiereRol lanza UnauthorizedError si no pasó antes por requiereSesion", () => {
    expect(() => requiereRol("PROPIETARIA")(crearRequest(), res, next)).toThrow(UnauthorizedError);
  });
});

describe("requierePermiso", () => {
  let autorizacion: { tienePermiso: ReturnType<typeof vi.fn> };
  let next: NextFunction;

  function middleware() {
    return requierePermiso(autorizacion as unknown as IAutorizacion, "ACTIVIDADES_EDITAR");
  }

  beforeEach(() => {
    autorizacion = { tienePermiso: vi.fn() };
    next = vi.fn();
  });

  it("requierePermiso consulta el permiso con el id del usuario de la sesión y deja pasar", async () => {
    autorizacion.tienePermiso.mockResolvedValue(true);
    const req = crearRequest({ usuario: { id_usuario: 7, roles: ["PROFESORA"] } });

    await middleware()(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "ACTIVIDADES_EDITAR");
  });

  it("requierePermiso lanza ForbiddenError si ninguno de sus roles otorga el permiso", async () => {
    autorizacion.tienePermiso.mockResolvedValue(false);
    const req = crearRequest({ usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    await expect(middleware()(req, res, next)).rejects.toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it("requierePermiso propaga el error si falla la consulta", async () => {
    const falla = new Error("connect ECONNREFUSED");
    autorizacion.tienePermiso.mockRejectedValue(falla);
    const req = crearRequest({ usuario: { id_usuario: 7, roles: ["PROPIETARIA"] } });

    await expect(middleware()(req, res, next)).rejects.toBe(falla);
  });

  it("requierePermiso lanza UnauthorizedError si no pasó antes por requiereSesion", async () => {
    await expect(middleware()(crearRequest(), res, next)).rejects.toThrow(UnauthorizedError);
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });
});

describe("requierePropioOPermiso", () => {
  let autorizacion: IAutorizacion;
  let next: NextFunction;

  beforeEach(() => {
    autorizacion = { tienePermiso: vi.fn().mockResolvedValue(false) } as unknown as IAutorizacion;
    next = vi.fn();
  });

  it("requierePropioOPermiso lanza UnauthorizedError si no pasó por requiereSesion", async () => {
    const req = crearRequest({ params: { id: "1" } });

    await expect(requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("requierePropioOPermiso deja pasar los datos propios sin consultar permisos", async () => {
    const req = crearRequest({ params: { id: "7" }, usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    await requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });

  it("requierePropioOPermiso pide el permiso para los datos de otro usuario", async () => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(true);
    const req = crearRequest({ params: { id: "8" }, usuario: { id_usuario: 7, roles: ["PROPIETARIA"] } });

    await requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "USUARIOS_VER");
  });

  it("requierePropioOPermiso lanza ForbiddenError si falta el permiso para otro usuario", async () => {
    const req = crearRequest({ params: { id: "8" }, usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    await expect(requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next)).rejects.toThrow(
      ForbiddenError,
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("crearControlDeAcceso", () => {
  let autenticacion: IAutenticacion;
  let autorizacion: IAutorizacion;
  let next: NextFunction;

  beforeEach(() => {
    autenticacion = {
      validarSesion: vi.fn().mockResolvedValue({ usuarioId: 3, roles: ["PROFESORA"] }),
    } as unknown as IAutenticacion;
    autorizacion = { tienePermiso: vi.fn().mockResolvedValue(true) } as unknown as IAutorizacion;
    next = vi.fn();
  });

  it("sesion valida el token con la autenticación recibida", async () => {
    const req = crearRequest({ headers: { authorization: "Bearer token" } });

    await crearControlDeAcceso(autenticacion, autorizacion).sesion(req, res, next);

    expect(autenticacion.validarSesion).toHaveBeenCalledWith("token");
    expect(req.usuario).toEqual({ id_usuario: 3, roles: ["PROFESORA"] });
  });

  it("permiso consulta el código pedido con la autorización recibida", async () => {
    const req = crearRequest({ usuario: { id_usuario: 3, roles: ["PROFESORA"] } });

    await crearControlDeAcceso(autenticacion, autorizacion).permiso("PLANES_VER")(req, res, next);

    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(3, "PLANES_VER");
    expect(next).toHaveBeenCalledWith();
  });

  it("propioOPermiso consulta el permiso para los datos de otro usuario", async () => {
    const req = crearRequest({ params: { id: "9" }, usuario: { id_usuario: 3, roles: ["PROFESORA"] } });

    await crearControlDeAcceso(autenticacion, autorizacion).propioOPermiso("USUARIOS_VER")(req, res, next);

    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(3, "USUARIOS_VER");
  });

  it("rol exige alguno de los roles indicados", () => {
    const req = crearRequest({ usuario: { id_usuario: 3, roles: ["PROFESORA"] } });

    expect(() =>
      crearControlDeAcceso(autenticacion, autorizacion).rol("PROPIETARIA")(req, res, next),
    ).toThrow(ForbiddenError);
  });
});

describe("solicitanteDe", () => {
  it("dice quién pide y si es la propietaria", () => {
    expect(
      solicitanteDe(crearRequest({ usuario: { id_usuario: 3, roles: ["PROFESORA", "PROPIETARIA"] } })),
    ).toEqual({
      idUsuario: 3,
      esPropietaria: true,
    });
    expect(solicitanteDe(crearRequest({ usuario: { id_usuario: 4, roles: ["PROFESORA"] } }))).toEqual({
      idUsuario: 4,
      esPropietaria: false,
    });
  });

  it("lanza UnauthorizedError si la ruta no pasó por la sesión", () => {
    expect(() => solicitanteDe(crearRequest())).toThrow(UnauthorizedError);
  });
});
