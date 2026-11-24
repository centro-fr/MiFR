import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Settings, Users } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { ConfirmarAbono } from "@/features/honorarios/components/confirmar-abono";
import { FiltrosDelMes } from "@/features/honorarios/components/controles-informe";
import { DialogoConfiguracion } from "@/features/honorarios/components/dialogo-configuracion";
import { DialogoDetalle } from "@/features/honorarios/components/dialogo-detalle";
import { EncabezadoHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import { AvisoAdvertencias, InformeCargando, InformeConError, InformeVacio } from "@/features/honorarios/components/estados-informe";
import { InformeImprimible } from "@/features/honorarios/components/informe-imprimible";
import { EstadoDelMes } from "@/features/honorarios/components/estado-del-mes";
import { TablaHonorarios } from "@/features/honorarios/components/tabla-honorarios";
import { useDiaDeCierre } from "@/features/honorarios/hooks/use-dia-de-cierre";
import { useExportarInforme } from "@/features/honorarios/hooks/use-exportar-informe";
import { useInformeHonorarios } from "@/features/honorarios/hooks/use-honorarios";
import { useRecalcularMes } from "@/features/honorarios/hooks/use-recalcular-mes";
import { mesSigueAbierto, periodoDesdeParametro } from "@/features/honorarios/utils/periodo";
import type { LiquidacionResumen } from "@/types/honorarios";

/** Un diálogo que conserva su fila al cerrarse, para que el contenido no desaparezca durante la animación de salida. */
function useDialogoDeFila() {
  const [fila, setFila] = useState<LiquidacionResumen | null>(null);
  const [abierto, setAbierto] = useState(false);
  return {
    fila,
    abierto,
    abrir: (nueva: LiquidacionResumen) => {
      setFila(nueva);
      setAbierto(true);
    },
    cerrar: () => setAbierto(false),
  };
}

/**
 * Al entrar a un mes abierto que todavía no tiene liquidaciones, las calcula sin esperar al botón.
 * Lo intenta una sola vez por mes (el componente se monta de nuevo al cambiar de mes): si el cálculo
 * no deja liquidaciones o falla, no se repite en bucle y queda el botón para reintentar.
 */
function useCalculoAlEntrar(
  periodo: string,
  cantidadDeLiquidaciones: number | undefined,
  cierre: { isPending: boolean; isError: boolean; diaDeCierre: number },
  recalcular: () => Promise<void>,
) {
  const yaIntentado = useRef(false);
  const cierreListo = !cierre.isPending && !cierre.isError;
  const debeCalcular = cantidadDeLiquidaciones === 0 && cierreListo && mesSigueAbierto(periodo, cierre.diaDeCierre);

  useEffect(() => {
    if (!debeCalcular || yaIntentado.current) return;
    yaIntentado.current = true;
    void recalcular();
  }, [debeCalcular, recalcular]);
}

function LiquidacionDelMes({ periodo }: { periodo: string }) {
  const informe = useInformeHonorarios(periodo);
  // Sin el día de cierre no se sabe si el mes sigue abierto: se espera junto con el informe.
  const cierre = useDiaDeCierre();
  const recalculo = useRecalcularMes(periodo);
  const detalle = useDialogoDeFila();
  const abono = useDialogoDeFila();
  useCalculoAlEntrar(periodo, informe.data?.liquidaciones.length, cierre, recalculo.recalcular);

  if (informe.isPending || cierre.isPending) return <InformeCargando />;
  if (informe.isError) {
    return <InformeConError error={informe.error} reintentando={informe.isFetching} onReintentar={() => void informe.refetch()} />;
  }
  if (cierre.isError) {
    return <InformeConError error={cierre.error} reintentando={cierre.isFetching} onReintentar={() => void cierre.refetch()} />;
  }

  const { liquidaciones } = informe.data;
  const mesAbierto = mesSigueAbierto(periodo, cierre.diaDeCierre);
  const recalcular = () => void recalculo.recalcular();

  if (liquidaciones.length === 0) {
    if (recalculo.procesando) return <InformeCargando />;
    return <InformeVacio periodo={periodo} mesAbierto={mesAbierto} procesando={recalculo.procesando} onCalcular={recalcular} />;
  }

  return (
    <>
      <EstadoDelMes informe={informe.data} diaDeCierre={cierre.diaDeCierre} procesando={recalculo.procesando} onActualizar={recalcular} />
      {recalculo.error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {recalculo.error}
        </p>
      )}
      {recalculo.advertencias.length > 0 && (
        <AvisoAdvertencias advertencias={recalculo.advertencias} liquidaciones={liquidaciones} onCerrar={recalculo.descartarAdvertencias} />
      )}
      <TablaHonorarios liquidaciones={liquidaciones} onVerDetalle={detalle.abrir} onAbonar={abono.abrir} />
      <DialogoDetalle liquidacion={detalle.fila} abierto={detalle.abierto} periodo={periodo} onClose={detalle.cerrar} />
      <ConfirmarAbono liquidacion={abono.fila} abierto={abono.abierto} periodo={periodo} onClose={abono.cerrar} />
    </>
  );
}

// US-23: honorarios del mes. Solo la propietaria (HONORARIOS_VER_TODOS en el router). Mientras el mes
// sigue abierto se actualiza con un botón; se cierra solo (lo hace el back) y lo único manual después
// es marcar a quién ya se le abonó.
export function HonorariosPage() {
  const [parametros, setParametros] = useSearchParams();
  // El mes vive en la URL (?mes=2026-10): se puede volver a un informe anterior o compartir el enlace.
  const periodo = periodoDesdeParametro(parametros.get("mes"));
  const { data: informe } = useInformeHonorarios(periodo);
  const { exportar, preparando, impresion } = useExportarInforme(informe);
  const [configAbierta, setConfigAbierta] = useState(false);

  function cambiarPeriodo(nuevo: string) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.set("mes", nuevo);
      return siguientes;
    });
  }

  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        <EncabezadoHonorarios
          descripcion="Revisa el calculo del pago mensual para cada profesor/a"
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
              {/* Las suplencias ajustan estos montos: se abren con todos los meses visibles por defecto. */}
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-border bg-white px-4 font-bold text-dark dark:bg-surface-low dark:text-white"
              >
                <Link to="/app/honorarios/suplencias">
                  <Users aria-hidden="true" className="size-4" />
                  Suplencias
                </Link>
              </Button>
              <MenuExportar
                disabled={!informe || informe.liquidaciones.length === 0}
                preparando={preparando}
                onExportar={(formato) => void exportar(formato)}
              />
            </>
          }
        />
        <FiltrosDelMes periodo={periodo} onChange={cambiarPeriodo} soloCerrados />
        <LiquidacionDelMes key={periodo} periodo={periodo} />
      </div>
      <DialogoConfiguracion abierto={configAbierta} periodo={periodo} onClose={() => setConfigAbierta(false)} />
      {impresion && <InformeImprimible {...impresion} />}
    </OwnerLayout>
  );
}
