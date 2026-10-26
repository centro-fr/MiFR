import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY, PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { EncabezadoHonorarios, PestanasHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import { ListaSuplencias } from "@/features/suplencias/components/lista-suplencias";
import { SuplenciaDialog } from "@/features/suplencias/components/suplencia-dialog";
import {
  useActualizarSuplencia,
  useEliminarSuplencia,
  useRegistrarSuplencia,
  useSuplencias,
} from "@/features/suplencias/hooks/use-suplencias";
import type { SuplenciaFormValues } from "@/features/suplencias/schemas/suplencia";
import type { Suplencia } from "@/types/suplencia";

export function SuplenciasPage() {
  const consultaSuplencias = useSuplencias();
  const consultaHorarios = useQuery({ queryKey: HORARIOS_QUERY_KEY, queryFn: listarHorarios, staleTime: 5 * 60_000 });
  const consultaProfesoras = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  const registrar = useRegistrarSuplencia();
  const actualizar = useActualizarSuplencia();
  const eliminar = useEliminarSuplencia();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [suplenciaEditando, setSuplenciaEditando] = useState<Suplencia | null>(null);
  const [suplenciaAEliminar, setSuplenciaAEliminar] = useState<Suplencia | null>(null);
  const [filtroProfesora, setFiltroProfesora] = useState("TODAS");

  const horarios = consultaHorarios.data ?? [];
  const profesoras = consultaProfesoras.data ?? [];
  const suplencias = useMemo(
    () =>
      (consultaSuplencias.data ?? []).filter(
        (suplencia) =>
          filtroProfesora === "TODAS" ||
          suplencia.titular.id === filtroProfesora ||
          suplencia.suplente.id === filtroProfesora,
      ),
    [consultaSuplencias.data, filtroProfesora],
  );
  const cargando = consultaSuplencias.isPending || consultaHorarios.isPending || consultaProfesoras.isPending;
  const error = consultaSuplencias.error ?? consultaHorarios.error ?? consultaProfesoras.error;

  const abrirNueva = () => {
    registrar.reset();
    setSuplenciaEditando(null);
    setDialogoAbierto(true);
  };

  const abrirEdicion = (suplencia: Suplencia) => {
    actualizar.reset();
    setSuplenciaEditando(suplencia);
    setDialogoAbierto(true);
  };

  const guardar = (datos: SuplenciaFormValues) => {
    const motivo = datos.motivo.trim() || undefined;
    if (suplenciaEditando) {
      actualizar.mutate(
        {
          idClase: suplenciaEditando.idClase,
          cambios: { id_profesora_suplente: Number(datos.idProfesoraSuplente), motivo },
        },
        {
          onSuccess: () => {
            setDialogoAbierto(false);
            toast.success("Suplencia actualizada");
          },
        },
      );
      return;
    }

    registrar.mutate(
      {
        id_horario: Number(datos.idHorario),
        fecha_clase: datos.fechaClase,
        id_profesora_suplente: Number(datos.idProfesoraSuplente),
        motivo,
      },
      {
        onSuccess: (resultado) => {
          setDialogoAbierto(false);
          toast.success("Suplencia registrada");
          if (resultado.advertencia) toast.info(resultado.advertencia);
        },
      },
    );
  };

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        <EncabezadoHonorarios
          titulo="Honorarios"
          descripcion="Registro de suplencias docentes para el cálculo de honorarios."
          acciones={
            <Button
              type="button"
              onClick={abrirNueva}
              className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
            >
              + Nueva suplencia
            </Button>
          }
        />
        <PestanasHonorarios cantidadSuplencias={suplencias.length} />

        {cargando ? (
          <div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            Cargando suplencias...
          </div>
        ) : error ? (
          <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 dark:border-slate-800 px-5 py-12 text-center">
            <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudieron cargar las suplencias.")}
            </p>
            <Button
              type="button"
              onClick={() => {
                void consultaSuplencias.refetch();
                void consultaHorarios.refetch();
                void consultaProfesoras.refetch();
              }}
              className="min-h-[44px] rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-dark transition-transform active:scale-95"
            >
              Reintentar
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Profesor/a:
                </span>
                <Select value={filtroProfesora} onValueChange={setFiltroProfesora}>
                  <SelectTrigger
                    aria-label="Filtrar por profesor/a"
                    className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[140px]"
                  >
                    <SelectValue placeholder="Todos los profesores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todos los profesores</SelectItem>
                    {profesoras.map((profesora) => (
                      <SelectItem key={profesora.id} value={profesora.id}>
                        {profesora.nombre} {profesora.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtroProfesora !== "TODAS" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFiltroProfesora("TODAS")}
                  className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            {suplencias.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 dark:border-slate-800 px-5 py-14 text-center">
                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
                  <Users className="size-7" />
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {filtroProfesora === "TODAS" ? "Todavía no hay suplencias" : "No hay suplencias para este/a profesor/a"}
                </h2>
                <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                  {filtroProfesora === "TODAS"
                    ? "Registrá quién cubrió una clase para que el informe de honorarios refleje correctamente la suplencia."
                    : "No se encontraron suplencias registradas con el/la profesor/a seleccionado/a."}
                </p>
                {filtroProfesora === "TODAS" ? (
                  <Button
                    type="button"
                    onClick={abrirNueva}
                    className="min-h-[44px] rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-dark transition-transform active:scale-95 shadow-md shadow-primary/20"
                  >
                    + Nueva suplencia
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFiltroProfesora("TODAS")}
                    className="min-h-[44px] rounded-xl font-bold border-slate-200 dark:border-slate-800 px-5"
                  >
                    Ver todas las suplencias
                  </Button>
                )}
              </Card>
            ) : (
              <ListaSuplencias suplencias={suplencias} onEditar={abrirEdicion} onEliminar={setSuplenciaAEliminar} />
            )}
          </>
        )}

        <SuplenciaDialog
          key={suplenciaEditando?.idClase ?? "nueva-suplencia"}
          abierto={dialogoAbierto}
          suplencia={suplenciaEditando}
          horarios={horarios}
          profesoras={profesoras}
          guardando={registrar.isPending || actualizar.isPending}
          error={
            registrar.isError
              ? mensajeDeErrorApi(registrar.error, "No se pudo registrar la suplencia.")
              : actualizar.isError
                ? mensajeDeErrorApi(actualizar.error, "No se pudo actualizar la suplencia.")
                : null
          }
          onClose={() => setDialogoAbierto(false)}
          onSubmit={guardar}
        />

        <Dialog open={suplenciaAEliminar !== null} onOpenChange={(open) => !open && setSuplenciaAEliminar(null)}>
          <DialogContent hideClose className="w-[96vw] sm:w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border-slate-200 dark:border-slate-800">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 text-left">
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                ¿Eliminar suplencia?
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSuplenciaAEliminar(null)}
                aria-label="Cerrar modal"
                className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </Button>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              La clase volverá a quedar a cargo de la titular y ya no afectará los honorarios. ¿Confirmás?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSuplenciaAEliminar(null)}
                disabled={eliminar.isPending}
                className="h-11 px-6 rounded-xl font-bold text-sm border-slate-200 dark:border-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={eliminar.isPending}
                onClick={() => {
                  if (!suplenciaAEliminar) return;
                  eliminar.mutate(suplenciaAEliminar.idClase, {
                    onSuccess: () => {
                      setSuplenciaAEliminar(null);
                      toast.success("Suplencia eliminada");
                    },
                  });
                }}
                className="h-11 px-6 rounded-xl bg-rose-600 font-bold text-sm text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                {eliminar.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </OwnerLayout>
  );
}
