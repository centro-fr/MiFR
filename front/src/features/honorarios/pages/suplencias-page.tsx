import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  if (cargando) {
    return <OwnerLayout><ContenidoBase><div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold"><Loader2 className="size-5 animate-spin text-primary" />Cargando suplencias...</div></ContenidoBase></OwnerLayout>;
  }

  if (error) {
    return <OwnerLayout><ContenidoBase><Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-12 text-center dark:border-slate-800"><AlertCircle className="size-8 text-rose-600" /><p role="alert" className="text-sm font-semibold">{mensajeDeErrorApi(error, "No se pudieron cargar las suplencias.")}</p><Button type="button" onClick={() => { void consultaSuplencias.refetch(); void consultaHorarios.refetch(); void consultaProfesoras.refetch(); }} className="min-h-11 rounded-xl font-bold">Reintentar</Button></Card></ContenidoBase></OwnerLayout>;
  }

  return (
    <OwnerLayout>
      <ContenidoBase>
        <EncabezadoHonorarios
          acciones={
            <Button type="button" onClick={abrirNueva} className="min-h-11 rounded-xl bg-primary font-extrabold text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"><Plus className="mr-2 size-4" />Nueva suplencia</Button>
          }
        />
        <PestanasHonorarios />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <Users className="size-4 text-muted-foreground" />
            <Select value={filtroProfesora} onValueChange={setFiltroProfesora}>
              <SelectTrigger aria-label="Filtrar por profesora" className="h-auto min-w-[150px] border-0 bg-transparent p-0 text-sm font-bold shadow-none focus:ring-0"><SelectValue placeholder="Todas las profesoras" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las profesoras</SelectItem>
                {profesoras.map((profesora) => <SelectItem key={profesora.id} value={profesora.id}>{profesora.nombre} {profesora.apellido}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {suplencias.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-14 text-center dark:border-slate-800">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70"><Users className="size-7" /></span>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{filtroProfesora === "TODAS" ? "Todavía no hay suplencias" : "No hay suplencias para esta profesora"}</h2>
            <p className="max-w-md text-sm text-muted-foreground">Registrá quién cubrió una clase para que el informe de honorarios refleje correctamente la suplencia.</p>
            {filtroProfesora === "TODAS" && <Button type="button" onClick={abrirNueva} className="min-h-11 rounded-xl bg-primary font-bold text-white hover:bg-primary-dark">+ Nueva suplencia</Button>}
          </Card>
        ) : (
          <ListaSuplencias suplencias={suplencias} onEditar={abrirEdicion} onEliminar={setSuplenciaAEliminar} />
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
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader><DialogTitle className="font-black">¿Eliminar suplencia?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">La clase volverá a quedar a cargo de la titular y ya no afectará los honorarios. ¿Confirmás?</p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setSuplenciaAEliminar(null)} className="rounded-xl font-bold">Cancelar</Button>
              <Button type="button" disabled={eliminar.isPending} onClick={() => { if (!suplenciaAEliminar) return; eliminar.mutate(suplenciaAEliminar.idClase, { onSuccess: () => { setSuplenciaAEliminar(null); toast.success("Suplencia eliminada"); } }); }} className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700">{eliminar.isPending ? "Eliminando..." : "Eliminar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ContenidoBase>
    </OwnerLayout>
  );
}

function ContenidoBase({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 space-y-6"><nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Link to="/app" className="hover:text-slate-800 dark:hover:text-slate-200">Inicio</Link><span>/</span><span>Honorarios</span><span>/</span><span className="font-bold text-slate-800 dark:text-slate-200">Suplencias</span></nav>{children}</div>;
}
