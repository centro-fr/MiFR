import { ETIQUETA_FILTRO, GrupoDeFiltros } from "@/features/reportes/components/piezas-reporte";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
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
        <SelectorDesplegable
          id="honorarios-mes"
          aria-label="Mes"
          valor={mes}
          conOpcionesNativas
          opciones={MESES_DEL_ANIO.map(({ valor, etiqueta }) => ({
            valor,
            texto: etiqueta,
            disabled: esPeriodoFuturo(anioNum, Number(valor)),
          }))}
          onChange={(nuevoMes) => onChange(`${anio}-${nuevoMes}`)}
          variante="formulario"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="honorarios-anio" className={ETIQUETA_FILTRO}>
          Año
        </label>
        <SelectorDesplegable
          id="honorarios-anio"
          aria-label="Año"
          valor={anio}
          conOpcionesNativas
          opciones={anios.map((opcion) => ({ valor: String(opcion), texto: String(opcion) }))}
          onChange={(nuevoAnio) => cambiarAnio(nuevoAnio)}
          variante="formulario"
        />
      </div>
    </GrupoDeFiltros>
  );
}
