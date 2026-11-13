import type { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { DatosGoogle, IAutenticacionGoogleAuth } from "./interface/i-autenticacion-google-auth.js";

const LARGO_MAXIMO_FOTO = 500;

// La foto es un dato opcional de Google: si viene rara se ignora, no se rechaza un login que
// Google ya validó. El CHECK de la base exige https, sin espacios y hasta 500 caracteres.
function fotoValida(picture: unknown): string | undefined {
  if (typeof picture !== "string") return undefined;
  if (picture.length > LARGO_MAXIMO_FOTO) return undefined;
  if (!picture.startsWith("https://")) return undefined;
  if (/\s/.test(picture)) return undefined;
  return picture;
}

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
      fotoUrl: fotoValida(payload.picture),
    };
  }
}
