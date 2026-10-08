import { describe, expect, it } from "vitest";
import {
  AlumnoExistenteError,
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
  ValidationError,
} from "../app-error.js";

describe("errores de la aplicación", () => {
  it.each([
    [new NotFoundError(), 404, "NOT_FOUND", "Recurso no encontrado"],
    [new ConflictError(), 409, "CONFLICT", "El recurso ya existe"],
    [new UnauthorizedError(), 401, "UNAUTHORIZED", "No autenticado"],
    [new ForbiddenError(), 403, "FORBIDDEN", "No tiene permisos para esta acción"],
    [new ValidationError(), 400, "VALIDATION_ERROR", "Datos inválidos"],
  ])("%s tiene status, código y mensaje por defecto", (error, status, code, message) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: status, code, message });
  });

  it("UsuarioNoRegistradoError responde 403 con un mensaje que explica a quién pedir el alta", () => {
    const error = new UsuarioNoRegistradoError();

    expect(error).toMatchObject({ statusCode: 403, code: "USUARIO_NO_REGISTRADO" });
    expect(error.message).toContain("Pedile a quien administra el centro");
  });

  it("AlumnoExistenteError responde 409 con un código propio y el id del alumno que ya existe", () => {
    const error = new AlumnoExistenteError(7);

    expect(error).toMatchObject({ statusCode: 409, code: "ALUMNO_EXISTENTE" });
    expect(error.message).toContain("alumno 7");
  });

  it("acepta un mensaje personalizado", () => {
    expect(new NotFoundError("Usuario no encontrado").message).toBe("Usuario no encontrado");
  });

  it("ValidationError conserva los detalles", () => {
    expect(new ValidationError("Datos inválidos", { campo: "email" }).details).toEqual({ campo: "email" });
  });

  it("AppError usa APP_ERROR como código por defecto", () => {
    expect(new AppError(418, "Soy una tetera")).toMatchObject({ statusCode: 418, code: "APP_ERROR" });
  });
});
