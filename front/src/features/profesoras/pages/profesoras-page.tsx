import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { BotonLimpiarFiltros } from "@/components/ui/boton-limpiar-filtros";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
import { FilaMovil } from "@/components/ui/fila-movil";
import { BOTON_FILA, BOTON_FILA_PELIGRO, BOTON_FILA_REINCORPORAR, LISTA_MOVIL } from "@/components/ui/estilos-lista";
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
  useHorariosActivos,
  useProfesoras,
  useReactivarProfesora,
} from "@/features/profesoras/hooks/use-profesoras";
import {
  parsearEspecialidades,
  type CrearProfesoraInput,
  type Profesora,
} from "@/features/profesoras/schemas/profesora";
import { cn } from "@/utils/cn";

type PestanaEstado = "ACTIVAS" | "BAJAS";

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
  const reactivarMutation = useReactivarProfesora();
  const darDeBajaMutation = useDarDeBajaProfesora();

  const [formAbierto, setFormAbierto] = useState(false);
  const [profBaja, setProfBaja] = useState<Profesora | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);
  const [pestana, setPestana] = useState<PestanaEstado>("ACTIVAS");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const TAMANO_PAGINA = 10;

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

  const handleReincorporar = (prof: Profesora) => {
    reactivarMutation.mutate(prof.id, {
      onSuccess: () => {
        toast.success(`Profesor/a "${prof.nombreCompleto}" reincorporado/a como vigente`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo reincorporar al/a la profesor/a."));
      },
    });
  };

  const abrirBaja = (prof: Profesora) => {
    setErrorBaja(null);
    setProfBaja(prof);
  };

  const confirmarBaja = () => {
    if (!profBaja) return;
    setErrorBaja(null);
    darDeBajaMutation.mutate(profBaja.id, {
      onSuccess: () => {
        toast.info(`Profesor/a "${profBaja.nombreCompleto}" dado/a de baja`);
        setProfBaja(null);
      },
      onError: (err) => {
        setErrorBaja(mensajeDeErrorApi(err, "No se pudo dar de baja al/a la profesor/a."));
      },
    });
  };

  const conteoActivas = useMemo(() => profesoras.filter((p) => p.activa).length, [profesoras]);
  const conteoBajas = useMemo(() => profesoras.filter((p) => !p.activa).length, [profesoras]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return profesoras.filter((p) => {
      if (pestana === "ACTIVAS" && !p.activa) return false;
      if (pestana === "BAJAS" && p.activa) return false;
      if (!q) return true;
      const coincideNombre = p.nombreCompleto.toLowerCase().includes(q);
      const coincideEspecialidad = p.especialidad ? p.especialidad.toLowerCase().includes(q) : false;
      return coincideNombre || coincideEspecialidad;
    });
  }, [profesoras, pestana, busqueda]);

  useEffect(() => {
    setPagina(0);
  }, [pestana, busqueda]);

  const listaPaginada = useMemo(() => {
    const inicio = pagina * TAMANO_PAGINA;
    return listaFiltrada.slice(inicio, inicio + TAMANO_PAGINA);
  }, [listaFiltrada, pagina]);

  const hayFiltrosActivos = busqueda.trim().length > 0;

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Profesores
            </h1>
            <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal">
              Buscá un profesor y abrí su ficha
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

        {/* BARRA DE FILTROS INTEGRADA COMO EN IMAGE.PNG */}
        <section aria-label="Filtros de profesores" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[280px] max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="search"
                aria-label="Buscar por nombre o especialidad"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o especialidad..."
                className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>
            {hayFiltrosActivos && (
              <BotonLimpiarFiltros
                onLimpiar={() => {
                  setBusqueda("");
                }}
              />
            )}
          </div>
        </section>

        {/* PESTAÑAS DE ESTADO PARA MOBILE */}
        <PestanasFiltro
          className="sm:hidden"
          etiqueta="Estado de los profesores"
          opciones={[
            { id: "ACTIVAS", etiqueta: "Activas", conteo: conteoActivas },
            { id: "BAJAS", etiqueta: "Dados de baja", conteo: conteoBajas },
          ]}
          valor={pestana}
          onCambiar={setPestana}
        />

        {/* CONTENIDO PRINCIPAL */}
        {isPending ? (
          <TablaSkeleton ariaLabel="Cargando profesores" cantidadPestanas={2} filas={5} />
        ) : isError ? (
          <EstadoErrorCarga
            titulo="Error al cargar profesores"
            mensaje={mensajeDeErrorApi(error, "No se pudo consultar el listado.")}
            onReintentar={() => void refetch()}
          />
        ) : listaFiltrada.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
            {/* Header de pestañas para desktop dentro de la tarjeta idéntico a image.png */}
            <div className="hidden sm:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setPestana("ACTIVAS")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                  pestana === "ACTIVAS"
                    ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
                )}
              >
                <span>Activas</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-extrabold",
                    pestana === "ACTIVAS"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                  )}
                >
                  {conteoActivas}
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

            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {hayFiltrosActivos
                  ? "Sin resultados para tu búsqueda"
                  : pestana === "BAJAS"
                    ? "No hay profesores dados de baja"
                    : "No hay profesores registrados"}
              </h2>
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                {hayFiltrosActivos
                  ? "Probá ajustando el término de búsqueda para encontrar profesores o especialidades."
                  : pestana === "BAJAS"
                    ? "Todos los profesores del plantel se encuentran vigentes."
                    : "Agregá el/la primer/a profesor/a asociando una cuenta con rol PROFESORA para armar el equipo."}
              </p>
              {!hayFiltrosActivos && pestana === "ACTIVAS" && (
                <Button
                  type="button"
                  onClick={abrirNueva}
                  className="mt-2 min-h-[40px] rounded-lg bg-primary px-5 font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
                >
                  + Dar de alta profesor/a
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* VISTA ESCRITORIO (TABLA EXACTAMENTE COMO EN IMAGE.PNG) */}
            <div className="hidden sm:block rounded-lg border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900 overflow-hidden shadow-2xs">
              {/* Header de pestañas dentro de la tarjeta idéntico a image.png */}
              <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPestana("ACTIVAS")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                    pestana === "ACTIVAS"
                      ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
                  )}
                >
                  <span>Activas</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-extrabold",
                      pestana === "ACTIVAS"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                    )}
                  >
                    {conteoActivas}
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

              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <TableHead className="py-3.5 pl-6 font-semibold text-slate-500 dark:text-slate-400">
                      Profesor/a
                    </TableHead>
                    <TableHead className="py-3.5 font-semibold text-slate-500 dark:text-slate-400">
                      Especialidad
                    </TableHead>
                    <TableHead className="py-3.5 font-semibold text-slate-500 dark:text-slate-400">
                      Clases semanales
                    </TableHead>
                    <TableHead className="py-3.5 font-semibold text-slate-500 dark:text-slate-400">
                      Incorporación
                    </TableHead>
                    <TableHead className="py-3.5 pr-6 text-right font-semibold text-slate-500 dark:text-slate-400">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaPaginada.map((prof) => {
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
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                              {prof.nombre.charAt(0)}
                              {prof.apellido.charAt(0)}
                            </span>
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
                        <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {conteoHorarios > 0 ? (
                            <span>
                              {conteoHorarios} {conteoHorarios === 1 ? "clase" : "clases"}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin clases a cargo</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {formatearFecha(prof.fechaAlta)}
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!prof.activa && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={reactivarMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReincorporar(prof);
                                }}
                                className={BOTON_FILA_REINCORPORAR}
                              >
                                Reincorporar
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/app/profesoras/${prof.id}`);
                              }}
                              className={BOTON_FILA}
                            >
                              Ver perfil
                            </Button>
                            {prof.activa && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirBaja(prof);
                                }}
                                className={BOTON_FILA_PELIGRO}
                              >
                                Dar de baja
                                <span className="sr-only"> {prof.nombreCompleto}</span>
                              </Button>
                            )}
                          </div>
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
                    etiquetaItems="profesores"
                  />
                </div>
              )}
            </div>

            {/* VISTA MÓVIL: lista de filas, como Alumnos y Cobros */}
            <div className="sm:hidden flex flex-col gap-3">
              <ul aria-label="Profesores" className={LISTA_MOVIL}>
                {listaPaginada.map((prof) => {
                  const conteoHorarios = (horariosPorProfesora.get(prof.id) ?? []).length;
                  const especialidades = parsearEspecialidades(prof.especialidad);
                  const detalle = [
                    especialidades.length > 0 ? especialidades.join(", ") : "Sin especialidad",
                    conteoHorarios > 0 ? `${conteoHorarios} ${conteoHorarios === 1 ? "clase" : "clases"}` : "Sin clases a cargo",
                    `Desde ${formatearFecha(prof.fechaAlta)}`,
                  ];
                  return (
                    <FilaMovil
                      key={prof.id}
                      avatar={prof.nombreCompleto}
                      titulo={
                        <Link
                          to={`/app/profesoras/${prof.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        >
                          {prof.nombreCompleto}
                          <span className="sr-only"> · Ver ficha</span>
                        </Link>
                      }
                      detalle={detalle}
                      atenuada={!prof.activa}
                      onAbrir={() => navigate(`/app/profesoras/${prof.id}`)}
                      acciones={
                        !prof.activa ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={reactivarMutation.isPending}
                            onClick={() => handleReincorporar(prof)}
                            className={BOTON_FILA_REINCORPORAR}
                          >
                            Reincorporar
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => navigate(`/app/profesoras/${prof.id}`)} className={BOTON_FILA}>
                              Ver perfil
                            </Button>
                            <Button type="button" variant="outline" onClick={() => abrirBaja(prof)} className={BOTON_FILA_PELIGRO}>
                              Dar de baja
                              <span className="sr-only"> {prof.nombreCompleto}</span>
                            </Button>
                          </div>
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
                  etiquetaItems="profesores"
                />
              )}
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
        {/* MODAL DE BAJA */}
        {profBaja && (
          <ModalBajaProfesora
            profesora={profBaja}
            cantidadHorarios={(horariosPorProfesora.get(profBaja.id) ?? []).length}
            dandoDeBaja={darDeBajaMutation.isPending}
            errorBaja={errorBaja}
            onClose={() => setProfBaja(null)}
            onConfirm={confirmarBaja}
          />
        )}
      </div>
    </OwnerLayout>
  );
}
