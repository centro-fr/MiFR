import { useEffect, useState } from "react";
import { listarUsuarios, type UsuarioConRolesCompleto } from "../../../api/usuarios";
import { useAuth } from "../../../hooks/useAuth";

export function UsuariosView() {
  const { sesion } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConRolesCompleto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sesion?.token) return;
    let cancelado = false;

    listarUsuarios(sesion.token)
      .then((data) => {
        if (!cancelado) {
          setUsuarios(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar usuarios");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion?.token]);

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Usuarios del Centro</h2>
          <p className="view-subtitle">Personas dadas de alta, estado de habilitación y roles asignados</p>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      {cargando ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>Cargando usuarios...</span>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron usuarios registrados.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre y Apellido</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Roles Asignados</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>#{u.id_usuario}</td>
                  <td>
                    <strong>
                      {u.nombre} {u.apellido}
                    </strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.estado === "ACTIVO" ? "badge-active" : "badge-inactive"}`}>
                      {u.estado ?? "ACTIVO"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {u.roles.map((r) => (
                        <span
                          key={r.id_rol}
                          className={`badge badge-role ${r.rol.codigo === "PROPIETARIA" ? "propietaria" : ""}`}
                        >
                          {r.rol.nombre}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
