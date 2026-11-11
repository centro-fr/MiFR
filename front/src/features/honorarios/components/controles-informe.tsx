import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MESES_DEL_ANIO,
  aniosConsultablesHonorarios,
  esPeriodoFuturo,
  periodoActual,
} from "@/features/honorarios/utils/periodo";

interface PropsSelectorMes {
  periodo: string;
  onChange: (periodo: string) => void;
}

export function SelectorMes({ periodo, onChange }: PropsSelectorMes) {
  const [anio = "2026", mes = "11"] = periodo.split("-");
  const anioNum = Number(anio);
  const anios = aniosConsultablesHonorarios(anioNum);

  function cambiarMes(nuevoMes: string) {
    onChange(`${anio}-${nuevoMes}`);
  }

  function cambiarAnio(nuevoAnio: string) {
    const nuevoAnioNum = Number(nuevoAnio);
    const [anioAct, mesAct] = periodoActual().split("-").map(Number);
    let mesAjustado = mes;
    // Si cambia al año en curso y el mes elegido es futuro, se ajusta al mes en curso
    if (nuevoAnioNum === anioAct && Number(mes) > mesAct) {
      mesAjustado = String(mesAct).padStart(2, "0");
    }
    onChange(`${nuevoAnio}-${mesAjustado}`);
  }

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
      <Select value={mes} onValueChange={cambiarMes}>
        <SelectTrigger
          aria-label="Mes del informe"
          className="h-11 w-auto grow basis-36 justify-start gap-2 rounded-xl sm:min-w-36 sm:grow-0 sm:basis-auto [&>svg]:ml-auto border-border bg-white px-3 text-sm font-bold text-dark shadow-xs dark:bg-surface-low dark:text-white"
        >
          <span aria-hidden="true" className="font-medium text-muted-foreground">
            Mes
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES_DEL_ANIO.map(({ valor, etiqueta }) => {
            const deshabilitado = esPeriodoFuturo(anioNum, Number(valor));
            return (
              <SelectItem
                key={valor}
                value={valor}
                disabled={deshabilitado}
                className="min-h-11 pointer-fine:min-h-10"
              >
                {etiqueta}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={anio} onValueChange={cambiarAnio}>
        <SelectTrigger
          aria-label="Año del informe"
          className="h-11 w-auto grow basis-28 justify-start gap-2 rounded-xl sm:min-w-28 sm:grow-0 sm:basis-auto [&>svg]:ml-auto border-border bg-white px-3 text-sm font-bold text-dark shadow-xs dark:bg-surface-low dark:text-white"
        >
          <span aria-hidden="true" className="font-medium text-muted-foreground">
            Año
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anios.map((opcionAnio) => (
            <SelectItem key={opcionAnio} value={String(opcionAnio)} className="min-h-11 pointer-fine:min-h-10">
              {opcionAnio}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
