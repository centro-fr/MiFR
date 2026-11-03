import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { Guardia } from "../../../shared/middlewares/auth.js";
import { cualquieraDe } from "../cualquiera-de.js";

const deja: Guardia = (_req, _res, next) => next();
const prohibe: Guardia = async () => {
  throw new ForbiddenError();
};

async function correr(guardia: Guardia): Promise<NextFunction> {
  const next = vi.fn();
  await guardia({} as Request, {} as Response, next);
  return next;
}

describe("cualquieraDe", () => {
  it("deja pasar con el primer guardia que lo permite, sin probar los siguientes", async () => {
    const siguiente = vi.fn(deja);

    const next = await correr(cualquieraDe(deja, siguiente));

    expect(next).toHaveBeenCalledTimes(1);
    expect(siguiente).not.toHaveBeenCalled();
  });

  it("si el primero responde 403, prueba con el siguiente", async () => {
    expect(await correr(cualquieraDe(prohibe, deja))).toHaveBeenCalledTimes(1);
  });

  it("responde 403 si ninguno lo deja pasar", async () => {
    await expect(correr(cualquieraDe(prohibe, prohibe))).rejects.toThrow(ForbiddenError);
  });

  it("un error que no es 403, como la sesión vencida, sigue de largo", async () => {
    const sinSesion: Guardia = async () => {
      throw new UnauthorizedError();
    };

    await expect(correr(cualquieraDe(sinSesion, deja))).rejects.toThrow(UnauthorizedError);
  });
});
