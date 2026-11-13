import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OrigenNoPermitidoError } from "../errors/app-error.js";

// La regla de /api/* de netlify.toml lleva `signed`: Netlify agrega a cada pedido que reenvía un JWS
// HS256 en x-nf-sign, firmado con el secreto que comparte con la API. Sin esa firma el pedido llegó
// directo a la URL pública de Render, salteando el sitio, y con un X-Forwarded-For que eligió quien
// lo mandó: con eso podría esquivar el límite de pedidos.
const CABECERA_FIRMA = "x-nf-sign";
const EMISOR_NETLIFY = "netlify";

function esFirmaValida(firma: string, secreto: string): boolean {
  try {
    // algorithms fijo: sin él, un token con otro algoritmo podría pasar por válido.
    jwt.verify(firma, secreto, { algorithms: ["HS256"], issuer: EMISOR_NETLIFY });
    return true;
  } catch {
    return false;
  }
}

export function exigirFirmaDeNetlify(secreto: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const firma = req.get(CABECERA_FIRMA);
    if (!firma || !esFirmaValida(firma, secreto)) throw new OrigenNoPermitidoError();
    next();
  };
}
