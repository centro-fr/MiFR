import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { UsuarioConRoles, UsuarioRol } from "../usuario/usuario.types.js";
import type { SesionPayload } from "./interface/i-autenticacion.js";

// Detalle interno del componente Sesion: solo firma/verifica el JWT propio.
export class JwtService {
  constructor(
    private readonly secreto: string,
    private readonly expiraEn: string = "8h",
  ) {}

  emitir(usuario: UsuarioConRoles): string {
    return jwt.sign(
      { sub: String(usuario.id_usuario), roles: usuario.roles.map((r: UsuarioRol) => r.rol.codigo) },
      this.secreto,
      { expiresIn: this.expiraEn as jwt.SignOptions["expiresIn"] },
    );
  }

  verificar(token: string): SesionPayload {
    try {
      const payload = jwt.verify(token, this.secreto) as { sub: string; roles: string[] };
      const usuarioId = Number(payload.sub);
      // Tokens emitidos antes de que id_usuario fuera SERIAL traen un uuid.
      if (!Number.isInteger(usuarioId)) throw new Error("sub inválido");
      return { usuarioId, roles: payload.roles };
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }
  }
}
