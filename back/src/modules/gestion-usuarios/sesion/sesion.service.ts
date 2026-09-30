import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../shared/errors/app-error.js";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { UsuarioRepository } from "../usuario/user.repository.js";
import type {
  IAutenticacion,
  PerfilSesion,
  SesionIniciada,
  SesionPayload,
} from "./interface/i-autenticacion.js";
import type { IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";
import type { JwtService } from "./jwt.service.js";

// Componente "Sesion": inicia sesión con Google y valida el token propio en cada request.
export class SesionService implements IAutenticacion {
  constructor(
    private readonly repositorio: UsuarioRepository,
    private readonly googleAuth: IAutenticacionGoogleAuth,
    private readonly jwtService: JwtService,
    private readonly autorizacion: IAutorizacion,
  ) {}

  async iniciarSesion(idToken: string): Promise<SesionIniciada> {
    const datos = await this.googleAuth.verificarToken(idToken);

    let usuario = await this.repositorio.buscarPorGoogleId(datos.googleId);

    if (!usuario) {
      usuario = await this.repositorio.buscarPorEmail(datos.email);
      if (usuario) usuario = await this.repositorio.vincularGoogleId(usuario.id_usuario, datos.googleId);
    }

    // No hay auto-registro: solo puede loguearse quien ya fue dado de alta
    // (pre-inscripción de quien administra el centro/profesora + primer pago confirmado).
    if (!usuario) {
      auditar("LOGIN_NO_REGISTRADO", { email: datos.email });
      throw new UsuarioNoRegistradoError();
    }

    if (usuario.estado === "INACTIVO") {
      auditar("LOGIN_USUARIO_INACTIVO", { id_usuario: usuario.id_usuario, email: datos.email });
      throw new ForbiddenError("Usuario inactivo");
    }

    const permisos = await this.autorizacion.permisosEfectivos(usuario.id_usuario);
    return { token: this.jwtService.emitir(usuario), usuario, permisos };
  }

  // Se relee de la base: el JWT puede haber quedado viejo si le cambiaron los roles,
  // la matriz o si lo dieron de baja después del login.
  async obtenerPerfil(idUsuario: number): Promise<PerfilSesion> {
    const usuario = await this.repositorio.buscarPorId(idUsuario);
    if (!usuario) throw new UnauthorizedError("La sesión ya no es válida");
    if (usuario.estado === "INACTIVO") throw new ForbiddenError("Usuario inactivo");

    return { usuario, permisos: await this.autorizacion.permisosEfectivos(idUsuario) };
  }

  verificarToken(token: string): SesionPayload {
    return this.jwtService.verificar(token);
  }
}
