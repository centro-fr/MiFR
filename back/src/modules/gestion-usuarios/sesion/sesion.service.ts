import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../shared/errors/app-error.js";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../usuario/interface/i-info-usuarios.js";
import type { UsuarioConRoles } from "../usuario/usuario.types.js";
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
    private readonly usuarios: IInfoUsuarios,
    private readonly googleAuth: IAutenticacionGoogleAuth,
    private readonly jwtService: JwtService,
    private readonly autorizacion: IAutorizacion,
  ) {}

  async iniciarSesion(idToken: string): Promise<SesionIniciada> {
    const datos = await this.googleAuth.verificarToken(idToken);
    const usuario = await this.usuarios.identificarPorGoogle(datos.googleId, datos.email);
    return this.abrirSesion(await this.actualizarFotoDeGoogle(usuario, datos.fotoUrl), datos.email);
  }

  // Mismas reglas que con Google, pero sin verificar la identidad: por eso solo se expone
  // en desarrollo y cada ingreso queda auditado.
  async iniciarSesionDesarrollo(email: string): Promise<SesionIniciada> {
    const sesion = await this.abrirSesion(await this.usuarios.buscarPorEmail(email), email);
    auditar("LOGIN_DESARROLLO", { id_usuario: sesion.usuario.id_usuario, email });
    return sesion;
  }

  async obtenerPerfil(idUsuario: number): Promise<PerfilSesion> {
    const usuario = await this.usuarioActivo(idUsuario);
    return { usuario, permisos: await this.autorizacion.permisosEfectivos(idUsuario) };
  }

  // El JWT solo prueba quién es. Los roles y el estado se releen de la base en cada pedido:
  // si después del login le quitaron un rol o lo dieron de baja, rige desde el próximo pedido
  // y no recién cuando vence el token.
  async validarSesion(token: string): Promise<SesionPayload> {
    const { usuarioId } = this.jwtService.verificar(token);
    const usuario = await this.usuarioActivo(usuarioId);
    return { usuarioId, roles: usuario.roles.map((r) => r.rol.codigo) };
  }

  // La foto se refresca en cada login para que un cambio en Google llegue a la próxima sesión.
  // No se escribe sobre un usuario inactivo ni se pisa la que había si Google no manda una.
  private async actualizarFotoDeGoogle(
    usuario: UsuarioConRoles | null,
    fotoUrl?: string,
  ): Promise<UsuarioConRoles | null> {
    if (!usuario || usuario.estado === "INACTIVO" || !fotoUrl || usuario.foto_url === fotoUrl) return usuario;
    return this.usuarios.actualizarFoto(usuario.id_usuario, fotoUrl);
  }

  private async abrirSesion(usuario: UsuarioConRoles | null, email: string): Promise<SesionIniciada> {
    // No hay auto-registro: solo puede loguearse quien ya fue dado de alta
    // (pre-inscripción de quien administra el centro/profesora + primer pago confirmado).
    if (!usuario) {
      auditar("LOGIN_NO_REGISTRADO", { email });
      throw new UsuarioNoRegistradoError();
    }

    if (usuario.estado === "INACTIVO") {
      auditar("LOGIN_USUARIO_INACTIVO", { id_usuario: usuario.id_usuario, email });
      throw new ForbiddenError("Usuario inactivo");
    }

    const permisos = await this.autorizacion.permisosEfectivos(usuario.id_usuario);
    return { token: this.jwtService.emitir(usuario), usuario, permisos };
  }

  private async usuarioActivo(idUsuario: number): Promise<UsuarioConRoles> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) throw new UnauthorizedError("La sesión ya no es válida");
    if (usuario.estado === "INACTIVO") throw new ForbiddenError("Usuario inactivo");
    return usuario;
  }
}
