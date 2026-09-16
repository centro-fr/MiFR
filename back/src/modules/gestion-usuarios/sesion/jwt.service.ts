import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { UsuarioConRoles, UsuarioRol } from "../usuario/user.types.js";
import type { SesionPayload } from "./interface/i-autenticacion.js";

// Detalle interno del componente Sesion: solo firma/verifica el JWT propio.
export class JwtService {
  constructor(
    private readonly secreto: string,
    private readonly expiraEn: string = "8h",
  ) {}

  emitir(usuario: UsuarioConRoles): string {
    return jwt.sign(
      { sub: usuario.id_usuario, roles: usuario.roles.map((r: UsuarioRol) => r.rol) },
      this.secreto,
      { expiresIn: this.expiraEn as jwt.SignOptions["expiresIn"] },
    );
  }

  verificar(token: string): SesionPayload {
    try {
      const payload = jwt.verify(token, this.secreto) as { sub: string; roles: string[] };
      return { usuarioId: payload.sub, roles: payload.roles };
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }
  }
}
