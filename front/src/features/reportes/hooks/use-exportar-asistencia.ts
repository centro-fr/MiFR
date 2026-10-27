import { obtenerInformeCompleto } from "@/features/reportes/api/reportes-api";
import { useExportarReporte } from "@/features/reportes/hooks/use-exportar-reporte";
import { armarCsvAsistencia, nombreArchivoAsistencia } from "@/features/reportes/utils/exportar-asistencia";
import type { FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { FiltrosInformeAsistencia } from "@/types/reportes";

/** US-33: se exporta el informe con todos los alumnos, aunque la pantalla muestre una página. */
export function useExportarAsistencia(filtros: FiltrosInformeAsistencia, descripcion: FiltrosDescritos) {
  return useExportarReporte({
    preparar: () => obtenerInformeCompleto(filtros),
    csv: (informe) => ({ contenido: armarCsvAsistencia(informe, descripcion), nombreArchivo: nombreArchivoAsistencia(informe) }),
  });
}
