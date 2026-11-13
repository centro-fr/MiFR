import { HttpResponse } from "msw";
import type { RoleCode } from "@/types/auth";
import { db } from "@/mocks/db";
import type { UsuarioSemilla } from "@/mocks/data/semilla";

// Réplica de los middlewares del back (shared/middlewares/auth.ts) y de su formato
// de error { error: { code, message } }, para que el front maneje los mismos casos.

export const MOCK_JWT = "mock-jwt-token";

export function errorApi(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

export function permisosDeRoles(roles: RoleCode[]): string[] {
  return [...new Set(roles.flatMap((rol) => db.matriz[rol]))];
}

export function usuarioDeLaSesion(request: Request): UsuarioSemilla | null {
  if (request.headers.get("authorization") !== `Bearer ${MOCK_JWT}`) return null;
  return db.usuarios.find((usuario) => usuario.id_usuario === db.idUsuarioSesion) ?? null;
}

interface Exigencias {
  rol?: RoleCode;
  permiso?: string;
}

// Devuelve la respuesta de error si la petición no cumple, o null si puede seguir.
export function verificarAcceso(request: Request, { rol, permiso }: Exigencias = {}) {
  const usuario = usuarioDeLaSesion(request);
  if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
  if (rol && !usuario.roles.includes(rol)) {
    return errorApi(403, "FORBIDDEN", "No tiene permisos para esta acción");
  }
  if (permiso && !permisosDeRoles(usuario.roles).includes(permiso)) {
    return errorApi(403, "FORBIDDEN", "No tiene permisos para esta acción");
  }
  return null;
}

export function idDeRuta(valor: string | readonly string[] | undefined): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function idInvalido() {
  return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
}
