import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { ConfirmarCambioEstado, type CambioDeEstado } from "@/features/honorarios/components/confirmar-cambio-estado";
import { MenuExportar } from "@/components/menu-exportar";
import { SelectorMes } from "@/features/honorarios/components/controles-informe";
import { EncabezadoHonorarios, PestanasHonorarios } from "@/features/honorarios/components/encabezado-honorarios";
import {
  AvisoAdvertencias,
  InformeCargando,
  InformeConError,
  InformeSinCalcular,
} from "@/features/honorarios/components/estados-informe";
import { InformeImprimible } from "@/features/honorarios/components/informe-imprimible";
import { ResumenDelMes } from "@/features/honorarios/components/resumen-del-mes";
import { TarifasDelMes } from "@/features/honorarios/components/tarifas-del-mes";
import { TarjetaProfesora } from "@/features/honorarios/components/tarjeta-profesora";
import { useExportarInforme } from "@/features/honorarios/hooks/use-exportar-informe";
import { useCalcularLiquidaciones, useInformeHonorarios } from "@/features/honorarios/hooks/use-honorarios";
import { periodoDesdeParametro } from "@/features/honorarios/utils/periodo";
import type { AdvertenciaHonorario } from "@/types/honorarios";

function LiquidacionDelMes({ periodo }: { periodo: string }) {
  const { data: informe, isPending, isError, error, refetch, isFetching } = useInformeHonorarios(periodo);
  const calcular = useCalcularLiquidaciones(periodo);
  // Lo informa solo el POST: se muestra hasta cerrarlo o cambiar de mes (la key del padre lo reinicia).
  const [advertencias, setAdvertencias] = useState<AdvertenciaHonorario[]>([]);
  const [cambio, setCambio] = useState<CambioDeEstado | null>(null);

  async function calcularMes() {
    try {
      const resultado = await calcular.mutateAsync();
      setAdvertencias(resultado.advertencias);
      toast.success(resultado.advertencias.length > 0 ? "Honorarios calculados, con líneas para revisar." : "Honorarios calculados.");
    } catch (errorCalculo) {
      toast.error(mensajeDeErrorApi(errorCalculo, "No se pudieron calcular los honorarios."));
    }
  }

  if (isPending) return <InformeCargando />;
  if (isError) return <InformeConError error={error} reintentando={isFetching} onReintentar={() => void refetch()} />;
  if (informe.liquidaciones.length === 0) {
    return <InformeSinCalcular periodo={periodo} calculando={calcular.isPending} onCalcular={() => void calcularMes()} />;
  }

  return (
    <>
      <ResumenDelMes informe={informe} calculando={calcular.isPending} onRecalcular={() => void calcularMes()} />
      {advertencias.length > 0 && (
        <AvisoAdvertencias advertencias={advertencias} liquidaciones={informe.liquidaciones} onCerrar={() => setAdvertencias([])} />
      )}
      <section aria-label="Honorarios por profesor/a" className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {informe.liquidaciones.map((liquidacion) => (
          <TarjetaProfesora
            key={liquidacion.id}
            liquidacion={liquidacion}
            onCambiarEstado={(fila, accion) => setCambio({ liquidacion: fila, accion })}
          />
        ))}
      </section>
      <ConfirmarCambioEstado cambio={cambio} periodo={periodo} onClose={() => setCambio(null)} />
    </>
  );
}

// US-23: informe mensual de honorarios. Solo la propietaria (HONORARIOS_VER_TODOS en el router);
// calcular, cerrar, marcar abonada y cambiar tarifas piden además HONORARIOS_LIQUIDAR.
export function HonorariosPage() {
  const [parametros, setParametros] = useSearchParams();
  // El mes vive en la URL (?mes=2026-10): se puede volver a un informe anterior o compartir el enlace.
  const periodo = periodoDesdeParametro(parametros.get("mes"));
  const { data: informe } = useInformeHonorarios(periodo);
  const { exportar, preparando, impresion } = useExportarInforme(informe);

  function cambiarPeriodo(nuevo: string) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.set("mes", nuevo);
      return siguientes;
    });
  }

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        <EncabezadoHonorarios
          acciones={
            <>
              <SelectorMes periodo={periodo} onChange={cambiarPeriodo} />
              <MenuExportar
                disabled={!informe || informe.liquidaciones.length === 0}
                preparando={preparando}
                onExportar={(formato) => void exportar(formato)}
              />
            </>
          }
        />
        <PestanasHonorarios />
        <TarifasDelMes periodo={periodo} />
        <LiquidacionDelMes key={periodo} periodo={periodo} />
      </div>
      {impresion && <InformeImprimible {...impresion} />}
    </OwnerLayout>
  );
}
