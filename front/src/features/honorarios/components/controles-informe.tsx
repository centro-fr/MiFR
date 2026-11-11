import { CONTROL_FILTRO, ETIQUETA_FILTRO, GrupoDeFiltros } from "@/features/reportes/components/piezas-reporte";
import {
  MESES_DEL_ANIO,
  aniosConsultablesHonorarios,
  esPeriodoFuturo,
  periodoActual,
} from "@/features/honorarios/utils/periodo";

interface PropsFiltrosDelMes {
  periodo: string;
  onChange: (periodo: string) => void;
}

/**
 * Mes y año del informe, como los filtros de Reportes: se aplican al elegirlos y "Limpiar filtros"
 * vuelve al mes en curso. Los meses que todavía no llegaron no se pueden elegir.
 */
export function FiltrosDelMes({ periodo, onChange }: PropsFiltrosDelMes) {
  const [anio = "2026", mes = "11"] = periodo.split("-");
  const anioNum = Number(anio);
  const anios = aniosConsultablesHonorarios(anioNum);
  const actual = periodoActual();

  function cambiarAnio(nuevoAnio: string) {
    const [anioAct, mesAct] = actual.split("-").map(Number);
    // Al volver al año en curso con un mes que todavía no llegó, se queda en el mes en curso.
    const mesAjustado = Number(nuevoAnio) === anioAct && Number(mes) > mesAct ? String(mesAct).padStart(2, "0") : mes;
    onChange(`${nuevoAnio}-${mesAjustado}`);
  }

  return (
    <GrupoDeFiltros onLimpiar={() => onChange(actual)} hayFiltros={periodo !== actual}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="honorarios-mes" className={ETIQUETA_FILTRO}>
          Mes
        </label>
        <select id="honorarios-mes" value={mes} onChange={(evento) => onChange(`${anio}-${evento.target.value}`)} className={CONTROL_FILTRO}>
          {MESES_DEL_ANIO.map(({ valor, etiqueta }) => (
            <option key={valor} value={valor} disabled={esPeriodoFuturo(anioNum, Number(valor))}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="honorarios-anio" className={ETIQUETA_FILTRO}>
          Año
        </label>
        <select id="honorarios-anio" value={anio} onChange={(evento) => cambiarAnio(evento.target.value)} className={CONTROL_FILTRO}>
          {anios.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>
    </GrupoDeFiltros>
  );
}
