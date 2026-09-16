import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { DatosGoogle, IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";

export class GoogleAutenticacion implements IAutenticacionGoogleAuth {
  private readonly client: OAuth2Client;

  constructor(private readonly googleClientId: string) {
    this.client = new OAuth2Client(googleClientId);
  }

  async verificarToken(idToken: string): Promise<DatosGoogle> {
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.googleClientId });
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
