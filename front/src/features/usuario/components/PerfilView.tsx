import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

export function PerfilView() {
  const { sesion, refrescar, logout } = useAuth();
  const [copiado, setCopiado] = useState<boolean>(false);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!sesion) return null;

  async function copiarToken() {
    if (!sesion?.token) return;
    try {
      await navigator.clipboard.writeText(sesion.token);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert("No se pudo copiar automáticamente. Copialo manualmente desde el recuadro.");
    }
  }

  async function handleRefrescar() {
    setRefrescando(true);
    setMensaje(null);
    try {
      await refrescar();
      setMensaje("Perfil y permisos actualizados desde /auth/me");
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Mi Perfil y Sesión Activa</h2>
          <p className="view-subtitle">Información del usuario autenticado, roles y token de acceso</p>
        </div>
        <button type="button" className="btn btn-danger" onClick={logout}>
          Cerrar Sesión
        </button>
      </div>

      {mensaje && <div className="alert-success" style={{ marginBottom: 16 }}>✅ {mensaje}</div>}

      <div className="user-profile-header" style={{ marginBottom: 20 }}>
        <div className="user-avatar">{sesion.usuario.nombre.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <h3 className="user-name">
            {sesion.usuario.nombre} {sesion.usuario.apellido}
          </h3>
          <p className="user-email">{sesion.usuario.email}</p>
          <div className="badge-group">
            <span className="badge badge-active">{sesion.usuario.estado ?? "ACTIVO"}</span>
            {sesion.roles.map((rol) => (
              <span key={rol} className={`badge badge-role ${rol === "PROPIETARIA" ? "propietaria" : ""}`}>
                {rol}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recuadro de Token */}
      <div className="token-card" style={{ marginBottom: 20 }}>
        <div className="token-header">
          <span className="token-title">Token de Sesión (JWT)</span>
          <button
            type="button"
            onClick={copiarToken}
            className={`btn btn-copy ${copiado ? "copied" : ""}`}
          >
            {copiado ? "✓ ¡Copiado!" : "Copiar Token"}
          </button>
        </div>
        <div className="token-text">{sesion.token}</div>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          Usá este token en el header <code>Authorization: Bearer &lt;token&gt;</code> para tus peticiones en
          REST Client (archivo <code>US-01-login.http</code>) o Swagger.
        </span>
      </div>

      {/* Permisos */}
      <div className="permisos-section" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            Permisos Efectivos ({sesion.permisos.length})
          </h4>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefrescar}
            disabled={refrescando}
          >
            {refrescando ? "Actualizando..." : "Refrescar (/auth/me)"}
          </button>
        </div>
        <div className="permisos-grid" style={{ marginTop: 12 }}>
          {sesion.permisos.map((p) => (
            <span key={p} className="permiso-tag">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
