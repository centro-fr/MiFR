import type { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { DatosGoogle, IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";

export class GoogleAutenticacion implements IAutenticacionGoogleAuth {
  constructor(
    private readonly client: OAuth2Client,
    private readonly googleClientId: string,
  ) {}

  async verificarToken(idToken: string): Promise<DatosGoogle> {
    // verifyIdToken lanza si la firma, el audience o la expiración no son válidos.
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.googleClientId }).catch(() => {
      throw new UnauthorizedError("Token de Google inválido");
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new UnauthorizedError("Token de Google inválido");

    return {
      googleId: payload.sub,
      email: payload.email,
      nombre: payload.given_name,
      apellido: payload.family_name,
    };
  }
}
