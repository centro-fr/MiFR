/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_LOGIN_DESARROLLO?: string;
  readonly VITE_INSTAGRAM_USUARIO?: string;
  readonly VITE_WHATSAPP_NUMERO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
