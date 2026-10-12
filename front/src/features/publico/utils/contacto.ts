import { enlaceWhatsApp } from "@/features/alumnos/utils/formato-ficha";

// Los datos de contacto del centro no los guarda el back: se configuran al publicar el front
// (VITE_INSTAGRAM_USUARIO y VITE_WHATSAPP_NUMERO). Sin configurar, el botón no se muestra.

export const MENSAJE_WHATSAPP = "Hola! Quiero sumarme a FR Centro de Entrenamiento.";

export interface EnlacesDeContacto {
  instagram: string | null;
  whatsapp: string | null;
}

// Acepta el usuario con o sin "@" y lo valida como lo hace Instagram (letras, números, punto y guion
// bajo): un valor mal cargado no arma un enlace a cualquier lado.
export function enlaceInstagram(usuario: string | undefined): string | null {
  const limpio = (usuario ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(limpio) ? `https://www.instagram.com/${limpio}/` : null;
}

export function enlaceWhatsAppConMensaje(numero: string | undefined): string | null {
  const enlace = enlaceWhatsApp(numero ?? "");
  return enlace ? `${enlace}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}` : null;
}

export function enlacesDeContacto(
  entorno: { VITE_INSTAGRAM_USUARIO?: string; VITE_WHATSAPP_NUMERO?: string } = import.meta.env,
): EnlacesDeContacto {
  return {
    instagram: enlaceInstagram(entorno.VITE_INSTAGRAM_USUARIO),
    whatsapp: enlaceWhatsAppConMensaje(entorno.VITE_WHATSAPP_NUMERO),
  };
}
