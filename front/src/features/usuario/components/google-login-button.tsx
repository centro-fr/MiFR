import { useEffect, useRef, useState } from "react";
import { iniciarSesionConGoogle } from "../../../api/usuario";
import type { SesionActiva } from "../../../types/usuario";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// El script de Google y su initialize() se ejecutan una sola vez por página,
// aunque React monte el componente más de una vez (StrictMode en desarrollo).
let gisListo: Promise<void> | null = null;
let alRecibirCredencial: (credential: string) => void = () => {};

function cargarGoogleIdentityServices(): Promise<void> {
  gisListo ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error -- lib de Google, sin tipos instalados
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: { credential: string }) => alRecibirCredencial(response.credential),
      });
      resolve();
    };
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.body.appendChild(script);
  });
  return gisListo;
}

// Componente de UsuarioPresWeb. Google Identity Services obtiene el id_token
// y se lo pasa al back a través del Servidor Web (/api/v1/auth/google).
// El token NO se guarda en localStorage, solo en memoria (estado de React).
export function GoogleLoginButton() {
  const btnRef = useRef<HTMLDivElement>(null);
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    alRecibirCredencial = async (credential) => {
      try {
        const nuevaSesion = await iniciarSesionConGoogle(credential);
        if (!montado) return;
        setSesion(nuevaSesion);
        setError(null);
      } catch (err) {
        if (montado) setError(err instanceof Error ? err.message : "Error desconocido");
      }
    };

    cargarGoogleIdentityServices()
      .then(() => {
        if (!montado || !btnRef.current) return;
        // @ts-expect-error -- lib de Google, sin tipos instalados
        window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large" });
      })
      .catch((err: Error) => montado && setError(err.message));

    return () => {
      montado = false;
    };
  }, []);

  function cerrarSesion() {
    setSesion(null);
    setError(null);
    // Evita que Google re-loguee solo con la última cuenta usada.
    // @ts-expect-error -- lib de Google, sin tipos instalados
    window.google?.accounts.id.disableAutoSelect();
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Se mantiene siempre montado: Google renderiza el botón acá una sola vez. */}
      <div ref={btnRef} style={{ display: sesion ? "none" : "inline-block" }} />
      {sesion && (
        <div>
          <p>
            Hola, {sesion.usuario.nombre} {sesion.usuario.apellido} ({sesion.roles.join(", ") || "sin rol"})
          </p>
          <button type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
