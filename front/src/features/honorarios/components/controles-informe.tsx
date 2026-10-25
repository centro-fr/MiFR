import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormatoExportacion } from "@/features/honorarios/hooks/use-exportar-informe";
import { etiquetaPeriodo, periodosConsultables } from "@/features/honorarios/utils/periodo";

interface PropsSelectorMes {
  periodo: string;
  onChange: (periodo: string) => void;
}

export function SelectorMes({ periodo, onChange }: PropsSelectorMes) {
  return (
    <Select value={periodo} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Mes del informe"
        className="h-11 w-auto grow basis-56 justify-start gap-2 rounded-xl sm:min-w-48 sm:grow-0 sm:basis-auto [&>svg]:ml-auto border-border bg-white px-3 text-sm font-bold text-dark shadow-xs dark:bg-surface-low dark:text-white"
      >
        <span aria-hidden="true" className="font-medium text-muted-foreground">
          Mes
        </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periodosConsultables().map((opcion) => (
          <SelectItem key={opcion} value={opcion} className="min-h-11 pointer-fine:min-h-10">
            {etiquetaPeriodo(opcion)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface PropsMenuExportar {
  /** Sin liquidaciones no hay nada que exportar. */
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
