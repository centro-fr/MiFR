import { Fragment, useEffect, useState } from "react";
import { actualizarMatriz, obtenerMatriz } from "../../../api/seguridad";
import { useAuth } from "../../../hooks/useAuth";
import type { CambioPermiso, CodigoRol, MatrizPermisos } from "../../../types/seguridad";

export function MatrizPermisosView() {
  const { sesion, tienePermiso } = useAuth();
  const [matrizOriginal, setMatrizOriginal] = useState<MatrizPermisos | null>(null);
  const [matrizEstado, setMatrizEstado] = useState<Record<string, Set<string>>>({});
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const puedeEditar = tienePermiso("SEGURIDAD_MATRIZ_EDITAR");

  useEffect(() => {
    if (!sesion?.token) return;
    let cancelado = false;

    obtenerMatriz(sesion.token)
      .then((data) => {
        if (cancelado) return;
        setMatrizOriginal(data);
        const estado: Record<string, Set<string>> = {};
        for (const [rol, permisos] of Object.entries(data.matriz)) {
          estado[rol] = new Set(permisos);
        }
        setMatrizEstado(estado);
        setError(null);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar la matriz de permisos");
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
      const data = await obtenerMatriz(sesion.token);
      setMatrizOriginal(data);
      const estado: Record<string, Set<string>> = {};
      for (const [rol, permisos] of Object.entries(data.matriz)) {
        estado[rol] = new Set(permisos);
      }
      setMatrizEstado(estado);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recargar matriz");
    } finally {
      setCargando(false);
    }
  }

  function handleToggle(rol: CodigoRol, permisoCodigo: string, esCritico: boolean) {
    if (!puedeEditar) return;
    if (rol === "PROPIETARIA" && esCritico) {
      alert("Los permisos críticos de la propietaria son inmutables y no se pueden desmarcar (Regla RF-05).");
      return;
    }

    setMatrizEstado((prev) => {
      const nuevoSet = new Set(prev[rol]);
      if (nuevoSet.has(permisoCodigo)) {
        nuevoSet.delete(permisoCodigo);
      } else {
        nuevoSet.add(permisoCodigo);
      }
      return { ...prev, [rol]: nuevoSet };
    });
  }

  function calcularCambios(): CambioPermiso[] {
    if (!matrizOriginal) return [];
    const cambios: CambioPermiso[] = [];

    for (const rol of matrizOriginal.roles) {
      const originalSet = new Set(matrizOriginal.matriz[rol.codigo] ?? []);
      const actualSet = matrizEstado[rol.codigo] ?? new Set();

      for (const p of actualSet) {
        if (!originalSet.has(p)) {
          cambios.push({ rol: rol.codigo, permiso: p, otorgado: true });
        }
      }
      for (const p of originalSet) {
        if (!actualSet.has(p)) {
          cambios.push({ rol: rol.codigo, permiso: p, otorgado: false });
        }
      }
    }
    return cambios;
  }

  const cambiosPendientes = calcularCambios();

  async function handleGuardar() {
    if (!sesion?.token || cambiosPendientes.length === 0) return;
    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const res = await actualizarMatriz(sesion.token, { cambios: cambiosPendientes });
      setMensajeExito(`${res.mensaje} (${cambiosPendientes.length} cambios aplicados)`);
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios en la matriz");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="view-card">
        <div className="loading-state">
          <span className="spinner" />
          <span>Cargando matriz de permisos...</span>
        </div>
      </div>
    );
  }

  if (!matrizOriginal) {
    return (
      <div className="view-card">
        <div className="alert-error">⚠️ {error ?? "No se pudo cargar la configuración de seguridad."}</div>
      </div>
    );
  }

  return (
    <div className="view-card">
      <div className="view-header">
        <div>
          <h2 className="view-title">Matriz de Permisos por Rol (US-02)</h2>
          <p className="view-subtitle">
            Control de Acceso Basado en Roles (RBAC) administrado por la Propietaria
          </p>
        </div>
        {puedeEditar && cambiosPendientes.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : `Guardar Cambios (${cambiosPendientes.length})`}
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      {mensajeExito && <div className="alert-success" style={{ marginBottom: 16 }}>✅ {mensajeExito}</div>}

      {cambiosPendientes.length > 0 && (
        <div className="alert-warning" style={{ marginBottom: 16 }}>
          🔔 Tenés <strong>{cambiosPendientes.length}</strong> cambios sin guardar en la matriz.
        </div>
      )}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: "260px" }}>Módulo y Permiso</th>
              {matrizOriginal.roles.map((r) => (
                <th
                  key={r.id_rol}
                  style={{ textAlign: "center", width: "130px", minWidth: "110px" }}
                >
                  <div>{r.nombre}</div>
                  <small style={{ color: "var(--color-text-muted)", display: "block" }}>
                    {r.codigo}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrizOriginal.modulos.map((mod) => (
              <Fragment key={mod.modulo}>
                <tr className="modulo-header-row">
                  <td
                    colSpan={matrizOriginal.roles.length + 1}
                    className="modulo-header"
                  >
                    📁 Módulo: {mod.modulo}
                  </td>
                </tr>
                {mod.permisos.map((p) => (
                  <tr key={p.id_permiso} className="permiso-row">
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{p.codigo}</div>
                      {p.descripcion && (
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {p.descripcion}
                        </div>
                      )}
                      {p.critico && (
                        <span className="badge-critical" title="Permiso inmutable para Propietaria">
                          🔒 Crítico
                        </span>
                      )}
                    </td>
                    {matrizOriginal.roles.map((r) => {
                      const asignado = matrizEstado[r.codigo]?.has(p.codigo) ?? false;
                      const esCriticoProp = r.codigo === "PROPIETARIA" && p.critico;

                      return (
                        <td
                          key={r.id_rol}
                          style={{
                            textAlign: "center",
                            padding: "10px 16px",
                            background: asignado ? "#fdf2f8" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={asignado}
                            disabled={!puedeEditar || esCriticoProp}
                            onChange={() => handleToggle(r.codigo, p.codigo, p.critico)}
                            aria-label={`Permiso ${p.codigo} para rol ${r.nombre}`}
                            style={{
                              cursor: esCriticoProp || !puedeEditar ? "not-allowed" : "pointer",
                              width: "18px",
                              height: "18px",
                              accentColor: "var(--color-primary)",
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
