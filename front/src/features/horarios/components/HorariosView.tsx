import { useEffect, useState } from "react";
import { listarActividades } from "../../../api/actividades";
import { crearHorario, eliminarHorario, listarHorarios } from "../../../api/horarios";
import { listarProfesoras } from "../../../api/profesoras";
import { useAuth } from "../../../hooks/useAuth";
import type { Actividad } from "../../../types/actividad";
import type { CrearHorarioInput, Horario } from "../../../types/horario";
import type { Profesora } from "../../../types/profesora";

const DIAS = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" },
  { id: 7, nombre: "Domingo" },
];

export function HorariosView() {
  const { sesion, tienePermiso } = useAuth();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [profesoras, setProfesoras] = useState<Profesora[]>([]);

  const [filtroActividad, setFiltroActividad] = useState<number>(0);
  const [filtroProfesora, setFiltroProfesora] = useState<number>(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(0); // 0 = todos

  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal de alta de horario
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [nuevo, setNuevo] = useState<CrearHorarioInput>({
    id_actividad: 0,
    id_profesora: 0,
    dia_semana: 1,
    hora_inicio: "09:00",
    hora_fin: "10:00",
    cupo_maximo: null,
  });

  const puedeEditar = tienePermiso("HORARIOS_EDITAR");

  useEffect(() => {
    if (!sesion?.token) return;
    let cancelado = false;

    Promise.all([
      listarActividades(sesion.token),
      listarProfesoras(sesion.token),
      listarHorarios(sesion.token, {
        id_actividad: filtroActividad || undefined,
        id_profesora: filtroProfesora || undefined,
      }),
    ])
      .then(([acts, profs, hors]) => {
        if (cancelado) return;
        setActividades(acts.filter((a) => a.activo));
        setProfesoras(profs.filter((p) => !p.fecha_baja));
        setHorarios(hors);
        setError(null);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar cronograma");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [filtroActividad, filtroProfesora, sesion?.token]);

  async function recargar() {
    if (!sesion?.token) return;
    setCargando(true);
    try {
      const [acts, profs, hors] = await Promise.all([
        listarActividades(sesion.token),
        listarProfesoras(sesion.token),
        listarHorarios(sesion.token, {
          id_actividad: filtroActividad || undefined,
          id_profesora: filtroProfesora || undefined,
        }),
      ]);
      setActividades(acts.filter((a) => a.activo));
      setProfesoras(profs.filter((p) => !p.fecha_baja));
      setHorarios(hors);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recargar cronograma");
    } finally {
      setCargando(false);
    }
  }

  function formatearHora(isoString: string): string {
    const d = new Date(isoString);
    const horas = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${horas}:${mins}`;
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion?.token) return;
    setError(null);
    setMensajeExito(null);

    const actId = nuevo.id_actividad || (actividades[0]?.id_actividad ?? 0);
    const profId = nuevo.id_profesora || (profesoras[0]?.id_profesora ?? 0);

    if (!actId || !profId) {
      setError("Debe existir al menos una actividad y una profesora para crear un horario");
      return;
    }

    if (nuevo.hora_fin <= nuevo.hora_inicio) {
      setError("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    try {
      await crearHorario(sesion.token, {
        ...nuevo,
        id_actividad: Number(actId),
        id_profesora: Number(profId),
        dia_semana: Number(nuevo.dia_semana),
        cupo_maximo: nuevo.cupo_maximo ? Number(nuevo.cupo_maximo) : null,
      });
      setMensajeExito("Horario creado correctamente en el cronograma");
      setMostrarModal(false);
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear horario");
    }
  }

  async function handleBaja(id: number) {
    if (!sesion?.token) return;
    if (!window.confirm("¿Seguro que deseás dar de baja este horario?")) return;

    setError(null);
    setMensajeExito(null);
    try {
      const res = await eliminarHorario(sesion.token, id);
      setMensajeExito(
        res.advertencia
          ? `Horario dado de baja. Advertencia: ${res.advertencia}`
          : "Horario dado de baja correctamente",
      );
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al dar de baja horario");
    }
  }

  const horariosFiltrados = horarios.filter(
    (h) => diaSeleccionado === 0 || h.dia_semana === diaSeleccionado,
  );

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Cronograma de Horarios (US-04)</h2>
          <p className="view-subtitle">Grilla semanal de clases, asignación docente y cupos efectivos</p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setMostrarModal(true)}>
            + Nuevo Horario
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      {mensajeExito && <div className="alert-success" style={{ marginBottom: 16 }}>✅ {mensajeExito}</div>}

      {/* Barra de Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <select
          className="form-input"
          style={{ width: "auto" }}
          value={filtroActividad}
          onChange={(e) => setFiltroActividad(Number(e.target.value))}
        >
          <option value={0}>Todas las actividades</option>
          {actividades.map((a) => (
            <option key={a.id_actividad} value={a.id_actividad}>
              {a.nombre} ({a.modalidad})
            </option>
          ))}
        </select>

        <select
          className="form-input"
          style={{ width: "auto" }}
          value={filtroProfesora}
          onChange={(e) => setFiltroProfesora(Number(e.target.value))}
        >
          <option value={0}>Todas las profesoras</option>
          {profesoras.map((p) => (
            <option key={p.id_profesora} value={p.id_profesora}>
              Profesora #{p.id_profesora} ({p.especialidad ?? "General"})
            </option>
          ))}
        </select>

        {/* Selector de Día */}
        <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
          <button
            type="button"
            className={`btn-tag ${diaSeleccionado === 0 ? "active" : ""}`}
            onClick={() => setDiaSeleccionado(0)}
          >
            Todos
          </button>
          {DIAS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`btn-tag ${diaSeleccionado === d.id ? "active" : ""}`}
              onClick={() => setDiaSeleccionado(d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>Cargando cronograma...</span>
        </div>
      ) : horariosFiltrados.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron horarios para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Horario</th>
                <th>Actividad</th>
                <th>Profesora</th>
                <th>Cupo Efectivo</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {horariosFiltrados.map((h) => {
                const diaNombre = DIAS.find((d) => d.id === h.dia_semana)?.nombre ?? `Día ${h.dia_semana}`;
                return (
                  <tr key={h.id_horario}>
                    <td>
                      <span className="dia-badge">{diaNombre}</span>
                    </td>
                    <td>
                      <strong>
                        {formatearHora(h.hora_inicio)} - {formatearHora(h.hora_fin)}
                      </strong>
                    </td>
                    <td>
                      <span>{h.actividad.nombre}</span>
                      <span
                        className={`badge ${h.actividad.modalidad === "PERSONALIZADA" ? "badge-personalizada" : "badge-grupal"}`}
                        style={{ marginLeft: 6 }}
                      >
                        {h.actividad.modalidad}
                      </span>
                    </td>
                    <td>
                      <span>Profesora #{h.id_profesora}</span>
                      {h.profesora.especialidad && (
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {h.profesora.especialidad}
                        </div>
                      )}
                    </td>
                    <td>
                      <span>{h.cupo_maximo_efectivo != null ? `${h.cupo_maximo_efectivo} alumnos` : "Sin límite"}</span>
                      {h.cupo_maximo != null && (
                        <span style={{ fontSize: "11px", color: "var(--color-primary)", display: "block" }}>
                          (propio: {h.cupo_maximo})
                        </span>
                      )}
                    </td>
                    {puedeEditar && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger-small"
                          onClick={() => handleBaja(h.id_horario)}
                        >
                          Dar de baja
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Alta Horario */}
      {mostrarModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Dar de alta nuevo horario en el cronograma</h3>
            <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label">Actividad *</label>
                <select
                  required
                  className="form-input"
                  value={nuevo.id_actividad || actividades[0]?.id_actividad || 0}
                  onChange={(e) => setNuevo({ ...nuevo, id_actividad: Number(e.target.value) })}
                >
                  {actividades.map((a) => (
                    <option key={a.id_actividad} value={a.id_actividad}>
                      {a.nombre} ({a.modalidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Profesora a cargo *</label>
                <select
                  required
                  className="form-input"
                  value={nuevo.id_profesora || profesoras[0]?.id_profesora || 0}
                  onChange={(e) => setNuevo({ ...nuevo, id_profesora: Number(e.target.value) })}
                >
                  {profesoras.map((p) => (
                    <option key={p.id_profesora} value={p.id_profesora}>
                      Profesora #{p.id_profesora} ({p.especialidad ?? "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Día de la semana *</label>
                <select
                  required
                  className="form-input"
                  value={nuevo.dia_semana}
                  onChange={(e) => setNuevo({ ...nuevo, dia_semana: Number(e.target.value) })}
                >
                  {DIAS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Hora Inicio (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={nuevo.hora_inicio}
                    onChange={(e) => setNuevo({ ...nuevo, hora_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Hora Fin (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={nuevo.hora_fin}
                    onChange={(e) => setNuevo({ ...nuevo, hora_fin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Cupo propio del horario (opcional)</label>
                <input
                  type="number"
                  min="1"
                  max="32767"
                  placeholder="Si se deja vacío, hereda el cupo de la actividad"
                  className="form-input"
                  value={nuevo.cupo_maximo ?? ""}
                  onChange={(e) =>
                    setNuevo({
                      ...nuevo,
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
                  Guardar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
