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
