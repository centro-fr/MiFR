// Los parámetros que configura la propietaria (tabla parametros_sistema del DER) y el tipo de
// cada uno ya convertido desde su tipo_dato. Sumar uno nuevo es agregarlo acá y al seed.
export interface ValoresParametros {
  DATOS_BANCARIOS_CBU: string;
  DATOS_BANCARIOS_ALIAS: string;
  DATOS_BANCARIOS_TITULAR: string;
  VENCIDOS_PUEDEN_ASISTIR: boolean;
  MINUTOS_CIERRE_ASISTENCIA: number;
}

export type ClaveParametro = keyof ValoresParametros;
