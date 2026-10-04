import { useEffect, useState } from "react";
import { actualizarActividad, crearActividad, eliminarActividad, listarActividades } from "../../../api/actividades";
import { useAuth } from "../../../hooks/useAuth";
import type { Actividad, CrearActividadInput } from "../../../types/actividad";

export function ActividadesView() {
  const { sesion, tienePermiso } = useAuth();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [busqueda, setBusqueda] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario de nueva actividad
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [nueva, setNueva] = useState<CrearActividadInput>({
    codigo: "",
    nombre: "",
    descripcion: "",
    modalidad: "GRUPAL",
    cupo_maximo: null,
  });

  const puedeEditar = tienePermiso("ACTIVIDADES_EDITAR");

  useEffect(() => {
    if (!sesion?.token) return;
    let cancelado = false;

    listarActividades(sesion.token, busqueda)
      .then((data) => {
        if (!cancelado) {
          setActividades(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar actividades");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [busqueda, sesion?.token]);

  async function recargar() {
    if (!sesion?.token) return;
    setCargando(true);
    try {
      const data = await listarActividades(sesion.token, busqueda);
      setActividades(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar actividades");
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion?.token) return;
    setError(null);
    setMensajeExito(null);

    if (nueva.modalidad === "PERSONALIZADA" && (!nueva.cupo_maximo || nueva.cupo_maximo <= 0)) {
      setError("El cupo máximo es obligatorio y debe ser mayor a 0 para clases personalizadas");
      return;
    }

    try {
      await crearActividad(sesion.token, {
        ...nueva,
        cupo_maximo: nueva.cupo_maximo ? Number(nueva.cupo_maximo) : null,
      });
      setMensajeExito(`Actividad "${nueva.nombre}" creada correctamente`);
      setMostrarModal(false);
      setNueva({ codigo: "", nombre: "", descripcion: "", modalidad: "GRUPAL", cupo_maximo: null });
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear actividad");
    }
  }

  async function handleBaja(id: number, nombre: string) {
    if (!sesion?.token) return;
    if (!window.confirm(`¿Seguro que deseás dar de baja la actividad "${nombre}"?`)) return;

    setError(null);
    setMensajeExito(null);
    try {
      await eliminarActividad(sesion.token, id);
      setMensajeExito(`Actividad "${nombre}" dada de baja`);
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al dar de baja");
    }
  }

  async function handleEditarCupo(id: number, cupoActual: number | null) {
    if (!sesion?.token) return;
    const nuevoCupoStr = window.prompt("Ingrese el nuevo cupo máximo (o vacío para quitarlo):", cupoActual?.toString() ?? "");
    if (nuevoCupoStr === null) return;

    const cupo_maximo = nuevoCupoStr.trim() === "" ? null : Number(nuevoCupoStr);
    if (cupo_maximo !== null && (Number.isNaN(cupo_maximo) || cupo_maximo <= 0)) {
      alert("El cupo debe ser un número entero mayor a 0");
      return;
    }

    try {
      await actualizarActividad(sesion.token, id, { cupo_maximo });
      setMensajeExito("Cupo actualizado correctamente");
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar cupo");
    }
  }

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Actividades del Centro (US-03)</h2>
          <p className="view-subtitle">Gestión de clases grupales y personalizadas con sus cupos</p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setMostrarModal(true)}>
            + Nueva Actividad
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      {mensajeExito && <div className="alert-success" style={{ marginBottom: 16 }}>✅ {mensajeExito}</div>}

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          className="search-input"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={recargar}>
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>Cargando actividades...</span>
        </div>
      ) : actividades.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron actividades registradas.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Modalidad</th>
                <th>Cupo Máximo</th>
                <th>Estado</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {actividades.map((act) => (
                <tr key={act.id_actividad}>
                  <td><code>{act.codigo}</code></td>
                  <td>
                    <strong>{act.nombre}</strong>
                    {act.descripcion && <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{act.descripcion}</div>}
                  </td>
                  <td>
                    <span className={`badge ${act.modalidad === "PERSONALIZADA" ? "badge-personalizada" : "badge-grupal"}`}>
                      {act.modalidad}
                    </span>
                  </td>
                  <td>
                    {act.cupo_maximo != null ? `${act.cupo_maximo} alumnos` : "Sin límite"}
                    {puedeEditar && act.activo && (
                      <button
                        type="button"
                        onClick={() => handleEditarCupo(act.id_actividad, act.cupo_maximo)}
                        className="btn-link"
                        title="Modificar cupo"
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${act.activo ? "badge-active" : "badge-inactive"}`}>
                      {act.activo ? "ACTIVA" : "BAJA"}
                    </span>
                  </td>
                  {puedeEditar && (
                    <td>
                      {act.activo && (
                        <button
                          type="button"
                          className="btn btn-danger-small"
                          onClick={() => handleBaja(act.id_actividad, act.nombre)}
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

      {/* Modal para Crear Actividad */}
      {mostrarModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Dar de alta una nueva actividad</h3>
            <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label">Código único *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: FUNCIONAL, PILATES"
                  className="form-input"
                  value={nueva.codigo}
                  onChange={(e) => setNueva({ ...nueva, codigo: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Entrenamiento Funcional"
                  className="form-input"
                  value={nueva.nombre}
                  onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción breve..."
                  className="form-input"
                  value={nueva.descripcion ?? ""}
                  onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Modalidad *</label>
                <select
                  className="form-input"
                  value={nueva.modalidad}
                  onChange={(e) =>
                    setNueva({ ...nueva, modalidad: e.target.value as "GRUPAL" | "PERSONALIZADA" })
                  }
                >
                  <option value="GRUPAL">GRUPAL (cupo opcional)</option>
                  <option value="PERSONALIZADA">PERSONALIZADA (cupo obligatorio)</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Cupo Máximo {nueva.modalidad === "PERSONALIZADA" ? "*" : "(opcional)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="32767"
                  required={nueva.modalidad === "PERSONALIZADA"}
                  placeholder={nueva.modalidad === "PERSONALIZADA" ? "Obligatorio (ej: 4)" : "Opcional"}
                  className="form-input"
                  value={nueva.cupo_maximo ?? ""}
                  onChange={(e) =>
                    setNueva({
                      ...nueva,
                      cupo_maximo: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
