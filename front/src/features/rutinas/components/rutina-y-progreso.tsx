import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Dumbbell, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { MiniaturaEjercicio } from "@/features/rutinas/components/miniatura-ejercicio";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogoMedicion } from "@/features/rutinas/components/dialogo-medicion";
import { DialogoRutina } from "@/features/rutinas/components/dialogo-rutina";
import { resolverGifUrl } from "@/features/rutinas/data/catalogo-ejercicios";
import { useEliminarRutina, useMedicionesDeAlumno, useRutinasDeAlumno } from "@/features/rutinas/hooks/use-rutinas";
import { MEDIDAS, type CodigoMedida } from "@/features/rutinas/schemas/medidas";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { Rutina } from "@/types/rutinas";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface PropsRutinaYProgreso {
  idAlumno: number;
  nombreAlumno: string;
  admiteCargas: boolean;
}

function formatearFechaCorta(fechaIso: string): string {
  const solo = fechaIso.slice(0, 10);
  const partes = solo.split("-");
  const dia = partes[2];
  const mes = partes[1];
  const anio = partes[0];
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : solo;
}

const METRICAS_PROGRESO: { codigo: CodigoMedida; etiqueta: string }[] = [
  { codigo: "PESO", etiqueta: "Peso" },
  { codigo: "CINTURA", etiqueta: "Cintura" },
  { codigo: "CADERA", etiqueta: "Cadera" },
  { codigo: "BRAZO", etiqueta: "Brazo" },
  { codigo: "GRASA_CORPORAL", etiqueta: "Grasa corporal" },
];

