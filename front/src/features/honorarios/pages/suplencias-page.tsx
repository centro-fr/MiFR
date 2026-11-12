import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY, PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { FiltrosDelMes } from "@/features/honorarios/components/controles-informe";
import { DialogoConfiguracion } from "@/features/honorarios/components/dialogo-configuracion";
import { EncabezadoHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import { useTarifas } from "@/features/honorarios/hooks/use-honorarios";
import {
  esPeriodoEnCurso,
  etiquetaPeriodo,
  mesSigueAbierto,
  periodoActual,
  primerDiaDe,
  ultimoDiaDe,
} from "@/features/honorarios/utils/periodo";
import { ConfirmarEliminarSuplencia } from "@/features/suplencias/components/confirmar-eliminar-suplencia";
import { EstadoSuplencias } from "@/features/suplencias/components/estado-suplencias";
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

// Sin ícono ni botón propio: "Registrar suplencia" ya está en el encabezado, como en el resto de las pantallas.
function SinSuplencias({ periodo, abierto }: { periodo: string; abierto: boolean }) {
  const textoTitulo =
    periodo === "TODOS"
      ? "No hay suplencias registradas"
      : `No hubo suplencias en ${etiquetaPeriodo(periodo).toLowerCase()}`;
  return (
    <Card className="flex flex-col items-center gap-3 rounded-lg border-border px-5 py-14 text-center">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{textoTitulo}</h2>
      {periodo === "TODOS" ? (
        <p className="max-w-md text-sm text-muted-foreground">
          Las suplencias que se registren figurarán en este listado.
        </p>
      ) : (
        !abierto && <p className="max-w-md text-sm text-muted-foreground">Ese mes nadie cubrió clases de otro profesor/a.</p>
      )}
    </Card>
  );
}

// US-24: suplencias de clases cubiertas entre profesoras.
export function SuplenciasPage() {
  const [parametros, setParametros] = useSearchParams();
  const paramMes = parametros.get("mes");
  const periodo = paramMes && paramMes !== "TODOS" && /^\d{4}-\d{2}$/.test(paramMes) ? paramMes : "TODOS";
  const esTodos = periodo === "TODOS";
  const abierto = esTodos ? true : mesSigueAbierto(periodo);

  const filtros = useMemo(() => {
    if (esTodos) return {};
    return { desde: primerDiaDe(periodo), hasta: ultimoDiaDe(periodo) };
  }, [esTodos, periodo]);

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

  const [pagina, setPagina] = useState(0);
  const TAMANO_PAGINA = 10;

  const suplencias = useMemo(() => consultaSuplencias.data ?? [], [consultaSuplencias.data]);
  const total = suplencias.length;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const rangoInicio = total > 0 ? pagina * TAMANO_PAGINA + 1 : 0;
  const rangoFin = Math.min((pagina + 1) * TAMANO_PAGINA, total);
  const suplenciasPaginadas = useMemo(
    () => suplencias.slice(pagina * TAMANO_PAGINA, (pagina + 1) * TAMANO_PAGINA),
    [suplencias, pagina, TAMANO_PAGINA],
  );

  const montos = useMemo(() => {
    const tarifas = consultaTarifas.data ?? [];
    return new Map(suplencias.map((suplencia) => [suplencia.idClase, montoDeLaSuplencia(suplencia, tarifas)]));
  }, [suplencias, consultaTarifas.data]);

  function cambiarPeriodo(nuevo: string) {
    setPagina(0);
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (nuevo === "TODOS" || !nuevo) {
        siguientes.delete("mes");
      } else {
        siguientes.set("mes", nuevo);
      }
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
    if (suplencias.length === 0) return <SinSuplencias periodo={periodo} abierto={abierto} />;
    return (
      <>
        <TablaSuplencias
          suplencias={suplenciasPaginadas}
          montos={montos}
          editables={abierto}
          onEditar={abrirDialogo}
          onEliminar={setAEliminar}
        />

        {total > TAMANO_PAGINA && (
          <nav
            aria-label="Paginación de suplencias"
            className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs"
          >
            <p aria-live="polite" className="text-slate-500 dark:text-slate-400 font-medium">
              {rangoInicio}–{rangoFin} de {total} suplencias
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pagina === 0}
                onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
                className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
              >
                <ChevronLeft aria-hidden="true" className="mr-1 size-3.5" />
                Anterior
              </Button>
              <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                {pagina + 1} / {paginas}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={pagina + 1 >= paginas}
                onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))}
                className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
              >
                Siguiente
                <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
              </Button>
            </div>
          </nav>
        )}

        <p className="text-sm text-muted-foreground">
          Le paga el valor por hora de quien cubrió por la duración de la clase. Con el mes cerrado ya no se pueden cambiar.
        </p>
      </>
    );
  }

  return (
    // Se vuelve a Honorarios desde las migas de pan (Inicio / Otros / Honorarios / Suplencias), como en la ficha del alumno.
    <OwnerLayout submiga="Suplencias">
      <div className="min-w-0 space-y-6">
        <EncabezadoHonorarios
          titulo="Suplencias"
          descripcion="Quién cubrió cada clase. Se le paga a quien la cubrió y se le descuenta a quien faltó."
          acciones={
            <>
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
              <Button
                type="button"
                aria-haspopup="dialog"
                onClick={() => abrirDialogo(null)}
                className="h-11 rounded-xl bg-primary px-4 font-extrabold text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
              >
                <Plus aria-hidden="true" className="size-4" />
                Registrar suplencia
              </Button>
            </>
          }
        />
        <FiltrosDelMes periodo={periodo} onChange={cambiarPeriodo} permitirTodos />
        {!esTodos && <EstadoSuplencias periodo={periodo} />}
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
        fechaSugerida={periodo !== "TODOS" && !esPeriodoEnCurso(periodo) ? ultimoDiaDe(periodo) : fechaActualArgentina()}
      />
      <ConfirmarEliminarSuplencia suplencia={aEliminar} onClose={() => setAEliminar(null)} />
      <DialogoConfiguracion abierto={configAbierta} periodo={periodo === "TODOS" ? periodoActual() : periodo} onClose={() => setConfigAbierta(false)} />
    </OwnerLayout>
  );
}
