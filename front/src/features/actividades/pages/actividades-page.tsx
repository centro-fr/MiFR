import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { BotonLimpiarFiltros } from "@/components/ui/boton-limpiar-filtros";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
import { FilaMovil } from "@/components/ui/fila-movil";
import { BOTON_FILA, BOTON_FILA_PELIGRO, BOTON_FILA_REINCORPORAR, LISTA_MOVIL, clasePanelFiltros } from "@/components/ui/estilos-lista";
import { BotonFiltrosMovil } from "@/components/ui/boton-filtros-movil";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalBajaActividad } from "@/features/actividades/components/modal-baja-actividad";
import { ModalFormActividad } from "@/features/actividades/components/modal-form-actividad";
import {
  useActividades,
  useActualizarActividad,
  useCrearActividad,
  useDarDeBajaActividad,
  useReactivarActividad,
} from "@/features/actividades/hooks/use-actividades";
import type { ActividadFormData } from "@/features/actividades/schemas/actividad";
import { listarHorarios } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import type { Actividad, ModalidadActividad } from "@/types/actividad";
import { cn } from "@/utils/cn";

type ModalidadFiltro = "TODAS" | ModalidadActividad;
type PestanaEstadoActividad = "VIGENTES" | "BAJAS";

function textoModalidad(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL" ? "Grupal" : "Personalizada";
}

function textoCupoActividad(cupo: number | null): string {
  if (cupo === null) return "Sin límite";
  return cupo === 1 ? "1 alumno" : `${cupo} alumnos`;
}

