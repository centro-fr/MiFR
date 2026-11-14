// El ingreso al sistema es con Google, y el centro pide que las cuentas sean de Gmail: un email de
// otro dominio no podría iniciar sesión con la cuenta que se espera.
const DOMINIO_GMAIL = /@gmail\.com$/i;

export const MENSAJE_EMAIL_GMAIL = "El correo tiene que ser de Gmail (termina en @gmail.com)";

export function esEmailDeGmail(email: string): boolean {
  return DOMINIO_GMAIL.test(email.trim());
}
