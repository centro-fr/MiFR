import type { tipo_dato_parametro } from "@prisma/client";

export type TipoDatoParametro = tipo_dato_parametro;

// Los parámetros que configura la propietaria (tabla parametros_sistema del DER) y el tipo de
// cada uno ya convertido desde su tipo_dato. Sumar uno nuevo es agregarlo acá y al catálogo.
export interface ValoresParametros {
  DATOS_BANCARIOS_CBU: string;
  DATOS_BANCARIOS_ALIAS: string;
  DATOS_BANCARIOS_TITULAR: string;
  VENCIDOS_PUEDEN_ASISTIR: boolean;
  MINUTOS_CIERRE_ASISTENCIA: number;
  DIAS_RESERVA_PREINSCRIPCION: number;
  DIAS_AVISO_VENCIMIENTO: number;
  INASISTENCIAS_CONSECUTIVAS_INACTIVO: number;
  RANKING_MINIMO_CLASES: number;
  DIA_CIERRE_HONORARIOS: number;
}

export type ClaveParametro = keyof ValoresParametros;

// El tipo_dato que corresponde al tipo de TypeScript de cada clave: así el catálogo no puede
// declarar como TEXTO un parámetro que el resto del código lee como número.
export type TipoDatoDe<T> = T extends boolean
  ? "BOOLEANO"
  : T extends number
    ? "ENTERO" | "DECIMAL"
    : "TEXTO";

export interface DefinicionParametro<T> {
  tipo_dato: TipoDatoDe<T>;
  valor_inicial: string;
  descripcion: string;
}

export type CatalogoParametros = { [C in ClaveParametro]: DefinicionParametro<ValoresParametros[C]> };

// Un parámetro como lo ve la API: su valor ya convertido a su tipo. fecha_actualizacion es null si
// todavía no tiene fila y rige su valor inicial del catálogo.
export interface Parametro {
  clave: ClaveParametro;
  tipo_dato: TipoDatoParametro;
  valor: ValoresParametros[ClaveParametro];
  descripcion: string;
  fecha_actualizacion: Date | null;
}

// US-16: lo que necesita el alumno o su tutor para transferir.
export interface DatosBancarios {
  cbu: string;
  alias: string;
  titular: string;
}