export function ActividadesPage() {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const { data: actividades = [], isPending, isError, error, refetch } = useActividades({ incluirBajas: true });
  const { data: horarios = [] } = useQuery({
    queryKey: HORARIOS_QUERY_KEY,
    queryFn: listarHorarios,
  });

  const crear = useCrearActividad();
  const actualizar = useActualizarActividad();
  const darDeBaja = useDarDeBajaActividad();
  const reactivar = useReactivarActividad();

  const [formAbierto, setFormAbierto] = useState(false);
  const [actividadEditar, setActividadEditar] = useState<Actividad | null>(null);
  const [actividadBaja, setActividadBaja] = useState<Actividad | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const [pestana, setPestana] = useState<PestanaEstadoActividad>("VIGENTES");
  const [busqueda, setBusqueda] = useState("");
  const [filtroModalidad, setFiltroModalidad] = useState<ModalidadFiltro>("TODAS");
  const [pagina, setPagina] = useState(0);
  const TAMANO_PAGINA = 10;

  const guardado = actividadEditar ? actualizar : crear;

  // Mapa de cantidad de horarios por actividad
  const horariosPorActividad = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const h of horarios) {
      const prev = mapa.get(h.id_actividad) ?? 0;
      mapa.set(h.id_actividad, prev + 1);
    }
    return mapa;
  }, [horarios]);

  // Máximo de inscriptos en una clase para cada actividad
  const maxInscriptosPorActividad = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const h of horarios) {
      const inscriptos = (h as { inscriptos?: number }).inscriptos ?? 0;
      const prev = mapa.get(h.id_actividad) ?? 0;
      if (inscriptos > prev) {
        mapa.set(h.id_actividad, inscriptos);
      }
    }
    return mapa;
  }, [horarios]);

  const abrirNueva = () => {
    crear.reset();
    setActividadEditar(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (actividad: Actividad) => {
    actualizar.reset();
    setActividadEditar(actividad);
    setFormAbierto(true);
  };

  const abrirConfirmacionBaja = (actividad: Actividad) => {
    setErrorBaja(null);
    setActividadBaja(actividad);
  };

  const handleConfirmarBaja = () => {
    if (!actividadBaja) return;
    setErrorBaja(null);
    darDeBaja.mutate(actividadBaja.id, {
      onSuccess: () => {
        setActividadBaja(null);
        setFormAbierto(false);
        toast.info(`Actividad "${actividadBaja.nombre}" dada de baja`);
      },
      onError: (err) => {
        setErrorBaja(mensajeDeErrorApi(err, "No se pudo desactivar la actividad."));
      },
    });
  };

  const guardar = (datos: ActividadFormData) => {
    const alGuardar = (mensaje: string) => () => {
      setFormAbierto(false);
      toast.success(mensaje);
    };

    if (actividadEditar) {
      if (datos.activo === false && actividadEditar.activo !== false) {
        darDeBaja.mutate(actividadEditar.id, {
          onSuccess: () => {
            setFormAbierto(false);
            toast.info(`Actividad "${actividadEditar.nombre}" dada de baja`);
          },
          onError: (err) => {
            toast.error(mensajeDeErrorApi(err, "No se pudo desactivar la actividad."));
          },
        });
        return;
      }

      actualizar.mutate(
        { id: actividadEditar.id, datos },
        { onSuccess: alGuardar(`Actividad "${datos.nombre}" actualizada`) },
      );
    } else {
      crear.mutate(datos, { onSuccess: alGuardar(`Actividad "${datos.nombre}" creada`) });
    }
  };

  const hayFiltrosActivos = busqueda.trim().length > 0 || filtroModalidad !== "TODAS";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroModalidad("TODAS");
    setPagina(0);
  };

  const handleReactivar = (actividad: Actividad) => {
    reactivar.mutate(actividad.id, {
      onSuccess: () => {
        toast.success(`Actividad "${actividad.nombre}" reincorporada a vigente.`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo reincorporar la actividad."));
      },
    });
  };

  const conteoVigentes = useMemo(() => actividades.filter((a) => a.activo).length, [actividades]);
  const conteoBajas = useMemo(() => actividades.filter((a) => !a.activo).length, [actividades]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return actividades.filter((a) => {
      if (pestana === "VIGENTES" && !a.activo) return false;
      if (pestana === "BAJAS" && a.activo) return false;
      if (filtroModalidad !== "TODAS" && a.modalidad !== filtroModalidad) {
        return false;
      }
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q)
      );
    });
  }, [actividades, pestana, busqueda, filtroModalidad]);

  useEffect(() => {
    setPagina(0);
  }, [pestana, busqueda, filtroModalidad]);

  const listaPaginada = useMemo(() => {
    const inicio = pagina * TAMANO_PAGINA;
    return listaFiltrada.slice(inicio, inicio + TAMANO_PAGINA);
  }, [listaFiltrada, pagina]);

  const cabeceraPestanasDesktop = (
    <div className="hidden xl:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setPestana("VIGENTES")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestana === "VIGENTES"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Vigentes</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestana === "VIGENTES"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {conteoVigentes}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPestana("BAJAS")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestana === "BAJAS"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Dados de baja</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestana === "BAJAS"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {conteoBajas}
        </span>
      </button>
    </div>
  );

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* Encabezado principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Actividades
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium leading-relaxed">
              Las clases que da el centro y cuántos alumnos entran en cada una.
            </p>
          </div>
          <Button
            onClick={abrirNueva}
            type="button"
            className="min-h-[40px] rounded-lg bg-primary px-5 text-sm font-extrabold text-white shadow-md shadow-primary/25 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
          >
            + Nueva actividad
          </Button>
        </div>

        {/* Barra de Búsqueda y Filtros Compactos en Píldoras */}
        <section aria-label="Filtros de actividades" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[280px] max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                id="buscar-actividad"
                aria-label="Buscar actividad"
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            <BotonFiltrosMovil
              abierto={filtrosAbiertos}
              activos={filtroModalidad !== "TODAS"}
              onAlternar={() => setFiltrosAbiertos((v) => !v)}
              idPanel="filtros-actividades"
            />

            <div id="filtros-actividades" className={clasePanelFiltros(filtrosAbiertos)}>
            {/* Select Modalidad en píldora idéntico a image.png */}
            <SelectorDesplegable
              id="filtro-modalidad"
              etiqueta="Modalidad:"
              aria-label="Modalidad"
              valor={filtroModalidad}
              opciones={[
                { valor: "TODAS", texto: "Todas" },
                { valor: "GRUPAL", texto: "Grupales" },
                { valor: "PERSONALIZADA", texto: "Personalizadas" },
              ]}
              onChange={(v) => setFiltroModalidad(v as ModalidadFiltro)}
              variante="pildora"
            />

            {/* Limpiar filtros */}
            {hayFiltrosActivos && (
              <BotonLimpiarFiltros onLimpiar={limpiarFiltros} />
            )}
            </div>
          </div>
        </section>

        {/* Pestañas de estado para mobile / tablet */}
        <PestanasFiltro
          className="xl:hidden"
          etiqueta="Estado de las actividades"
          opciones={[
            { id: "VIGENTES", etiqueta: "Vigentes", conteo: conteoVigentes },
            { id: "BAJAS", etiqueta: "Dados de baja", conteo: conteoBajas },
          ]}
          valor={pestana}
          onCambiar={setPestana}
        />

        {/* Contenido de lista */}
        {isPending ? (
          <TablaSkeleton ariaLabel="Cargando actividades" cantidadPestanas={2} filas={5} />
        ) : isError ? (
          <EstadoErrorCarga
            mensaje={mensajeDeErrorApi(error, "No se pudieron cargar las actividades.")}
            onReintentar={() => void refetch()}
          />
        ) : listaFiltrada.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {cabeceraPestanasDesktop}
            <EmptyActividades
              onNuevo={abrirNueva}
              esFiltro={hayFiltrosActivos}
              esBajas={pestana === "BAJAS"}
              onLimpiarFiltros={limpiarFiltros}
            />
          </div>
        ) : (
          <>
            {/* Mobile: lista de filas, como Alumnos y Cobros */}
            <div className="space-y-3 pb-8 xl:hidden">
              <ul aria-label="Actividades" className={LISTA_MOVIL}>
                {listaPaginada.map((actividad) => {
                  const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                  const detalle = [
                    textoModalidad(actividad.modalidad),
                    `Cupo ${textoCupoActividad(actividad.cupoMaximo)}`,
                    cantHorarios > 0 ? `${cantHorarios} horarios por semana` : "Sin horarios",
                    actividad.requiereMedidas ? "Pide peso y talla" : null,
                  ];
                  return (
                    <FilaMovil
                      key={actividad.id}
                      titulo={actividad.nombre}
                      detalle={detalle}
                      atenuada={!actividad.activo}
                      onAbrir={actividad.activo ? () => abrirEdicion(actividad) : undefined}
                      acciones={
                        actividad.activo ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => abrirEdicion(actividad)} className={BOTON_FILA}>
                              Editar
                              <span className="sr-only"> {actividad.nombre}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => abrirConfirmacionBaja(actividad)}
                              className={BOTON_FILA_PELIGRO}
                            >
                              Dar de baja
                              <span className="sr-only"> {actividad.nombre}</span>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={reactivar.isPending}
                            onClick={() => handleReactivar(actividad)}
                            className={BOTON_FILA_REINCORPORAR}
                          >
                            Reincorporar
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </ul>

              {listaFiltrada.length > TAMANO_PAGINA && (
                <PaginacionTabla
                  pagina={pagina}
                  total={listaFiltrada.length}
                  tamanoPagina={TAMANO_PAGINA}
                  onCambiarPagina={setPagina}
                  etiquetaItems="actividades"
                />
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
              {cabeceraPestanasDesktop}
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <TableHead className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Actividad</TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Descripción</TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Modalidad</TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Cupo por clase</TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Horarios</TableHead>
                    <TableHead className="px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400">Pide peso y talla</TableHead>
                    <TableHead className="px-6 py-3.5 text-right font-semibold text-slate-500 dark:text-slate-400">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 font-medium dark:divide-slate-800">
                  {listaPaginada.map((actividad) => {
                    const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                    return (
                      <TableRow
                        key={actividad.id}
                        onClick={() => {
                          if (actividad.activo) abrirEdicion(actividad);
                        }}
                        className={cn(
                          "transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/40",
                          actividad.activo
                            ? "cursor-pointer"
                            : "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                        )}
                      >
                        {/* Actividad */}
                        <TableCell className="px-6 py-4 align-middle">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {actividad.nombre}
                          </div>
                        </TableCell>

                        {/* Descripción (columna separada) */}
                        <TableCell className="px-4 py-4 align-middle text-xs text-slate-600 dark:text-slate-300 font-normal max-w-xs">
                          {actividad.descripcion ? (
                            <div className="line-clamp-2">
                              {actividad.descripcion}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </TableCell>

                        {/* Modalidad: texto plano, sin colores, sin bordes, sin badge */}
                        <TableCell className="px-4 py-4 align-middle text-sm text-slate-700 dark:text-slate-300 font-medium">
                          {textoModalidad(actividad.modalidad)}
                        </TableCell>

                        {/* Cupo */}
                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {textoCupoActividad(actividad.cupoMaximo)}
                        </TableCell>

                        {/* Horarios */}
                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {cantHorarios > 0 ? `${cantHorarios} por semana` : "—"}
                        </TableCell>

                        {/* Pide peso y talla */}
                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {actividad.requiereMedidas ? "Sí" : "—"}
                        </TableCell>

                        {/* Botón de acción */}
                        <TableCell className="px-6 py-4 text-right align-middle">
                          {actividad.activo ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirEdicion(actividad);
                                }}
                                className={BOTON_FILA}
                              >
                                Editar
                                <span className="sr-only"> {actividad.nombre}</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirConfirmacionBaja(actividad);
                                }}
                                className={BOTON_FILA_PELIGRO}
                              >
                                Dar de baja
                                <span className="sr-only"> {actividad.nombre}</span>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={reactivar.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactivar(actividad);
                              }}
                              className={BOTON_FILA_REINCORPORAR}
                            >
                              Reincorporar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {listaFiltrada.length > TAMANO_PAGINA && (
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  <PaginacionTabla
                    pagina={pagina}
                    total={listaFiltrada.length}
                    tamanoPagina={TAMANO_PAGINA}
                    onCambiarPagina={setPagina}
                    etiquetaItems="actividades"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Formulario Modal Centrado de Creación y Edición */}
      {formAbierto && (
        <ModalFormActividad
          key={actividadEditar?.id ?? "nueva"}
          actividad={actividadEditar}
          maxInscriptosEnClases={
            actividadEditar
              ? (maxInscriptosPorActividad.get(Number(actividadEditar.id)) ?? 0)
              : 0
          }
          guardando={guardado.isPending || darDeBaja.isPending}
          errorGuardado={
            guardado.isError
              ? mensajeDeErrorApi(guardado.error, "No se pudo guardar la actividad.")
              : null
          }
          onClose={() => setFormAbierto(false)}
          onSave={guardar}
          onDarDeBaja={actividadEditar ? () => abrirConfirmacionBaja(actividadEditar) : undefined}
        />
      )}

      {/* Modal de confirmación de baja lógica */}
      {actividadBaja && (
        <ModalBajaActividad
          actividad={actividadBaja}
          dandoDeBaja={darDeBaja.isPending}
          errorBaja={errorBaja}
          onClose={() => {
            setActividadBaja(null);
            setErrorBaja(null);
          }}
          onConfirm={handleConfirmarBaja}
        />
      )}
    </OwnerLayout>
  );
}

function EmptyActividades({
  onNuevo,
  esFiltro,
  esBajas,
  onLimpiarFiltros,
}: {
  onNuevo: () => void;
  esFiltro?: boolean;
  esBajas?: boolean;
  onLimpiarFiltros?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 border-0 shadow-none px-5 py-14 text-center rounded-lg">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
        {esFiltro
          ? "No se encontraron actividades con los filtros seleccionados"
          : esBajas
            ? "No hay actividades dadas de baja"
            : "Todavía no hay actividades cargadas"}
      </h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        {esFiltro
          ? "Probá cambiando el término de búsqueda o restableciendo los filtros de modalidad."
          : esBajas
            ? "Las actividades que des de baja aparecerán acá por si necesitás reincorporarlas."
            : "Creá la primera disciplina del centro para empezar a diagramar horarios y planes."}
      </p>
      {esFiltro ? (
        <BotonLimpiarFiltros onLimpiar={onLimpiarFiltros ?? (() => {})} className="mt-2" />
      ) : !esBajas ? (
        <Button
          type="button"
          onClick={onNuevo}
          className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold text-white shadow-md shadow-primary/25 transition-transform hover:bg-primary-dark active:scale-95"
        >
          + Nueva actividad
        </Button>
      ) : null}
    </Card>
  );
}
