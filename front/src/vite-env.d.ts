/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_LOGIN_DESARROLLO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
