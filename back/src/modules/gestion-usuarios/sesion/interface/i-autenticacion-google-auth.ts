export interface DatosGoogle {
  googleId: string;
  email: string;
  nombre?: string;
  apellido?: string;
  // Foto de perfil de Google. Es opcional: si falta, la sesión conserva la última guardada.
  fotoUrl?: string;
}

// Puerto requerido por el módulo (ball-and-socket "IAutenticacionGoogleAuth" en la vista arquitectónica):
// la dependencia externa de Google que valida el idToken del navegador.
export interface IAutenticacionGoogleAuth {
  verificarToken(idToken: string): Promise<DatosGoogle>;
}
