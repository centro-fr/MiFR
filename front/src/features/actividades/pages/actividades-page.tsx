import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function textoModalidad(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL" ? "Grupal" : "Personalizada";
}

function badgeModalidadClase(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL"
    ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10"
    : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40";
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
  const [busqueda, setBusqueda] = useState("");

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

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return actividades;
    return actividades.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q),
    );
  }, [actividades, busqueda]);

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* Encabezado principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
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

        {/* Buscador */}
        <div className="flex items-center justify-end pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar actividad"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:border-primary focus:ring-2 focus:ring-pink-100 dark:border-white/15 dark:bg-surface-low dark:focus:ring-pink-950/40"
            />
          </div>
        </div>

        {/* Contenido de lista */}
        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Loader2 className="size-5 animate-spin text-primary" />
            Cargando actividades…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudieron cargar las actividades.")}
            </p>
            <Button type="button" onClick={() => void refetch()} className="min-h-[44px] rounded-xl px-5 text-sm font-bold">
              Reintentar
            </Button>
          </div>
        ) : listaFiltrada.length === 0 ? (
          <EmptyActividades onNuevo={abrirNueva} esFiltro={busqueda.trim().length > 0} />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 pb-8 md:grid-cols-2 xl:hidden">
              {listaFiltrada.map((actividad) => {
                const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                return (
                  <Card key={actividad.id} className="rounded-2xl border-border bg-white p-4 shadow-xs dark:bg-surface-low space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {actividad.nombre}
                        </h2>
                        {actividad.descripcion && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {actividad.descripcion}
                          </p>
                        )}
                      </div>
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0", badgeModalidadClase(actividad.modalidad))}>
                        {textoModalidad(actividad.modalidad)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-white/10">
                      <div>
                        <span className="text-muted-foreground block">Cupo por clase</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {textoCupoActividad(actividad.cupoMaximo)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Horarios</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cantHorarios > 0 ? `${cantHorarios} por semana` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pide peso y talla</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {actividad.requiereMedidas ? "Sí" : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abrirEdicion(actividad)}
                        className="rounded-xl border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200"
                      >
                        Editar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table (Limpia continua de 6 columnas según imagen 1) */}
            <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-xs xl:block dark:bg-surface-low">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-border bg-transparent text-xs font-bold text-muted-foreground">
                    <TableHead className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">Actividad</TableHead>
                    <TableHead className="px-4 py-4 font-bold text-slate-600 dark:text-slate-400">Modalidad</TableHead>
                    <TableHead className="px-4 py-4 font-bold text-slate-600 dark:text-slate-400">Cupo por clase</TableHead>
                    <TableHead className="px-4 py-4 font-bold text-slate-600 dark:text-slate-400">Horarios</TableHead>
                    <TableHead className="px-4 py-4 font-bold text-slate-600 dark:text-slate-400">Pide peso y talla</TableHead>
                    <TableHead className="px-6 py-4 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 font-medium dark:divide-white/5">
                  {listaFiltrada.map((actividad) => {
                    const cantHorarios = horariosPorActividad.get(Number(actividad.id)) ?? 0;
                    return (
                      <TableRow key={actividad.id} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-white/5">
                        <TableCell className="px-6 py-4 align-middle">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {actividad.nombre}
                          </div>
                          {actividad.descripcion ? (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                              {actividad.descripcion}
                            </div>
                          ) : null}
                        </TableCell>

                        <TableCell className="px-4 py-4 align-middle">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold",
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
                            className="rounded-xl border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
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

      {formAbierto && (
        <ModalFormActividad
          key={actividadEditar?.id ?? "nueva"}
          actividad={actividadEditar}
          guardando={guardado.isPending || darDeBaja.isPending}
          errorGuardado={
            guardado.isError
              ? mensajeDeErrorApi(guardado.error, "No se pudo guardar la actividad.")
              : darDeBaja.isError
                ? mensajeDeErrorApi(darDeBaja.error, "No se pudo desactivar la actividad.")
                : null
          }
          onClose={() => setFormAbierto(false)}
          onSave={guardar}
        />
      )}
    </OwnerLayout>
  );
}

function EmptyActividades({ onNuevo, esFiltro }: { onNuevo: () => void; esFiltro?: boolean }) {
  return (
    <Card className="border-0 bg-transparent px-6 py-16 text-center shadow-none">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-0">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl bg-pink-100 text-primary-dark dark:bg-pink-500/15 dark:text-pink-300"
        >
          <CalendarPlus className="size-7" />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-dark dark:text-white">
          {esFiltro ? "No se encontraron actividades" : "Todavía no hay actividades"}
        </h2>
        <p className="max-w-[320px] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {esFiltro
            ? "Probá cambiando la búsqueda o revisá la otra pestaña."
            : "Creá la primera disciplina del centro para empezar a diagramar horarios."}
        </p>
        {!esFiltro && (
          <Button
            type="button"
            onClick={onNuevo}
            className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
          >
            + Nueva actividad
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
