import { CATALOGO_PARAMETROS } from "./parametros-sistema.catalogo.js";
import type { IInfoParametros } from "./interface/i-info-parametros.js";
import type { FilaParametro, ParametrosSistemaRepository } from "./parametros-sistema.repository.js";
import { valorDelParametro } from "./parametros-sistema.schemas.js";
import type {
  ClaveParametro,
  DatosBancarios,
  Parametro,
  TipoDatoParametro,
  ValoresParametros,
} from "./parametros-sistema.types.js";

const CLAVES = Object.keys(CATALOGO_PARAMETROS) as ClaveParametro[];

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

// Sin fila, el parámetro rige con su valor inicial del catálogo.
function armarParametro(clave: ClaveParametro, fila?: FilaParametro): Parametro {
  const { tipo_dato, valor_inicial, descripcion } = CATALOGO_PARAMETROS[clave];
  return {
    clave,
    tipo_dato,
    valor: convertir(clave, tipo_dato, fila?.valor ?? valor_inicial),
    descripcion,
    fecha_actualizacion: fila?.fecha_actualizacion ?? null,
  };
}

// Realiza IInfoParametros del componente ParametrosSistema (GestionServicioEntrenamiento): la lectura
// de la configuración del centro para los demás componentes. Además atiende lo que la API le pide a
// la propietaria: ver y editar los parámetros, y los datos bancarios que ven alumnos y tutores.
export class ParametrosSistemaService implements IInfoParametros {
  constructor(private readonly repositorio: ParametrosSistemaRepository) {}

  // Las migraciones se aplican solas al publicar, pero el seed se corre a mano: si un parámetro nuevo
  // todavía no tiene fila, rige su valor inicial del catálogo.
  async obtener<C extends ClaveParametro>(clave: C): Promise<ValoresParametros[C]> {
    const { tipo_dato, valor_inicial } = CATALOGO_PARAMETROS[clave];
    const valor = (await this.repositorio.buscarValor(clave)) ?? valor_inicial;
    return convertir(clave, tipo_dato, valor) as ValoresParametros[C];
  }

  // Todos los del catálogo, en su orden, también los que todavía no tienen fila.
  async listar(): Promise<Parametro[]> {
    const filas = new Map((await this.repositorio.listar()).map((fila) => [fila.clave, fila]));
    return CLAVES.map((clave) => armarParametro(clave, filas.get(clave)));
  }

  // El valor se valida contra el tipo y el rango de su clave (un ZodError sale como 400).
  async actualizar(clave: ClaveParametro, valor: unknown): Promise<Parametro> {
    const { tipo_dato, descripcion } = CATALOGO_PARAMETROS[clave];
    const fila = await this.repositorio.guardar(
      clave,
      valorDelParametro(clave, valor),
      tipo_dato,
      descripcion,
    );
    return armarParametro(clave, fila);
  }

  async obtenerDatosBancarios(): Promise<DatosBancarios> {
    const [cbu, alias, titular] = await Promise.all([
      this.obtener("DATOS_BANCARIOS_CBU"),
      this.obtener("DATOS_BANCARIOS_ALIAS"),
      this.obtener("DATOS_BANCARIOS_TITULAR"),
    ]);
    return { cbu, alias, titular };
  }
}
