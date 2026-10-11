import { CATALOGO_PARAMETROS } from "./parametros-sistema.catalogo.js";
import type { IInfoParametros } from "./interface/i-info-parametros.js";
import type { ParametrosSistemaRepository } from "./parametros-sistema.repository.js";
import type { ClaveParametro, TipoDatoParametro, ValoresParametros } from "./parametros-sistema.types.js";

const FORMATOS: Record<Exclude<TipoDatoParametro, "TEXTO">, RegExp> = {
  ENTERO: /^-?\d+$/,
  DECIMAL: /^-?\d+(\.\d+)?$/,
  BOOLEANO: /^(true|false)$/,
};

function convertir(clave: ClaveParametro, tipo: TipoDatoParametro, valor: string): string | number | boolean {
  if (tipo === "TEXTO") return valor;
  // Un valor que no respeta su tipo solo puede venir de una edición a mano de la base: es un error de
  // configuración, no del pedido, así que va como error interno y queda registrado en el log.
  if (!FORMATOS[tipo].test(valor)) {
    throw new Error(`El parámetro ${clave} tiene el valor "${valor}", que no es ${tipo}`);
  }
  return tipo === "BOOLEANO" ? valor === "true" : Number(valor);
}

// Realiza IInfoParametros del componente ParametrosSistema (GestionServicioEntrenamiento): la lectura
// de la configuración del centro. La edición desde la API (GET y PATCH /parametros) va aparte.
export class ParametrosSistemaService implements IInfoParametros {
  constructor(private readonly repositorio: ParametrosSistemaRepository) {}

  // Las migraciones se aplican solas al publicar, pero el seed se corre a mano: si un parámetro nuevo
  // todavía no tiene fila, rige su valor inicial del catálogo.
  async obtener<C extends ClaveParametro>(clave: C): Promise<ValoresParametros[C]> {
    const { tipo_dato, valor_inicial } = CATALOGO_PARAMETROS[clave];
    const valor = (await this.repositorio.buscarValor(clave)) ?? valor_inicial;
    return convertir(clave, tipo_dato, valor) as ValoresParametros[C];
  }
}
