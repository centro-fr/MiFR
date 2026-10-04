import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

let gisListo: Promise<void> | null = null;
let alRecibirCredencial: (credential: string) => void = () => {};

function cargarGoogleIdentityServices(): Promise<void> {
  gisListo ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error -- librería oficial de Google GIS sin tipos instalados
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

export function GoogleLoginButton() {
  const btnRef = useRef<HTMLDivElement>(null);
  const { loginConGoogle, loginConToken, error: errorAuth, cargando: cargandoAuth } = useAuth();

  const [cargandoLocal, setCargandoLocal] = useState<boolean>(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [pestaña, setPestaña] = useState<"google" | "manual">("google");
  const [tokenManual, setTokenManual] = useState<string>("");

  const error = errorLocal ?? errorAuth;
  const cargando = cargandoLocal || cargandoAuth;

  useEffect(() => {
    let montado = true;

    alRecibirCredencial = async (credential: string) => {
      setCargandoLocal(true);
      setErrorLocal(null);
      try {
        await loginConGoogle(credential);
      } catch (err) {
        if (montado) {
          setErrorLocal(err instanceof Error ? err.message : "Error al iniciar sesión con Google");
        }
      } finally {
        if (montado) setCargandoLocal(false);
      }
    };

    cargarGoogleIdentityServices()
      .then(() => {
        if (!montado || !btnRef.current) return;
        // @ts-expect-error -- librería oficial de Google GIS
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          locale: "es",
        });
      })
      .catch((err: Error) => montado && setErrorLocal(err.message));

    return () => {
      montado = false;
    };
  }, [loginConGoogle]);

  async function probarTokenManual(e: React.FormEvent) {
    e.preventDefault();
    const tokenLimpio = tokenManual.trim();
    if (!tokenLimpio) {
      setErrorLocal("Por favor ingresá un token JWT");
      return;
    }

    setCargandoLocal(true);
    setErrorLocal(null);

    try {
      await loginConToken(tokenLimpio);
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Token inválido o expirado");
    } finally {
      setCargandoLocal(false);
    }
  }

  return (
    <div className="login-card-wrapper">
      <div className="auth-container">
        <header className="auth-header">
          <span className="brand-badge">MiFR</span>
          <h1 className="auth-title">Centro de Entrenamiento FR</h1>
          <p className="auth-subtitle">Portal de Acceso y Gestión de Identidad</p>
        </header>

        <main className="auth-body">
          {error && (
            <div className="alert-error" role="alert">
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <div>
                <strong>Error: </strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="tabs-container">
            <button
              type="button"
              className={`tab-btn ${pestaña === "google" ? "active" : ""}`}
              onClick={() => {
                setPestaña("google");
                setErrorLocal(null);
              }}
            >
              Google Auth (US-01)
            </button>
            <button
              type="button"
              className={`tab-btn ${pestaña === "manual" ? "active" : ""}`}
              onClick={() => {
                setPestaña("manual");
                setErrorLocal(null);
              }}
            >
              Token Directo (Dev)
            </button>
          </div>

          {cargando && (
            <div className="loading-state">
              <span className="spinner" />
              <span>Validando credenciales con el servidor...</span>
            </div>
          )}

          {/* Pestaña Google */}
          {pestaña === "google" && (
            <div
              style={{
                display: cargando ? "none" : "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                padding: "16px 0",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-muted)", textAlign: "center" }}>
                Iniciá sesión con tu cuenta de Google habilitada en el centro:
              </p>
              <div ref={btnRef} />
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center" }}>
                El sistema no utiliza contraseñas locales y verifica tu pre-registro en la base de datos.
              </span>
            </div>
          )}

          {/* Pestaña Manual (para desarrolladores con token emitido por CLI) */}
          {pestaña === "manual" && !cargando && (
            <form onSubmit={probarTokenManual} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label htmlFor="token-input" style={{ fontSize: "13px", fontWeight: 600 }}>
                Pegar token JWT (generado con <code>corepack pnpm --filter back token</code>):
              </label>
              <textarea
                id="token-input"
                className="dev-token-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
                value={tokenManual}
                onChange={(e) => setTokenManual(e.target.value)}
                rows={3}
              />
              <button type="submit" className="btn btn-primary">
                Cargar Sesión (/auth/me)
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
