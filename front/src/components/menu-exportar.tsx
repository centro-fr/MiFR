import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Exportar un informe (honorarios, asistencia): el PDF sale del diálogo de impresión del navegador
// ("Guardar como PDF") y la planilla es un CSV que abre Excel.

export type FormatoExportacion = "pdf" | "csv";

interface PropsMenuExportar {
  /** Sin datos no hay nada que exportar. */
  disabled: boolean;
  preparando: FormatoExportacion | null;
  onExportar: (formato: FormatoExportacion) => void;
}

export function MenuExportar({ disabled, preparando, onExportar }: PropsMenuExportar) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          disabled={disabled || preparando !== null}
          className="min-h-11 grow rounded-xl bg-primary px-4 text-sm font-extrabold sm:grow-0 text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-dark"
        >
          {preparando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
          {preparando ? "Preparando…" : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onSelect={() => onExportar("pdf")} className="min-h-11 gap-2">
          <FileText aria-hidden="true" className="size-4" />
          PDF (imprimir o guardar)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExportar("csv")} className="min-h-11 gap-2">
          <FileSpreadsheet aria-hidden="true" className="size-4" />
          Excel (planilla CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
