/**
 * Extrae la URL de la foto de perfil (claim `picture`) del ID token emitido por Google OAuth.
 * El ID token de Google es un JWT en formato standard base64url: header.payload.signature.
 * Si el token es inválido, no contiene el claim `picture` o la URL no es válida, devuelve `null`.
 */
export function extraerFotoDeGoogleToken(idToken: string): string | null {
  try {
    const partes = idToken.split(".");
    if (partes.length < 2) return null;

    let base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    const payload = JSON.parse(jsonPayload) as Record<string, unknown>;
    if (typeof payload.picture === "string" && (payload.picture.startsWith("https://") || payload.picture.startsWith("http://"))) {
      return payload.picture;
    }
    return null;
  } catch {
    return null;
  }
}
