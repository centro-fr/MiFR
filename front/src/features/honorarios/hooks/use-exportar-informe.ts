import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import type { FormatoExportacion } from "@/components/menu-exportar";
import type { DatosImpresion } from "@/features/honorarios/components/informe-imprimible";
import { useCargarDetalles } from "@/features/honorarios/hooks/use-honorarios";
import { armarCsvHonorarios, nombreArchivoHonorarios } from "@/features/honorarios/utils/exportar-csv";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import type { InformeHonorarios } from "@/types/honorarios";
import { descargarCsv } from "@/utils/csv";

/**
 * Exportar el informe (US-23): el back devuelve los datos y el front arma el archivo, como el
 * comprobante de US-15 (decisión de back/SPRINT-4.md). El PDF sale del diálogo de impresión del
 * navegador ("Guardar como PDF") y la planilla es un CSV que abre Excel: ninguna librería nueva.
 */
export function useExportarInforme(informe: InformeHonorarios | undefined) {
  const cargarDetalles = useCargarDetalles();
  const { data: todosLosPlanes = [] } = usePlanes();
  const [preparando, setPreparando] = useState<FormatoExportacion | null>(null);
  const [impresion, setImpresion] = useState<DatosImpresion | null>(null);

  function imprimir(datos: DatosImpresion) {
    // El informe tiene que estar en el DOM antes de abrir el diálogo, y se desmonta al cerrarlo.
    const tituloOriginal = document.title;
    document.title = "Centro de Entrenamiento FR";
    flushSync(() => setImpresion(datos));
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("preparando-informe-impresion");
        setImpresion(null);
        document.title = tituloOriginal;
      },
      { once: true },
    );
    document.body.classList.add("preparando-informe-impresion");
    window.requestAnimationFrame(() => window.print());
  }

  async function exportar(formato: FormatoExportacion) {
    if (!informe || informe.liquidaciones.length === 0 || preparando) return;
    setPreparando(formato);
    try {
      const detalles = await cargarDetalles(informe.liquidaciones.map((fila) => fila.id));
      if (formato === "csv") {
        descargarCsv(armarCsvHonorarios(informe, detalles), nombreArchivoHonorarios(informe.periodo));
        toast.success("Se descargó la planilla del informe. Abrila con Excel.");
      } else {
        const planesParaImpresion = todosLosPlanes
          .filter((p) => p.precioVigente !== null)
          .map((p) => ({ nombre: p.nombre, precio: p.precioVigente! }));
        imprimir({
          informe,
          detalles,
          generadoEl: new Date().toISOString(),
          planes: planesParaImpresion,
        });
      }
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo preparar el informe. Probá de nuevo."));
    } finally {
      setPreparando(null);
    }
  }

  return { exportar, preparando, impresion };
}
