import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../errors/app-error.js";
import { requierePermiso, requierePropioOPermiso, requiereRol, requiereSesion } from "../auth.js";
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
      obtenerPerfil: vi.fn(),
    };
    next = vi.fn();
  });

  it("requiereSesion carga req.usuario con el id y los roles vigentes y sigue", async () => {
    const req = crearRequest({ headers: { authorization: "Bearer token-valido" } });

    requiereSesion(autenticacion)(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect(autenticacion.validarSesion).toHaveBeenCalledWith("token-valido");
    expect(req.usuario).toEqual({ id_usuario: 1, roles: ["PROPIETARIA"] });
    expect(next).toHaveBeenCalledWith();
  });

  it("requiereSesion lanza UnauthorizedError sin header Authorization", () => {
    expect(() => requiereSesion(autenticacion)(crearRequest(), res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["Basic abc", "bearer token", "Token abc", "Bearer"])(
    "requiereSesion lanza UnauthorizedError con el header %j",
    (authorization) => {
      const req = crearRequest({ headers: { authorization } });

      expect(() => requiereSesion(autenticacion)(req, res, next)).toThrow(UnauthorizedError);
      expect(autenticacion.validarSesion).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["el token es inválido", new UnauthorizedError("Token inválido o expirado")],
    ["el usuario fue dado de baja", new ForbiddenError("Usuario inactivo")],
  ])("requiereSesion pasa el error a next si %s", async (_caso, error) => {
    vi.mocked(autenticacion.validarSesion).mockRejectedValue(error);
    const req = crearRequest({ headers: { authorization: "Bearer token" } });

    requiereSesion(autenticacion)(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
    expect(req.usuario).toBeUndefined();
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

    middleware()(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(undefined));
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "ACTIVIDADES_EDITAR");
  });

  it("requierePermiso pasa un ForbiddenError si ninguno de sus roles otorga el permiso", async () => {
    autorizacion.tienePermiso.mockResolvedValue(false);
    const req = crearRequest({ usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    middleware()(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError)));
  });

  it("requierePermiso pasa el error al manejador si falla la consulta", async () => {
    const falla = new Error("connect ECONNREFUSED");
    autorizacion.tienePermiso.mockRejectedValue(falla);
    const req = crearRequest({ usuario: { id_usuario: 7, roles: ["PROPIETARIA"] } });

    middleware()(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(falla));
  });

  it("requierePermiso lanza UnauthorizedError si no pasó antes por requiereSesion", () => {
    expect(() => middleware()(crearRequest(), res, next)).toThrow(UnauthorizedError);
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

  it("requierePropioOPermiso lanza UnauthorizedError si no pasó por requiereSesion", () => {
    const req = crearRequest({ params: { id: "1" } });

    expect(() => requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next)).toThrow(
      UnauthorizedError,
    );
  });

  it("requierePropioOPermiso deja pasar los datos propios sin consultar permisos", () => {
    const req = crearRequest({ params: { id: "7" }, usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
  });

  it("requierePropioOPermiso pide el permiso para los datos de otro usuario", async () => {
    vi.mocked(autorizacion.tienePermiso).mockResolvedValue(true);
    const req = crearRequest({ params: { id: "8" }, usuario: { id_usuario: 7, roles: ["PROPIETARIA"] } });

    requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(undefined));
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(7, "USUARIOS_VER");
  });

  it("requierePropioOPermiso responde ForbiddenError si falta el permiso para otro usuario", async () => {
    const req = crearRequest({ params: { id: "8" }, usuario: { id_usuario: 7, roles: ["ALUMNO"] } });

    requierePropioOPermiso(autorizacion, "USUARIOS_VER")(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError)));
  });
});
