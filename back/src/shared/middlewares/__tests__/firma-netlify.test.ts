import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrigenNoPermitidoError } from "../../errors/app-error.js";
import { exigirFirmaDeNetlify } from "../firma-netlify.js";

const SECRETO = "s".repeat(32);
const res = {} as Response;

// Lo que manda Netlify según su documentación de los reenvíos firmados.
const RECLAMOS_DE_NETLIFY = {
  deploy_context: "production",
  iss: "netlify",
  netlify_id: "1be0f471-6532-45ff-b1b1-f9c66ea24dc1",
  site_url: "https://mifr.netlify.app",
};

function pedidoCon(firma?: string): Request {
  return { get: (nombre: string) => (nombre === "x-nf-sign" ? firma : undefined) } as unknown as Request;
}

function firmar(reclamos: object = RECLAMOS_DE_NETLIFY, opciones: jwt.SignOptions = {}, secreto = SECRETO) {
  return jwt.sign(reclamos, secreto, { algorithm: "HS256", expiresIn: "1m", ...opciones });
}

describe("exigirFirmaDeNetlify", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("exigirFirmaDeNetlify deja pasar un pedido firmado por Netlify con el secreto compartido", () => {
    exigirFirmaDeNetlify(SECRETO)(pedidoCon(firmar()), res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it.each([
    ["sin firma", undefined],
    ["con una firma que no es un JWS", "no-es-una-firma"],
    ["firmado con otro secreto", firmar(RECLAMOS_DE_NETLIFY, {}, "otro".repeat(8))],
    ["con otro emisor", firmar({ ...RECLAMOS_DE_NETLIFY, iss: "otro" })],
    ["sin emisor", firmar({ deploy_context: "production" })],
    ["vencido", firmar(RECLAMOS_DE_NETLIFY, { expiresIn: -60 })],
    ["con otro algoritmo", firmar(RECLAMOS_DE_NETLIFY, { algorithm: "HS512" })],
  ])("exigirFirmaDeNetlify rechaza con OrigenNoPermitidoError un pedido %s", (_caso, firma) => {
    expect(() => exigirFirmaDeNetlify(SECRETO)(pedidoCon(firma), res, next)).toThrow(OrigenNoPermitidoError);
    expect(next).not.toHaveBeenCalled();
  });

  it("exigirFirmaDeNetlify rechaza un token sin firma (alg none)", () => {
    const sinFirma = jwt.sign(RECLAMOS_DE_NETLIFY, "", { algorithm: "none" });

    expect(() => exigirFirmaDeNetlify(SECRETO)(pedidoCon(sinFirma), res, next)).toThrow(
      OrigenNoPermitidoError,
    );
  });
});
