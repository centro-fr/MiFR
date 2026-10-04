import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ActividadesView } from "../features/actividades/components/ActividadesView";
import { HorariosView } from "../features/horarios/components/HorariosView";
import { ProfesorasView } from "../features/profesoras/components/ProfesorasView";
import { MatrizPermisosView } from "../features/seguridad/components/MatrizPermisosView";
import { PerfilView } from "../features/usuario/components/PerfilView";
import { UsuariosView } from "../features/usuarios/components/UsuariosView";

export type Seccion = "actividades" | "horarios" | "profesoras" | "seguridad" | "usuarios" | "perfil";

export function AppLayout() {
  const { sesion, logout, tieneRol, tienePermiso } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState<Seccion>("actividades");
  const [tokenCopiado, setTokenCopiado] = useState<boolean>(false);

  if (!sesion) return null;

  const esPropietaria = tieneRol("PROPIETARIA");
  const puedeVerSeguridad = esPropietaria || tienePermiso("SEGURIDAD_MATRIZ_VER");

  async function copiarTokenRapido() {
    if (!sesion?.token) return;
    try {
      await navigator.clipboard.writeText(sesion.token);
      setTokenCopiado(true);
      setTimeout(() => setTokenCopiado(false), 2000);
    } catch {
      alert("No se pudo copiar el token automáticamente");
    }
  }

  return (
    <div className="app-shell">
      {/* Barra superior de navegación */}
      <header className="app-navbar">
        <div className="navbar-container">
          <div className="navbar-brand" onClick={() => setSeccionActiva("actividades")}>
            <span className="brand-logo">MiFR</span>
            <span className="brand-name">Centro de Entrenamiento FR</span>
          </div>

          <div className="navbar-actions">
            <button
              type="button"
              className={`btn-token-quick ${tokenCopiado ? "copied" : ""}`}
              onClick={copiarTokenRapido}
              title="Copiar token JWT para REST Client o Swagger"
            >
              {tokenCopiado ? "✓ Token copiado" : "🔑 Copiar Token"}
            </button>

            <div className="user-badge" onClick={() => setSeccionActiva("perfil")}>
              <div className="user-initial">{sesion.usuario.nombre.charAt(0).toUpperCase()}</div>
              <span className="user-label">
                {sesion.usuario.nombre} ({sesion.roles[0] ?? "Usuario"})
              </span>
            </div>

            <button type="button" className="btn btn-secondary-small" onClick={logout}>
              Salir
            </button>
          </div>
        </div>

        {/* Pestañas de secciones */}
        <nav className="navbar-tabs">
          <div className="tabs-wrapper">
            <button
              type="button"
              className={`nav-tab ${seccionActiva === "actividades" ? "active" : ""}`}
              onClick={() => setSeccionActiva("actividades")}
            >
              📋 Actividades
            </button>

            <button
              type="button"
              className={`nav-tab ${seccionActiva === "horarios" ? "active" : ""}`}
              onClick={() => setSeccionActiva("horarios")}
            >
              📅 Cronograma y Horarios
            </button>

            <button
              type="button"
              className={`nav-tab ${seccionActiva === "profesoras" ? "active" : ""}`}
              onClick={() => setSeccionActiva("profesoras")}
            >
              👩‍🏫 Profesoras
            </button>

            {puedeVerSeguridad && (
              <button
                type="button"
                className={`nav-tab ${seccionActiva === "seguridad" ? "active" : ""}`}
                onClick={() => setSeccionActiva("seguridad")}
              >
                🔒 Matriz de Permisos
              </button>
            )}

            <button
              type="button"
              className={`nav-tab ${seccionActiva === "usuarios" ? "active" : ""}`}
              onClick={() => setSeccionActiva("usuarios")}
            >
              👥 Usuarios
            </button>

            <button
              type="button"
              className={`nav-tab ${seccionActiva === "perfil" ? "active" : ""}`}
              onClick={() => setSeccionActiva("perfil")}
            >
              👤 Mi Perfil
            </button>
          </div>
        </nav>
      </header>

      {/* Contenido principal según pestaña */}
      <main className="app-main">
        {seccionActiva === "actividades" && <ActividadesView />}
        {seccionActiva === "horarios" && <HorariosView />}
        {seccionActiva === "profesoras" && <ProfesorasView />}
        {seccionActiva === "seguridad" && puedeVerSeguridad && <MatrizPermisosView />}
        {seccionActiva === "usuarios" && <UsuariosView />}
        {seccionActiva === "perfil" && <PerfilView />}
      </main>
    </div>
  );
}
