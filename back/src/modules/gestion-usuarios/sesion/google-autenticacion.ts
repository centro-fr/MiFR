import type { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { DatosGoogle, IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";

export class GoogleAutenticacion implements IAutenticacionGoogleAuth {
  constructor(
    private readonly client: OAuth2Client,
    private readonly googleClientId: string,
  ) {}

  async verificarToken(idToken: string): Promise<DatosGoogle> {
    // Sin audience, google-auth-library no compara el aud y aceptaría tokens emitidos para cualquier
    // otra aplicación: sin Client ID configurado el login se rechaza en lugar de abrirse.
    if (!this.googleClientId) throw new UnauthorizedError("El login con Google no está configurado");

    // verifyIdToken lanza si la firma, el audience o la expiración no son válidos.
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.googleClientId }).catch(() => {
      throw new UnauthorizedError("Token de Google inválido");
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new UnauthorizedError("Token de Google inválido");
    // La cuenta se identifica por el email: uno que Google no verificó no prueba que sea de quien entra.
    if (payload.email_verified !== true)
      throw new UnauthorizedError("El email de la cuenta de Google no está verificado");

    return {
      googleId: payload.sub,
      email: payload.email,
      nombre: payload.given_name,
      apellido: payload.family_name,
    };
  }
}
