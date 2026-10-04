import { createContext } from "react";
import type { SesionActiva } from "../types/usuario";

export interface AuthContextType {
  sesion: SesionActiva | null;
  cargando: boolean;
  error: string | null;
  loginConGoogle: (idToken: string) => Promise<void>;
  loginConToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refrescar: () => Promise<void>;
  limpiarError: () => void;
  tieneRol: (rol: string) => boolean;
  tienePermiso: (permiso: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
