import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY, PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { SelectorMes } from "@/features/honorarios/components/controles-informe";
import { DialogoConfiguracion } from "@/features/honorarios/components/dialogo-configuracion";
import { EncabezadoHonorarios, PestanasHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import { useTarifas } from "@/features/honorarios/hooks/use-honorarios";
import {
  esPeriodoEnCurso,
  etiquetaPeriodo,
  mesSigueAbierto,
  periodoDesdeParametro,
  primerDiaDe,
  ultimoDiaDe,
} from "@/features/honorarios/utils/periodo";
import { ConfirmarEliminarSuplencia } from "@/features/suplencias/components/confirmar-eliminar-suplencia";
import { EstadoSuplencias, ResumenSuplencias } from "@/features/suplencias/components/resumen-suplencias";
import { SuplenciaDialog } from "@/features/suplencias/components/suplencia-dialog";
import { TablaSuplencias } from "@/features/suplencias/components/tabla-suplencias";
import { useActualizarSuplencia, useRegistrarSuplencia, useSuplencias } from "@/features/suplencias/hooks/use-suplencias";
import type { SuplenciaFormValues } from "@/features/suplencias/schemas/suplencia";
import { montoDeLaSuplencia } from "@/features/suplencias/utils/monto-suplencia";
import type { Suplencia } from "@/types/suplencia";
import { fechaActualArgentina } from "@/utils/fecha";

function SuplenciasCargando() {
  return <TablaSkeleton ariaLabel="Cargando suplencias" filas={5} />;
}

function SuplenciasConError({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <EstadoErrorCarga
      mensaje={mensajeDeErrorApi(error, "No se pudieron cargar las suplencias.")}
      onReintentar={onReintentar}
    />
  );
}

function SinSuplencias({ periodo, abierto, onRegistrar }: { periodo: string; abierto: boolean; onRegistrar: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-lg border-border px-5 py-14 text-center">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <Users className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">No hubo suplencias en {etiquetaPeriodo(periodo).toLowerCase()}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {abierto
          ? "Cuando alguien cubra una clase, registralo acá: se le paga a quien la cubrió y se le descuenta a quien faltó."
          : "Ese mes nadie cubrió clases de otro profesor/a."}
      </p>
      {abierto && (
        <Button type="button" onClick={onRegistrar} className="min-h-11 rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-dark">
          <Plus aria-hidden="true" className="size-4" />
          Registrar suplencia
        </Button>
      )}
    </Card>
  );
}

// US-24: las suplencias del mes, dentro de Honorarios. Se registran y corrigen mientras el mes sigue
// abierto; cuando se cierran los honorarios quedan fijas, igual que la liquidación.
export function SuplenciasPage() {
  const [parametros, setParametros] = useSearchParams();
  const periodo = periodoDesdeParametro(parametros.get("mes"));
  const abierto = mesSigueAbierto(periodo);
  const filtros = useMemo(() => ({ desde: primerDiaDe(periodo), hasta: ultimoDiaDe(periodo) }), [periodo]);
  const consultaSuplencias = useSuplencias(filtros);
  const consultaTarifas = useTarifas();
  const consultaHorarios = useQuery({ queryKey: HORARIOS_QUERY_KEY, queryFn: listarHorarios, staleTime: 5 * 60_000 });
  const consultaProfesoras = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  const registrar = useRegistrarSuplencia();
  const actualizar = useActualizarSuplencia();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Suplencia | null>(null);
  const [aEliminar, setAEliminar] = useState<Suplencia | null>(null);
  const [configAbierta, setConfigAbierta] = useState(false);

  const suplencias = useMemo(() => consultaSuplencias.data ?? [], [consultaSuplencias.data]);
  const montos = useMemo(() => {
    const tarifas = consultaTarifas.data ?? [];
    return new Map(suplencias.map((suplencia) => [suplencia.idClase, montoDeLaSuplencia(suplencia, tarifas)]));
  }, [suplencias, consultaTarifas.data]);

  function cambiarPeriodo(nuevo: string) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.set("mes", nuevo);
      return siguientes;
    });
  }

  function abrirDialogo(suplencia: Suplencia | null) {
    registrar.reset();
    actualizar.reset();
    setEditando(suplencia);
    setDialogoAbierto(true);
  }

  function guardar(datos: SuplenciaFormValues) {
    const motivo = datos.motivo.trim() || undefined;
    const alTerminar = (mensaje: string) => () => {
      setDialogoAbierto(false);
      toast.success(mensaje);
    };
    if (editando) {
      actualizar.mutate(
        { idClase: editando.idClase, cambios: { id_profesora_suplente: Number(datos.idProfesoraSuplente), motivo } },
        { onSuccess: alTerminar("Suplencia actualizada.") },
      );
      return;
    }
    registrar.mutate(
      { id_horario: Number(datos.idHorario), fecha_clase: datos.fechaClase, id_profesora_suplente: Number(datos.idProfesoraSuplente), motivo },
      {
        onSuccess: (resultado) => {
          alTerminar("Suplencia registrada.")();
          if (resultado.advertencia) toast.info(resultado.advertencia);
        },
      },
    );
  }

  function contenido() {
    if (consultaSuplencias.isPending) return <SuplenciasCargando />;
    if (consultaSuplencias.isError) return <SuplenciasConError error={consultaSuplencias.error} onReintentar={() => void consultaSuplencias.refetch()} />;
    if (suplencias.length === 0) return <SinSuplencias periodo={periodo} abierto={abierto} onRegistrar={() => abrirDialogo(null)} />;
    return (
      <>
        <ResumenSuplencias suplencias={suplencias} montos={montos} />
        <TablaSuplencias suplencias={suplencias} montos={montos} editables={abierto} onEditar={abrirDialogo} onEliminar={setAEliminar} />
        <p className="text-sm text-muted-foreground">
          Le paga el valor por hora de quien cubrió por la duración de la clase. Con el mes cerrado ya no se pueden cambiar.
        </p>
      </>
    );
  }

  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        <EncabezadoHonorarios
          descripcion="Quién cubrió cada clase del mes. Se le paga a quien la cubrió y se le descuenta a quien faltó."
          acciones={
            <>
              <SelectorMes periodo={periodo} onChange={cambiarPeriodo} />
              <Button
                type="button"
                variant="outline"
                aria-haspopup="dialog"
                onClick={() => setConfigAbierta(true)}
                className="h-11 rounded-xl border-border bg-white px-4 font-bold text-dark dark:bg-surface-low dark:text-white"
              >
                <Settings aria-hidden="true" className="size-4" />
                Configuración
              </Button>
              {abierto && (
                <Button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => abrirDialogo(null)}
                  className="h-11 rounded-xl bg-primary px-4 font-extrabold text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Registrar suplencia
                </Button>
              )}
            </>
          }
        />
        <PestanasHonorarios cantidadSuplencias={consultaSuplencias.data?.length} />
        <EstadoSuplencias periodo={periodo} />
        {contenido()}
      </div>

      <SuplenciaDialog
        key={editando?.idClase ?? "nueva-suplencia"}
        abierto={dialogoAbierto}
        suplencia={editando}
        horarios={consultaHorarios.data ?? []}
        profesoras={consultaProfesoras.data ?? []}
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
        fechaSugerida={esPeriodoEnCurso(periodo) ? fechaActualArgentina() : ultimoDiaDe(periodo)}
      />
      <ConfirmarEliminarSuplencia suplencia={aEliminar} onClose={() => setAEliminar(null)} />
      <DialogoConfiguracion abierto={configAbierta} periodo={periodo} onClose={() => setConfigAbierta(false)} />
    </OwnerLayout>
  );
}
