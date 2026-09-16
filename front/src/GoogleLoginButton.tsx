import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Usuario {
  nombre: string;
  apellido: string;
  email: string;
}

interface SesionActiva {
  token: string;
  usuario: Usuario;
  roles: string[];
}

// Ejemplo minimo: boton de Google -> login contra /api/auth/google.
// El token NO se guarda en localStorage, solo en memoria (estado de React).
export function GoogleLoginButton() {
  const btnRef = useRef<HTMLDivElement>(null);
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error -- lib de Google, sin tipos instalados
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            const res = await fetch(`${API_URL}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_token: response.credential }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message ?? "Error al loguear");
            setSesion(data);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
          }
        },
      });
      // @ts-expect-error -- lib de Google, sin tipos instalados
      window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large" });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
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
