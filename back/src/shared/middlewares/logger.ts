import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    // La IP permite rastrear un abuso y comprobar que PROXIES_DE_CONFIANZA deja ver la del visitante.
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ${req.ip}`);
  });
  next();
}
