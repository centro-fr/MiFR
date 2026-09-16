import { ForbiddenError, UsuarioNoRegistradoError } from "../../../shared/errors/app-error.js";
import type { UsuarioRepository } from "../usuario/user.repository.js";
import type { UsuarioConRoles } from "../usuario/user.types.js";
import type { IAutenticacion, SesionPayload } from "./interface/i-autenticacion.js";
import type { IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";
import type { JwtService } from "./jwt.service.js";

// Componente "Sesion": inicia sesión con Google y valida el token propio en cada request.
export class SesionService implements IAutenticacion {
  constructor(
    private readonly repositorio: UsuarioRepository,
    private readonly googleAuth: IAutenticacionGoogleAuth,
    private readonly jwtService: JwtService,
  ) {}

  async iniciarSesion(idToken: string): Promise<{ token: string; usuario: UsuarioConRoles }> {
    const datos = await this.googleAuth.verificarToken(idToken);

    let usuario = await this.repositorio.buscarPorGoogleId(datos.googleId);

    if (!usuario) {
      usuario = await this.repositorio.buscarPorEmail(datos.email);
      if (usuario) usuario = await this.repositorio.vincularGoogleId(usuario.id_usuario, datos.googleId);
    }

    // No hay auto-registro: solo puede loguearse quien ya fue dado de alta
    // (pre-inscripción de quien administra el centro/profesora + primer pago confirmado).
    if (!usuario) throw new UsuarioNoRegistradoError();

    if (usuario.estado === "INACTIVO") throw new ForbiddenError("Usuario inactivo");

    return { token: this.jwtService.emitir(usuario), usuario };
  }

  verificarToken(token: string): SesionPayload {
    return this.jwtService.verificar(token);
  }
}
