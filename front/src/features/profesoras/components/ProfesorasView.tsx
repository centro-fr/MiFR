import { useEffect, useState } from "react";
import { crearProfesora, eliminarProfesora, listarProfesoras } from "../../../api/profesoras";
import { listarUsuarios, type UsuarioConRolesCompleto } from "../../../api/usuarios";
import { useAuth } from "../../../hooks/useAuth";
import type { Profesora } from "../../../types/profesora";

export function ProfesorasView() {
  const { sesion, tienePermiso } = useAuth();
  const [profesoras, setProfesoras] = useState<Profesora[]>([]);
  const [usuariosProfesora, setUsuariosProfesora] = useState<UsuarioConRolesCompleto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [nuevoIdUsuario, setNuevoIdUsuario] = useState<number>(0);
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState<string>("");

  const puedeEditar = tienePermiso("HORARIOS_EDITAR");

  useEffect(() => {
    if (!sesion?.token) return;
    let cancelado = false;

    Promise.all([
      listarProfesoras(sesion.token),
      listarUsuarios(sesion.token).catch(() => []),
    ])
      .then(([profs, users]) => {
        if (cancelado) return;
        setProfesoras(profs);
        const candidatos = users.filter(
          (u) => u.estado === "ACTIVO" && u.roles.some((r) => r.rol.codigo === "PROFESORA"),
        );
        setUsuariosProfesora(candidatos);
        if (candidatos.length > 0) {
          setNuevoIdUsuario(candidatos[0].id_usuario);
        }
        setError(null);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar profesoras");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion?.token]);

  async function recargar() {
    if (!sesion?.token) return;
    setCargando(true);
    try {
      const [profs, users] = await Promise.all([
        listarProfesoras(sesion.token),
        listarUsuarios(sesion.token).catch(() => []),
      ]);
      setProfesoras(profs);
      const candidatos = users.filter(
        (u) => u.estado === "ACTIVO" && u.roles.some((r) => r.rol.codigo === "PROFESORA"),
      );
      setUsuariosProfesora(candidatos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recargar profesoras");
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion?.token || !nuevoIdUsuario) return;
    setError(null);
    setMensajeExito(null);

    try {
      await crearProfesora(sesion.token, {
        id_usuario: Number(nuevoIdUsuario),
        especialidad: nuevaEspecialidad.trim() || undefined,
      });
      setMensajeExito("Perfil de profesora creado correctamente");
      setMostrarModal(false);
      setNuevaEspecialidad("");
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear perfil de profesora");
    }
  }

  async function handleBaja(id: number) {
    if (!sesion?.token) return;
    if (!window.confirm("¿Seguro que deseás dar de baja este perfil de profesora?")) return;

    setError(null);
    setMensajeExito(null);
    try {
      await eliminarProfesora(sesion.token, id);
      setMensajeExito("Profesora dada de baja correctamente");
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al dar de baja");
    }
  }

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Profesoras (US-04)</h2>
          <p className="view-subtitle">Perfiles profesionales asignados para el dictado de clases</p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setMostrarModal(true)}>
            + Alta de Profesora
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      {mensajeExito && <div className="alert-success" style={{ marginBottom: 16 }}>✅ {mensajeExito}</div>}

      {cargando ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>Cargando profesoras...</span>
        </div>
      ) : profesoras.length === 0 ? (
        <div className="empty-state">
          <p>No hay profesoras activas registradas.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ID Usuario</th>
                <th>Especialidad</th>
                <th>Fecha de Alta</th>
                <th>Estado</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {profesoras.map((prof) => (
                <tr key={prof.id_profesora}>
                  <td>#{prof.id_profesora}</td>
                  <td>
                    <strong>Usuario #{prof.id_usuario}</strong>
                  </td>
                  <td>{prof.especialidad ?? "General"}</td>
                  <td>{new Date(prof.fecha_alta).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${prof.fecha_baja ? "badge-inactive" : "badge-active"}`}>
                      {prof.fecha_baja ? "BAJA" : "ACTIVA"}
                    </span>
                  </td>
                  {puedeEditar && (
                    <td>
                      {!prof.fecha_baja && (
                        <button
                          type="button"
                          className="btn btn-danger-small"
                          onClick={() => handleBaja(prof.id_profesora)}
                        >
                          Dar de baja
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Alta Profesora */}
      {mostrarModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Vincular nuevo perfil de profesora</h3>
            <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label">Usuario con rol PROFESORA *</label>
                {usuariosProfesora.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--color-error)" }}>
                    No hay usuarios activos con rol PROFESORA disponibles sin perfil asignado.
                  </p>
                ) : (
                  <select
                    className="form-input"
                    value={nuevoIdUsuario}
                    onChange={(e) => setNuevoIdUsuario(Number(e.target.value))}
                  >
                    {usuariosProfesora.map((u) => (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        #{u.id_usuario} - {u.nombre} {u.apellido} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="form-label">Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej: Funcional, Musculación, Pilates..."
                  className="form-input"
                  value={nuevaEspecialidad}
                  onChange={(e) => setNuevaEspecialidad(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={usuariosProfesora.length === 0}
                  className="btn btn-primary"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