export function RutinaYProgreso({ idAlumno, nombreAlumno, admiteCargas }: PropsRutinaYProgreso) {
  const { hasPermission } = usePermissions();
  const puedeCargar = admiteCargas && hasPermission("RUTINAS_EDITAR");

  const consultaRutinas = useRutinasDeAlumno(idAlumno, true);
  const eliminarRutina = useEliminarRutina(idAlumno);
  const consultaMediciones = useMedicionesDeAlumno(idAlumno, true);

  const [modalRutinaAbierto, setModalRutinaAbierto] = useState(false);
  const [rutinaAEditar, setRutinaAEditar] = useState<Rutina | null>(null);
  const [rutinaAEliminar, setRutinaAEliminar] = useState<Rutina | null>(null);
  const [modalMedicionAbierto, setModalMedicionAbierto] = useState(false);

  const rutinas = consultaRutinas.data ?? [];
  const mediciones = useMemo(() => consultaMediciones.data ?? [], [consultaMediciones.data]);

  // Estado para acordeón de rutinas (id de la rutina abierta, por defecto la primera)
  const [rutinaExpandidaId, setRutinaExpandidaId] = useState<number | null>(null);
  const [diaSeleccionadoPorRutina, setDiaSeleccionadoPorRutina] = useState<Record<number, number>>({});

  // Métrica activa en progreso
  const [metricaActiva, setMetricaActiva] = useState<CodigoMedida>("PESO");

  const rutinaActivaId = rutinaExpandidaId ?? (rutinas.length > 0 ? rutinas[0].id : null);

  // Datos de la métrica en progreso
  const datosMetrica = useMemo(() => {
    const filas: { fecha: string; valor: number; cambio: number | null }[] = [];
    const conValor = mediciones
      .map((m) => {
        const item = m.medidas.find((med) => med.codigo === metricaActiva);
        return item ? { fecha: m.fecha, valor: item.valor } : null;
      })
      .filter((x): x is { fecha: string; valor: number } => x !== null);

    // Ordenar de más reciente a más antigua
    conValor.sort((a, b) => b.fecha.localeCompare(a.fecha));

    for (let i = 0; i < conValor.length; i++) {
      const actual = conValor[i];
      const anterior = conValor[i + 1];
      const cambio = anterior ? Number((actual.valor - anterior.valor).toFixed(1)) : null;
      filas.push({ fecha: actual.fecha, valor: actual.valor, cambio });
    }
    return filas;
  }, [mediciones, metricaActiva]);

  // Resumen de cambio desde la primera medición
  const resumenCambio = useMemo(() => {
    if (datosMetrica.length < 2) return null;
    const masReciente = datosMetrica[0];
    const primera = datosMetrica[datosMetrica.length - 1];
    const dif = Number((masReciente.valor - primera.valor).toFixed(1));
    const unidad = MEDIDAS[metricaActiva].unidad;
    const fechaPrim = formatearFechaCorta(primera.fecha);

    if (dif < 0) {
      return `Bajó ${Math.abs(dif).toString().replace(".", ",")} ${unidad} desde la primera medición (${fechaPrim}).`;
    }
    if (dif > 0) {
      return `Subió ${dif.toString().replace(".", ",")} ${unidad} desde la primera medición (${fechaPrim}).`;
    }
    return `Se mantiene igual desde la primera medición (${fechaPrim}).`;
  }, [datosMetrica, metricaActiva]);

  return (
    <div className="space-y-4">
      {!admiteCargas && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Está dado de baja: se puede consultar su historial, pero no cargarle rutinas ni mediciones nuevas.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Columna Izquierda: RUTINAS */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Rutinas
            </h2>
            {puedeCargar && (
              <button
                type="button"
                onClick={() => {
                  setRutinaAEditar(null);
                  setModalRutinaAbierto(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus className="size-3.5" />
                <span>Nueva rutina</span>
              </button>
            )}
          </div>

          {rutinas.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Todavía no tiene una rutina cargada
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {rutinas.map((rutina) => {
                const estaExpandida = rutina.id === rutinaActivaId;
                const diaIdx = diaSeleccionadoPorRutina[rutina.id] ?? 0;
                const diaActual = rutina.dias[diaIdx] ?? rutina.dias[0];
                const periodoTexto = rutina.hasta
                  ? `${formatearFechaCorta(rutina.desde)} al ${formatearFechaCorta(rutina.hasta)}`
                  : `Desde el ${formatearFechaCorta(rutina.desde)}`;

                return (
                  <div key={rutina.id} className="py-3 first:pt-1 last:pb-1">
                    {/* Header del acordeón de la rutina */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setRutinaExpandidaId(estaExpandida ? null : rutina.id)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRutinaExpandidaId(estaExpandida ? null : rutina.id);
                        }
                      }}
                      className="flex w-full items-center justify-between text-left py-1 group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                          {rutina.nombre}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {periodoTexto}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {puedeCargar && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRutinaAEditar(rutina);
                                setModalRutinaAbierto(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              title="Editar rutina"
                            >
                              <Pencil className="size-3 text-slate-500" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRutinaAEliminar(rutina);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 shadow-2xs transition-colors hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Eliminar rutina"
                            >
                              <Trash2 className="size-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                        {rutina.vigente && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Vigente
                          </span>
                        )}
                        {estaExpandida ? (
                          <ChevronUp className="size-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="size-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Contenido si está expandida */}
                    {estaExpandida && (
                      <div className="mt-4 space-y-4 pt-1">
                        {/* Píldoras de días */}
                        {rutina.dias.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            {rutina.dias.map((d, dIdx) => (
                              <button
                                key={d.nombre + dIdx}
                                type="button"
                                onClick={() =>
                                  setDiaSeleccionadoPorRutina((prev) => ({
                                    ...prev,
                                    [rutina.id]: dIdx,
                                  }))
                                }
                                className={cn(
                                  "rounded-full px-3 py-1 text-xs font-bold transition-all",
                                  diaIdx === dIdx
                                    ? "bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                                )}
                              >
                                Día {dIdx + 1} {d.nombre ? `· ${d.nombre}` : ""}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Ejercicios del día actual */}
                        {diaActual?.ejercicios?.length ? (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {diaActual.ejercicios.map((ej, eIdx) => {
                              const gifUrl = resolverGifUrl(ej.nombre);
                              return (
                                <div
                                  key={ej.nombre + eIdx}
                                  className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {gifUrl ? (
                                      <MiniaturaEjercicio nombre={ej.nombre} gifUrl={gifUrl} className="size-10" />
                                    ) : (
                                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        <Dumbbell className="size-4" />
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {ej.nombre}
                                      </p>
                                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                        {ej.notas || "Sin especificaciones"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 font-bold text-sm text-slate-900 dark:text-white pl-3">
                                    {ej.series} × {ej.repeticiones}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            No hay ejercicios cargados para este día.
                          </p>
                        )}

                        {/* Observación suave al pie */}
                        {rutina.observaciones && (
                          <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60 font-medium">
                            {rutina.observaciones}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Columna Derecha: PROGRESO */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Progreso
            </h2>
            {puedeCargar && (
              <button
                type="button"
                onClick={() => setModalMedicionAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus className="size-3.5" />
                <span>Registrar medición</span>
              </button>
            )}
          </div>

          {mediciones.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Todavía no tiene mediciones registradas
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-3">
              {/* Píldoras de métricas */}
              <div className="flex flex-wrap items-center gap-2">
                {METRICAS_PROGRESO.map((m) => {
                  const activa = metricaActiva === m.codigo;
                  return (
                    <button
                      key={m.codigo}
                      type="button"
                      onClick={() => setMetricaActiva(m.codigo)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold transition-all",
                        activa
                          ? "bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                      )}
                    >
                      {m.etiqueta}
                    </button>
                  );
                })}
              </div>

              {/* Resumen */}
              {resumenCambio && (
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                  {resumenCambio}
                </p>
              )}

              {/* Tabla de progreso */}
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center">
                        {MEDIDAS[metricaActiva].etiqueta}
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Cambio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {datosMetrica.map((fila, idx) => {
                      const unidad = MEDIDAS[metricaActiva].unidad;
                      const textoCambio =
                        fila.cambio !== null
                          ? `${fila.cambio > 0 ? `+${fila.cambio}` : fila.cambio} ${unidad}`.replace(".", ",")
                          : "—";

                      return (
                        <tr
                          key={fila.fecha + idx}
                          className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60"
                        >
                          <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 font-medium">
                            {formatearFechaCorta(fila.fecha)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                            {fila.valor.toString().replace(".", ",")} {unidad}
                          </td>
                          <td className="px-6 py-3.5 text-right text-slate-500 dark:text-slate-400 font-medium">
                            {textoCambio}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modales */}
      {modalRutinaAbierto && (
        <DialogoRutina
          abierto={modalRutinaAbierto}
          idAlumno={idAlumno}
          nombreAlumno={nombreAlumno}
          rutinaAEditar={rutinaAEditar}
          rutinasExistentes={rutinas}
          onClose={() => {
            setModalRutinaAbierto(false);
            setRutinaAEditar(null);
            void consultaRutinas.refetch();
          }}
        />
      )}

      {modalMedicionAbierto && (
        <DialogoMedicion
          abierto={modalMedicionAbierto}
          idAlumno={idAlumno}
          nombreAlumno={nombreAlumno}
          medicion={null}
          mediciones={mediciones}
          onClose={() => {
            setModalMedicionAbierto(false);
            void consultaMediciones.refetch();
          }}
        />
      )}

      {/* Confirmación para eliminar rutina */}
      {rutinaAEliminar && (
        <AlertDialog
          open={Boolean(rutinaAEliminar)}
          onOpenChange={(abrir) => !abrir && !eliminarRutina.isPending && setRutinaAEliminar(null)}
        >
          <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
            <AlertDialogHeader className={CABECERA_MODAL}>
              <AlertDialogTitle className={TITULO_MODAL}>
                ¿Eliminar rutina?
              </AlertDialogTitle>
              <AlertDialogDescription className={DESCRIPCION_MODAL}>
                Se eliminará la rutina <strong className="text-slate-900 dark:text-white">&quot;{rutinaAEliminar.nombre}&quot;</strong> del alumno {nombreAlumno}. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={PIE_MODAL}>
              <AlertDialogCancel
                disabled={eliminarRutina.isPending}
                className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={eliminarRutina.isPending}
                onClick={async () => {
                  try {
                    await eliminarRutina.mutateAsync(rutinaAEliminar.id);
                    toast.success("Rutina eliminada.");
                    setRutinaAEliminar(null);
                  } catch (err) {
                    toast.error(mensajeDeErrorApi(err, "No se pudo eliminar la rutina."));
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              >
                {eliminarRutina.isPending ? "Eliminando..." : "Eliminar rutina"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
