import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) reemplazarQuery(req, schemas.query.parse(req.query));
    next();
  };
}

// En Express 5 req.query es un getter sin setter: asignarlo tira TypeError. Se redefine en la
// instancia para que el controller lea la query ya convertida (números, booleanos, defaults).
function reemplazarQuery(req: Request, query: unknown): void {
  Object.defineProperty(req, "query", { value: query, writable: true, enumerable: true, configurable: true });
}
