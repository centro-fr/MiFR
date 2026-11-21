import type { AuthErrorCode } from "@/types/auth";

export type TonoDeAviso = "error" | "neutro";

export interface AvisoDeLogin {
  tono: TonoDeAviso;
  titulo: string;
  texto: string;
  /** Lo que pasa a decir el botón de Google mientras se muestra el aviso. */
  accion: string;
}

export const ETIQUETA_INICIAL = "Continuar con Google";
export const ETIQUETA_CONECTANDO = "Conectando con Google…";

const REINTENTAR = "Reintentar con Google";

const SIN_ACCESO: AvisoDeLogin = {
  tono: "error",
  titulo: "Esta cuenta no tiene acceso",
  texto: "Pedile al centro que habilite tu correo, o entrá con otra cuenta.",
  accion: "Usar otra cuenta",
};

// Un Record (y no un Partial) obliga a decidir el texto de cada error nuevo que se agregue al tipo.
const AVISOS: Record<AuthErrorCode, AvisoDeLogin> = {
  ACCESO_NO_HABILITADO: SIN_ACCESO,
  USUARIO_INACTIVO: SIN_ACCESO,
  POPUP_CANCELADO: {
    tono: "neutro",
    titulo: "Cerraste la ventana de Google",
    texto: "Podés volver a intentarlo cuando quieras.",
    accion: ETIQUETA_INICIAL,
  },
  POPUP_BLOQUEADO: {
    tono: "error",
    titulo: "No pudimos abrir la ventana de Google",
    texto: "Tu navegador la bloqueó. Habilitá las ventanas emergentes para este sitio e intentá de nuevo.",
    accion: REINTENTAR,
  },
  INVALID_GOOGLE_TOKEN: {
    tono: "error",
    titulo: "No pudimos validar tu cuenta de Google",
    texto: "Volvé a intentarlo.",
    accion: REINTENTAR,
  },
  ERROR_SERVIDOR: {
    tono: "error",
    titulo: "No pudimos iniciar sesión",
    texto: "El servidor tuvo un problema. Intentá de nuevo en unos minutos.",
    accion: REINTENTAR,
  },
  RED_ERROR: {
    tono: "error",
    titulo: "No pudimos conectar con Google",
    texto: "Revisá tu conexión y que el navegador permita ventanas emergentes.",
    accion: REINTENTAR,
  },
};

export function avisoDeLogin(code: AuthErrorCode): AvisoDeLogin {
  return AVISOS[code];
}

export function etiquetaDelBotonGoogle(code: AuthErrorCode | null, isLoading: boolean): string {
  if (isLoading) return ETIQUETA_CONECTANDO;
  return code ? AVISOS[code].accion : ETIQUETA_INICIAL;
}
