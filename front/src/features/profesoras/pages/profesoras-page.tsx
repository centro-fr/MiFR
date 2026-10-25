import { useMemo, useState } from "react";
import { AlertCircle, Calendar, GraduationCap, Loader2, Search, Trash2 } from "lucide-react";
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
import { ModalBajaProfesora } from "@/features/profesoras/components/modal-baja-profesora";
import { ModalFormProfesora } from "@/features/profesoras/components/modal-form-profesora";
import {
  useCrearProfesora,
  useDarDeBajaProfesora,
  useProfesoras,
  useUsuariosAptosProfesora,
} from "@/features/profesoras/hooks/use-profesoras";
import type { CrearProfesoraInput, Profesora } from "@/features/profesoras/schemas/profesora";
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
  const { data: profesoras = [], isPending, isError, error, refetch } = useProfesoras();
  const { data: candidatos = [], isPending: cargandoCandidatos } = useUsuariosAptosProfesora(profesoras);

  const crearMutation = useCrearProfesora();
  const darDeBajaMutation = useDarDeBajaProfesora();

  const [formAbierto, setFormAbierto] = useState(false);
  const [profesoraBaja, setProfesoraBaja] = useState<Profesora | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const [pestana, setPestana] = useState<PestanaEstado>("ACTIVAS");
  const [busqueda, setBusqueda] = useState("");

  const abrirNueva = () => {
    crearMutation.reset();
    setFormAbierto(true);
  };

  const abrirConfirmacionBaja = (profesora: Profesora) => {
    setErrorBaja(null);
    setProfesoraBaja(profesora);
  };

  const handleConfirmarBaja = () => {
    if (!profesoraBaja) return;
    setErrorBaja(null);
    darDeBajaMutation.mutate(profesoraBaja.id, {
      onSuccess: () => {
        setProfesoraBaja(null);
        toast.info(`Profesora "${profesoraBaja.nombreCompleto}" dada de baja`);
      },
      onError: (err) => {
        setErrorBaja(mensajeDeErrorApi(err, "No se pudo dar de baja a la profesora."));
      },
    });
  };

  const handleGuardarNueva = (datos: CrearProfesoraInput) => {
    crearMutation.mutate(datos, {
      onSuccess: (nueva) => {
        setFormAbierto(false);
        toast.success(`Profesora "${nueva.nombreCompleto}" dada de alta correctamente`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo registrar la profesora."));
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
      return (
        p.nombreCompleto.toLowerCase().includes(q) ||
        (p.especialidad && p.especialidad.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    });
  }, [profesoras, pestana, busqueda]);

  const hayFiltrosActivos = busqueda.trim().length > 0;

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Plantel de Profesoras
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Equipo docente del centro, especialidades asignadas y disponibilidad para dictado de disciplinas.
            </p>
          </div>

          <Button
            type="button"
            onClick={abrirNueva}
            className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
          >
            + Nueva profesora
          </Button>
        </div>

        {/* PESTAÑAS SUPERIORES DE NAVEGACIÓN (TABS) */}
        <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none">
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

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-0 sm:min-w-[260px] max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="h-10 rounded-xl pl-9 pr-3 text-xs sm:text-sm font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>

          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBusqueda("")}
              className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark self-start sm:self-auto"
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL SEGÚN ESTADO DE QUERY */}
        {isPending ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            Cargando plantel de profesoras...
          </div>
        ) : isError ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-12 text-center rounded-3xl">
            <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudo cargar el listado de profesoras.")}
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
              {hayFiltrosActivos ? "Sin resultados para tu búsqueda" : "No hay profesoras registradas"}
            </h2>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              {hayFiltrosActivos
                ? "Probá ajustando el término de búsqueda para encontrar profesoras o especialidades."
                : "Agregá la primera profesora asociando una cuenta con rol PROFESORA para armar el equipo."}
            </p>
            {!hayFiltrosActivos && (
              <Button
                type="button"
                onClick={abrirNueva}
                className="mt-2 min-h-[44px] rounded-xl bg-primary px-5 font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
              >
                + Dar de alta profesora
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
                      Profesora
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Especialidad
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Incorporación
                    </TableHead>
                    <TableHead className="py-3.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Estado
                    </TableHead>
                    <TableHead className="py-3.5 pr-6 text-right font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((prof) => (
                    <TableRow
                      key={prof.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                        !prof.activa && "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                      )}
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-950/60 font-black text-primary text-sm">
                            {prof.nombre.charAt(0)}
                            {prof.apellido.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                              {prof.nombreCompleto}
                            </span>
                            {prof.email && (
                              <span className="text-xs text-muted-foreground">{prof.email}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {prof.especialidad ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {prof.especialidad}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sin especialidad</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" />
                          <span>{formatearFecha(prof.fechaAlta)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {prof.activa ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Dada de baja
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        {prof.activa ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirConfirmacionBaja(prof)}
                            className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 font-bold text-xs h-9 px-3"
                          >
                            <Trash2 className="size-3.5 mr-1.5" />
                            Dar de baja
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Inactiva</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="sm:hidden flex flex-col gap-3">
              {listaFiltrada.map((prof) => (
                <div
                  key={prof.id}
                  className={cn(
                    "flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs gap-3",
                    !prof.activa && "opacity-75 bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-pink-950/60 font-black text-primary text-sm">
                        {prof.nombre.charAt(0)}
                        {prof.apellido.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                          {prof.nombreCompleto}
                        </h2>
                        {prof.email && (
                          <p className="text-xs text-muted-foreground">{prof.email}</p>
                        )}
                      </div>
                    </div>
                    {prof.activa ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Baja
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    {prof.especialidad && (
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Especialidad:{" "}
                        <span className="font-normal text-slate-600 dark:text-slate-400">
                          {prof.especialidad}
                        </span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Incorporación: {formatearFecha(prof.fechaAlta)}
                    </p>
                  </div>

                  {prof.activa && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abrirConfirmacionBaja(prof)}
                        className="w-full h-10 rounded-xl border-rose-200 text-rose-600 dark:border-rose-900/40 dark:text-rose-400 font-bold text-xs hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5 mr-1.5" />
                        Dar de baja
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* MODAL DE ALTA */}
        {formAbierto && (
          <ModalFormProfesora
            candidatos={candidatos}
            cargandoCandidatos={cargandoCandidatos}
            guardando={crearMutation.isPending}
            errorGuardado={
              crearMutation.isError
                ? mensajeDeErrorApi(crearMutation.error, "No se pudo registrar la profesora.")
                : null
            }
            onClose={() => setFormAbierto(false)}
            onSave={handleGuardarNueva}
          />
        )}

        {/* MODAL DE CONFIRMACIÓN DE BAJA */}
        {profesoraBaja && (
          <ModalBajaProfesora
            profesora={profesoraBaja}
            dandoDeBaja={darDeBajaMutation.isPending}
            errorBaja={errorBaja}
            onClose={() => setProfesoraBaja(null)}
            onConfirm={handleConfirmarBaja}
          />
        )}
      </div>
    </OwnerLayout>
  );
}
