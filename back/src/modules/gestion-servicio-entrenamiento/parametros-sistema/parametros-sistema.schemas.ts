import { z } from "../../../shared/utils/zod.js";
import { enteroNoNegativoSchema } from "../../../shared/utils/esquemas-numero.js";
import { textoBusquedaSchema } from "../../../shared/utils/esquemas-texto.js";
import { CATALOGO_PARAMETROS } from "./parametros-sistema.catalogo.js";
import type { ClaveParametro } from "./parametros-sistema.types.js";

const CLAVES = Object.keys(CATALOGO_PARAMETROS) as [ClaveParametro, ...ClaveParametro[]];

// parametros_sistema.valor es VARCHAR(100) en el DER. Los datos bancarios pueden quedar vacíos: la
// propietaria los carga después y puede borrarlos.
const texto = textoBusquedaSchema(100);

// Qué valor admite cada parámetro. Es un Record sobre ClaveParametro: al sumar un parámetro al
// catálogo, el compilador obliga a decir acá cómo se valida. Los enteros no pueden ser negativos; el
// tope corta errores de carga (un año de reserva, un día de gracia para marcar la asistencia).
const VALOR_POR_CLAVE: Record<ClaveParametro, z.ZodType<string | number | boolean>> = {
  DATOS_BANCARIOS_CBU: texto,
  DATOS_BANCARIOS_ALIAS: texto,
  DATOS_BANCARIOS_TITULAR: texto,
  VENCIDOS_PUEDEN_ASISTIR: z.boolean({ error: "Debe ser verdadero o falso" }),
  MINUTOS_CIERRE_ASISTENCIA: enteroNoNegativoSchema(1440),
  DIAS_RESERVA_PREINSCRIPCION: enteroNoNegativoSchema(365),
  DIAS_AVISO_VENCIMIENTO: enteroNoNegativoSchema(30),
  // Con 0 todos los alumnos serían inactivos.
  INASISTENCIAS_CONSECUTIVAS_INACTIVO: enteroNoNegativoSchema(30).refine(
    (valor) => valor > 0,
    "Tiene que ser mayor a 0",
  ),
  // Con 0 entra al ranking cualquiera que haya tenido una clase en el período.
  RANKING_MINIMO_CLASES: enteroNoNegativoSchema(100),
  // Hasta 28 para que el día exista en todos los meses; con 0 no habría día de cierre.
  DIA_CIERRE_HONORARIOS: enteroNoNegativoSchema(28).refine((valor) => valor > 0, "Tiene que ser mayor a 0"),
};

export const claveParametroParamSchema = z.object({ clave: z.enum(CLAVES) });

// El tipo del valor depende de la clave, que viene en la URL: acá solo se comprueba que haya un valor
// de algún tipo y el resto lo valida valorDelParametro.
export const actualizarParametroSchema = z.object({
  valor: z.union([z.string(), z.number(), z.boolean()]),
});

// Valida el valor contra el tipo y el rango de su clave y lo devuelve como se guarda (texto).
// Si no es válido tira un ZodError, que el manejador de errores responde con 400.
export function valorDelParametro(clave: ClaveParametro, valor: unknown): string {
  return String(VALOR_POR_CLAVE[clave].parse(valor));
}

export type ActualizarParametroInput = z.infer<typeof actualizarParametroSchema>;
