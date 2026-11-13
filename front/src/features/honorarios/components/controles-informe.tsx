import { ETIQUETA_FILTRO, GrupoDeFiltros } from "@/features/reportes/components/piezas-reporte";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import {
  MESES_DEL_ANIO,
  aniosConsultablesHonorarios,
  esPeriodoFuturo,
  esPeriodoNoFinalizado,
  periodoActual,
  ultimoMesCerrado,
} from "@/features/honorarios/utils/periodo";

interface PropsFiltrosDelMes {
  periodo: string;
  onChange: (periodo: string) => void;
  soloCerrados?: boolean;
  permitirTodos?: boolean;
}

/**
 * Mes y año del informe:
 * - En Honorarios (soloCerrados=true): solo meses finalizados/cerrados.
 * - En Suplencias (permitirTodos=true): permite listar todas o filtrar por mes (incluyendo el actual).
 */
export function FiltrosDelMes({
  periodo,
  onChange,
  soloCerrados = true,
  permitirTodos = false,
}: PropsFiltrosDelMes) {
  const cerrado = ultimoMesCerrado();
  const actual = periodoActual();
  const valorDefecto = permitirTodos ? "TODOS" : cerrado;

  const esTodos = periodo === "TODOS" || !periodo;
  const [anio = actual.slice(0, 4), mes = esTodos ? "" : actual.slice(5, 7)] = esTodos ? [actual.slice(0, 4), ""] : periodo.split("-");
  const anioNum = Number(anio);
  const anios = aniosConsultablesHonorarios(anioNum);

  function cambiarAnio(nuevoAnio: string) {
    if (esTodos) {
      onChange(`${nuevoAnio}-01`);
      return;
    }
    const maxMes = soloCerrados ? Number(cerrado.slice(5, 7)) : Number(actual.slice(5, 7));
    const maxAnio = soloCerrados ? Number(cerrado.slice(0, 4)) : Number(actual.slice(0, 4));
    const mesAjustado = Number(nuevoAnio) === maxAnio && Number(mes) > maxMes ? String(maxMes).padStart(2, "0") : mes;
    onChange(`${nuevoAnio}-${mesAjustado}`);
  }

  const estaDeshabilitado = (valorMes: string) => {
    const mesNum = Number(valorMes);
    return soloCerrados ? esPeriodoNoFinalizado(anioNum, mesNum) : esPeriodoFuturo(anioNum, mesNum);
  };

  return (
    <GrupoDeFiltros
      onLimpiar={() => onChange(valorDefecto)}
      hayFiltros={periodo !== valorDefecto}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="honorarios-mes" className={ETIQUETA_FILTRO}>
          Mes
        </label>
        <SelectorDesplegable
          id="honorarios-mes"
          aria-label="Mes"
          valor={mes}
          todos={permitirTodos ? "Todos los meses" : undefined}
          conOpcionesNativas
          opciones={MESES_DEL_ANIO.map(({ valor, etiqueta }) => ({
            valor,
            texto: etiqueta,
            disabled: estaDeshabilitado(valor),
          }))}
          onChange={(nuevoMes) => {
            if (!nuevoMes || nuevoMes === "TODOS") {
              onChange("TODOS");
            } else {
              onChange(`${anio}-${nuevoMes}`);
            }
          }}
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
