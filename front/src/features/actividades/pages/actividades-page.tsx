import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarPlus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/features/actividades/hooks/use-actividades";
import type { ActividadFormData } from "@/features/actividades/schemas/actividad";
import { listarHorarios } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import type { Actividad, ModalidadActividad } from "@/types/actividad";
import { cn } from "@/utils/cn";

type ModalidadFiltro = "TODAS" | ModalidadActividad;

function textoModalidad(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL" ? "Grupal" : "Personalizada";
}

// Colores oficiales de front/AGENTS.md: Grupal -> azul (#3B82F6), Personalizada -> violeta (#8B5CF6)
function badgeModalidadClase(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL"
    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
    : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300";
}

function textoCupoActividad(cupo: number | null): string {
  if (cupo === null) return "Sin límite";
  return cupo === 1 ? "1 alumno" : `${cupo} alumnos`;
}

export function ActividadesPage() {
  const { data: actividades = [], isPending, isError, error, refetch } = useActividades();
  const { data: horarios = [] } = useQuery({
    queryKey: HORARIOS_QUERY_KEY,
    queryFn: listarHorarios,
  });

  const crear = useCrearActividad();
  const actualizar = useActualizarActividad();
  const darDeBaja = useDarDeBajaActividad();

  const [formAbierto, setFormAbierto] = useState(false);
  const [actividadEditar, setActividadEditar] = useState<Actividad | null>(null);
  const [actividadBaja, setActividadBaja] = useState<Actividad | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroModalidad, setFiltroModalidad] = useState<ModalidadFiltro>("TODAS");

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
  };

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return actividades.filter((a) => {
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
  }, [actividades, busqueda, filtroModalidad]);

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* Encabezado principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Actividades
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Las clases que da el centro y cuántos alumnos entran en cada una.
            </p>
          </div>
          <Button
            onClick={abrirNueva}
            type="button"
            className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
          >
            + Nueva actividad
          </Button>
        </div>

        {/* Barra de Búsqueda y Filtros Compactos en Píldoras */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Buscador */}
          <div className="relative flex-1 min-w-0 sm:min-w-[240px] max-w-sm">
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
              className="h-10 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>

          {/* Filtros compactos en píldoras */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Modalidad */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Modalidad:
              </span>
              <Select
                value={filtroModalidad}
                onValueChange={(val) => setFiltroModalidad(val as ModalidadFiltro)}
              >
                <SelectTrigger
                  aria-label="Filtrar por modalidad"
                  className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[80px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="GRUPAL">Grupales</SelectItem>
                  <SelectItem value="PERSONALIZADA">Personalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpiar filtros */}
            {hayFiltrosActivos && (
              <Button
                type="button"
                variant="ghost"
                onClick={limpiarFiltros}
                className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Contenido de lista */}
        {isPending ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            Cargando actividades…
          </div>
        ) : isError ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-12 text-center rounded-3xl">
            <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudieron cargar las actividades.")}
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold text-sm"
            >
              Reintentar
            </Button>
          </Card>
        ) : listaFiltrada.length === 0 ? (
          <EmptyActividades
            onNuevo={abrirNueva}
            esFiltro={hayFiltrosActivos}
            onLimpiarFiltros={limpiarFiltros}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3.5 pb-8 md:grid-cols-2 xl:hidden">
              {listaFiltrada.map((actividad) => {
                const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                return (
                  <Card
                    key={actividad.id}
                    className="w-full min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                          {actividad.nombre}
                        </h2>
                        {actividad.descripcion && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-medium">
                            {actividad.descripcion}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold shrink-0",
                          badgeModalidadClase(actividad.modalidad),
                        )}
                      >
                        {textoModalidad(actividad.modalidad)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block font-medium">Cupo por clase</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {textoCupoActividad(actividad.cupoMaximo)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block font-medium">Horarios</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {cantHorarios > 0 ? `${cantHorarios} por semana` : "—"}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-50 dark:border-slate-800/60">
                        <span className="text-slate-400 dark:text-slate-500 inline-block font-medium mr-2">Pide peso y talla:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {actividad.requiereMedidas ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abrirEdicion(actividad)}
                        className="w-full rounded-xl h-10 px-4 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Editar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table */}
            <Card className="hidden overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 uppercase tracking-wider">
                    <TableHead className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Actividad</TableHead>
                    <TableHead className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">Modalidad</TableHead>
                    <TableHead className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">Cupo por clase</TableHead>
                    <TableHead className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">Horarios</TableHead>
                    <TableHead className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">Pide peso y talla</TableHead>
                    <TableHead className="px-6 py-3.5 text-right"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 font-medium dark:divide-slate-800">
                  {listaFiltrada.map((actividad) => {
                    const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                    return (
                      <TableRow key={actividad.id} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40">
                        <TableCell className="px-6 py-4 align-middle">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {actividad.nombre}
                          </div>
                          {actividad.descripcion ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-md font-normal">
                              {actividad.descripcion}
                            </div>
                          ) : null}
                        </TableCell>

                        <TableCell className="px-4 py-4 align-middle">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold",
                              badgeModalidadClase(actividad.modalidad),
                            )}
                          >
                            {textoModalidad(actividad.modalidad)}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {textoCupoActividad(actividad.cupoMaximo)}
                        </TableCell>

                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {cantHorarios > 0 ? `${cantHorarios} por semana` : "—"}
                        </TableCell>

                        <TableCell className="px-4 py-4 align-middle text-slate-700 dark:text-slate-300 font-medium">
                          {actividad.requiereMedidas ? "Sí" : "—"}
                        </TableCell>

                        <TableCell className="px-6 py-4 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => abrirEdicion(actividad)}
                            className="h-8 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      {/* Formulario Modal Centrado de Creación y Edición */}
      {formAbierto && (
        <ModalFormActividad
          key={actividadEditar?.id ?? "nueva"}
          actividad={actividadEditar}
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
  onLimpiarFiltros,
}: {
  onNuevo: () => void;
  esFiltro?: boolean;
  onLimpiarFiltros?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200"
      >
        <CalendarPlus className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
        {esFiltro
          ? "No se encontraron actividades con los filtros seleccionados"
          : "Todavía no hay actividades cargadas"}
      </h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        {esFiltro
          ? "Probá cambiando el término de búsqueda o restableciendo los filtros de modalidad."
          : "Creá la primera disciplina del centro para empezar a diagramar horarios y planes."}
      </p>
      {esFiltro ? (
        <Button
          type="button"
          variant="outline"
          onClick={onLimpiarFiltros}
          className="mt-2 rounded-xl font-bold text-xs"
        >
          Limpiar filtros
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNuevo}
          className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
        >
          + Nueva actividad
        </Button>
      )}
    </Card>
  );
}
