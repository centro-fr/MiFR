import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import type { FormatoExportacion } from "@/components/menu-exportar";
import { descargarCsv } from "@/utils/csv";

// Exportar un reporte, como el informe de honorarios: el back devuelve los datos y el front arma el
// archivo. El PDF sale del diálogo de impresión del navegador y la planilla es un CSV que abre Excel.

interface Exportacion<Datos> {
  /** Pide lo que se exporta: puede ser más que lo que se ve (por ejemplo, todas las páginas). */
  preparar: () => Promise<Datos>;
  csv: (datos: Datos) => { contenido: string; nombreArchivo: string };
}

/** Lo que recibe la versión imprimible: los datos y cuándo se generó. */
export type Impresion<Datos> = { datos: Datos; generadoEl: string };

export function useExportarReporte<Datos>({ preparar, csv }: Exportacion<Datos>) {
  const [preparando, setPreparando] = useState<FormatoExportacion | null>(null);
  const [impresion, setImpresion] = useState<Impresion<Datos> | null>(null);

  function imprimir(datos: Datos) {
    // El informe tiene que estar en el DOM antes de abrir el diálogo, y se desmonta al cerrarlo.
    const tituloOriginal = document.title;
    document.title = "Centro de Entrenamiento FR";
    flushSync(() => setImpresion({ datos, generadoEl: new Date().toISOString() }));
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
    if (preparando) return;
    setPreparando(formato);
    try {
      const datos = await preparar();
      if (formato === "csv") {
        const { contenido, nombreArchivo } = csv(datos);
        descargarCsv(contenido, nombreArchivo);
        toast.success("Se descargó la planilla del informe. Abrila con Excel.");
      } else {
        imprimir(datos);
      }
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo preparar el informe. Probá de nuevo."));
    } finally {
      setPreparando(null);
    }
  }

  return { exportar, preparando, impresion };
}
