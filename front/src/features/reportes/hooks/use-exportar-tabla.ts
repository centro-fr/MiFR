import { useExportarReporte } from "@/features/reportes/hooks/use-exportar-reporte";
import { armarCsv, type TablaExportable } from "@/features/reportes/utils/tabla-exportable";

/** Exportar un informe armado como TablaExportable: planilla CSV o PDF con TablaImprimible. */
export function useExportarTabla(preparar: () => Promise<TablaExportable>) {
  return useExportarReporte<TablaExportable>({ preparar, csv: armarCsv });
}
