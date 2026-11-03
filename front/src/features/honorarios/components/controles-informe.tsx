import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
