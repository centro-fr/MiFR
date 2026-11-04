import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Settings } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { MenuExportar } from "@/components/menu-exportar";
import { Button } from "@/components/ui/button";
import { ConfirmarCambioEstado, type CambioDeEstado } from "@/features/honorarios/components/confirmar-cambio-estado";
import { SelectorMes } from "@/features/honorarios/components/controles-informe";
import { DialogoConfiguracion } from "@/features/honorarios/components/dialogo-configuracion";
import { DialogoDetalle } from "@/features/honorarios/components/dialogo-detalle";
import { EncabezadoHonorarios, PestanasHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import { AvisoAdvertencias, InformeCargando, InformeConError, InformeVacio } from "@/features/honorarios/components/estados-informe";
import { InformeImprimible } from "@/features/honorarios/components/informe-imprimible";
import { EstadoDelMes, ResumenDelMes } from "@/features/honorarios/components/resumen-del-mes";
import { TablaHonorarios } from "@/features/honorarios/components/tabla-honorarios";
import { useAsegurarMes } from "@/features/honorarios/hooks/use-asegurar-mes";
import { useExportarInforme } from "@/features/honorarios/hooks/use-exportar-informe";
import { useInformeHonorarios } from "@/features/honorarios/hooks/use-honorarios";
import { periodoDesdeParametro } from "@/features/honorarios/utils/periodo";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { LiquidacionResumen } from "@/types/honorarios";

function LiquidacionDelMes({ periodo }: { periodo: string }) {
  const { data: informe, isPending, isError, error, refetch, isFetching } = useInformeHonorarios(periodo);
  const { hasPermission } = usePermissions();
  // Se calcula al entrar y se cierra solo pasado el día de cierre: no hay botones para eso.
  const asegurar = useAsegurarMes(periodo, informe, hasPermission("HONORARIOS_LIQUIDAR"));
  const [detalle, setDetalle] = useState<LiquidacionResumen | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [cambio, setCambio] = useState<CambioDeEstado | null>(null);

  if (isPending) return <InformeCargando />;
  if (isError) return <InformeConError error={error} reintentando={isFetching} onReintentar={() => void refetch()} />;
  if (informe.liquidaciones.length === 0) return <InformeVacio periodo={periodo} procesando={asegurar.procesando} />;

  return (
    <>
      <EstadoDelMes informe={informe} procesando={asegurar.procesando} />
      {asegurar.error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {asegurar.error}
        </p>
      )}
      {asegurar.advertencias.length > 0 && (
        <AvisoAdvertencias advertencias={asegurar.advertencias} liquidaciones={informe.liquidaciones} onCerrar={asegurar.descartarAdvertencias} />
      )}
      <ResumenDelMes informe={informe} />
      <TablaHonorarios
        liquidaciones={informe.liquidaciones}
        onVerDetalle={(fila) => {
          setDetalle(fila);
          setDetalleAbierto(true);
        }}
        onAbonar={(fila) => setCambio({ liquidacion: fila, accion: "abonar" })}
      />
      <DialogoDetalle liquidacion={detalle} abierto={detalleAbierto} periodo={periodo} onClose={() => setDetalleAbierto(false)} />
      <ConfirmarCambioEstado cambio={cambio} periodo={periodo} onClose={() => setCambio(null)} />
    </>
  );
}

// US-23: honorarios del mes. Solo la propietaria (HONORARIOS_VER_TODOS en el router). Cada mes se
// calcula al entrar y se cierra solo; lo único manual es marcar a quién ya se le abonó.
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
          descripcion="Se calculan solos con lo que pagan los alumnos de cada profesor/a y las suplencias del mes. El sistema no mueve dinero."
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
              <MenuExportar
                disabled={!informe || informe.liquidaciones.length === 0}
                preparando={preparando}
                onExportar={(formato) => void exportar(formato)}
              />
            </>
          }
        />
        <PestanasHonorarios />
        <LiquidacionDelMes key={periodo} periodo={periodo} />
      </div>
      <DialogoConfiguracion abierto={configAbierta} periodo={periodo} onClose={() => setConfigAbierta(false)} />
      {impresion && <InformeImprimible {...impresion} />}
    </OwnerLayout>
  );
}
