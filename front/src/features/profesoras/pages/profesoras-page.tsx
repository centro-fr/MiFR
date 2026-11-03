import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalFormProfesora } from "@/features/profesoras/components/modal-form-profesora";
import {
  useCrearProfesora,
  useHorariosActivos,
  useProfesoras,
} from "@/features/profesoras/hooks/use-profesoras";
import {
  parsearEspecialidades,
  type CrearProfesoraInput,
} from "@/features/profesoras/schemas/profesora";
import { cn } from "@/utils/cn";

type PestanaEstado = "ACTIVAS" | "TODAS";

function formatearFecha(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function ProfesorasPage() {
  const navigate = useNavigate();
  const { data: profesoras = [], isPending, isError, error, refetch } = useProfesoras();
  const { data: horarios = [] } = useHorariosActivos();

  const horariosPorProfesora = useMemo(() => {
    const mapa = new Map<number, typeof horarios>();
    for (const h of horarios) {
      const lista = mapa.get(h.id_profesora) ?? [];
      lista.push(h);
      mapa.set(h.id_profesora, lista);
    }
    return mapa;
  }, [horarios]);

  const crearMutation = useCrearProfesora();

  const [formAbierto, setFormAbierto] = useState(false);
  const [pestana, setPestana] = useState<PestanaEstado>("ACTIVAS");
  const [busqueda, setBusqueda] = useState("");

  const abrirNueva = () => {
    crearMutation.reset();
    setFormAbierto(true);
  };

  const handleGuardarNueva = (datos: CrearProfesoraInput) => {
    crearMutation.mutate(datos, {
      onSuccess: (nueva) => {
        setFormAbierto(false);
        toast.success(`Profesor/a "${nueva.nombreCompleto}" dado/a de alta correctamente`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo registrar al/a la profesor/a."));
      },
    });
  };

  const conteoActivas = useMemo(() => profesoras.filter((p) => p.activa).length, [profesoras]);
  const conteoTotal = profesoras.length;

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return profesoras.filter((p) => {
      if (pestana === "ACTIVAS" && !p.activa) return false;
      if (!q) return true;
      const coincideNombre = p.nombreCompleto.toLowerCase().includes(q);
      const coincideEspecialidad = p.especialidad ? p.especialidad.toLowerCase().includes(q) : false;
      return coincideNombre || coincideEspecialidad;
    });
  }, [profesoras, pestana, busqueda]);

  const hayFiltrosActivos = busqueda.trim().length > 0 || pestana !== "ACTIVAS";

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Plantel de Profesores
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Equipo docente del centro, disciplinas a cargo y acceso a su ficha de datos personales.
            </p>
          </div>
          <Button
            type="button"
            onClick={abrirNueva}
            className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0 self-start sm:self-auto"
          >
            + Nuevo/a profesor/a
          </Button>
        </div>

        {/* PESTAÑAS DE ESTADO + BUSCADOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setPestana("ACTIVAS")}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
                pestana === "ACTIVAS"
                  ? "border-primary text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <span>Activas</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                  pestana === "ACTIVAS"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {conteoActivas}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPestana("TODAS")}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
                pestana === "TODAS"
                  ? "border-primary text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <span>Historial completo</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                  pestana === "TODAS"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {conteoTotal}
              </span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-80 pb-3 md:pb-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="h-10 pl-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium shadow-2xs placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {isPending ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="size-5 animate-spin text-primary" />
            Cargando plantel de profesores...
          </div>
        ) : isError ? (
          <Card className="flex flex-col items-center gap-3 border-rose-200 dark:border-rose-900/50 p-8 text-center rounded-3xl">
            <AlertCircle className="size-8 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Error al cargar profesores
            </h2>
            <p className="text-xs text-slate-500 max-w-sm">
              {mensajeDeErrorApi(error, "No se pudo consultar el listado.")}
            </p>
            <Button
              type="button"
              onClick={() => refetch()}
              className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold"
            >
              Reintentar
            </Button>
          </Card>
        ) : listaFiltrada.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200"
            >
              <GraduationCap className="size-7" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {hayFiltrosActivos ? "Sin resultados para tu búsqueda" : "No hay profesores registrados"}
            </h2>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              {hayFiltrosActivos
                ? "Probá ajustando el término de búsqueda para encontrar profesores o especialidades."
                : "Agregá el/la primer/a profesor/a asociando una cuenta con rol PROFESORA para armar el equipo."}
            </p>
            {!hayFiltrosActivos && (
              <Button
                type="button"
                onClick={abrirNueva}
                className="mt-2 min-h-[44px] rounded-xl bg-primary px-5 font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
              >
                + Dar de alta profesor/a
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* VISTA ESCRITORIO (TABLA) */}
            <div className="hidden sm:block rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <TableHead className="py-3.5 pl-6 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Profesor/a
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Especialidad
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Clases semanales
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Incorporación
                    </TableHead>
                    <TableHead className="py-3.5 pr-6 text-right font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((prof) => {
                    const clases = horariosPorProfesora.get(prof.id) ?? [];
                    const conteoHorarios = clases.length;
                    const especialidades = parsearEspecialidades(prof.especialidad);

                    return (
                      <TableRow
                        key={prof.id}
                        onClick={() => navigate(`/app/profesoras/${prof.id}`)}
                        className={cn(
                          "group cursor-pointer border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/40",
                          !prof.activa && "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                        )}
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-950/60 font-black text-primary text-sm">
                              {prof.nombre.charAt(0)}
                              {prof.apellido.charAt(0)}
                            </div>
                            <Link
                              to={`/app/profesoras/${prof.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-sm text-slate-900 dark:text-white block group-hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                            >
                              {prof.nombreCompleto}
                              <span className="sr-only"> · Ver ficha</span>
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          {especialidades.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {especialidades.map((esp) => (
                                <span
                                  key={esp}
                                  className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                                >
                                  {esp}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin especialidad</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          {conteoHorarios > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 text-xs font-bold text-primary dark:text-pink-300 border border-pink-100 dark:border-pink-900/50">
                              <Clock className="size-3" />
                              {conteoHorarios} {conteoHorarios === 1 ? "clase" : "clases"}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin clases a cargo</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-slate-400" />
                            <span>{formatearFecha(prof.fechaAlta)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-right">
                          <ChevronRight
                            aria-hidden="true"
                            className="inline-block size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary dark:text-slate-600 dark:group-hover:text-pink-400"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="sm:hidden flex flex-col gap-3">
              {listaFiltrada.map((prof) => {
                const clases = horariosPorProfesora.get(prof.id) ?? [];
                const conteoHorarios = clases.length;
                const especialidades = parsearEspecialidades(prof.especialidad);

                return (
                  <div
                    key={prof.id}
                    onClick={() => navigate(`/app/profesoras/${prof.id}`)}
                    className={cn(
                      "group cursor-pointer flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs gap-3.5 transition-colors hover:border-pink-300 dark:hover:border-pink-500",
                      !prof.activa && "opacity-75 bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-pink-950/60 font-black text-primary text-sm">
                          {prof.nombre.charAt(0)}
                          {prof.apellido.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/app/profesoras/${prof.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors block truncate"
                          >
                            {prof.nombreCompleto}
                            <span className="sr-only"> · Ver ficha</span>
                          </Link>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 shrink-0 group-hover:text-primary dark:text-slate-600" />
                    </div>

                    <div className="space-y-2 text-xs">
                      {especialidades.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1">
                            Especialidad:
                          </span>
                          {especialidades.map((esp) => (
                            <span
                              key={esp}
                              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1">
                        <span>Clases semanales:</span>
                        {conteoHorarios > 0 ? (
                          <span className="font-bold text-primary flex items-center gap-1">
                            <Clock className="size-3" />
                            {conteoHorarios} {conteoHorarios === 1 ? "clase" : "clases"}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin clases</span>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        Incorporación: {formatearFecha(prof.fechaAlta)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* MODAL DE ALTA */}
        {formAbierto && (
          <ModalFormProfesora
            guardando={crearMutation.isPending}
            errorGuardado={
              crearMutation.isError
                ? mensajeDeErrorApi(crearMutation.error, "No se pudo registrar al/a la profesor/a.")
                : null
            }
            onClose={() => setFormAbierto(false)}
            onSave={handleGuardarNueva}
          />
        )}
      </div>
    </OwnerLayout>
  );
}
