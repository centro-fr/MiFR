import { z } from "./zod.js";

// Postgres rechaza el carácter nulo (0x00) en columnas de texto y Prisma lo devolvía como error
// interno (500). El resto de los caracteres de control y los invisibles (\p{Cf}, como el espacio
// de ancho cero) tampoco tienen uso legítimo: hacen que dos textos iguales a la vista no lo sean.
const CARACTER_NO_PERMITIDO = /[\p{Cc}\p{Cf}]/u;
// En un texto de varias líneas (un textarea) los saltos de línea sí son válidos.
const CARACTER_NO_PERMITIDO_MULTILINEA = /(?![\n\r])[\p{Cc}\p{Cf}]/u;
// Un texto hecho solo de signos o números ("-0", "!!!", "123") no es un nombre ni una descripción.
const LETRA = /\p{L}/u;

interface OpcionesTexto {
  multilinea?: boolean;
}

function sinCaracteresNoPermitidos(valor: string, { multilinea = false }: OpcionesTexto): boolean {
  return !(multilinea ? CARACTER_NO_PERMITIDO_MULTILINEA : CARACTER_NO_PERMITIDO).test(valor);
}

// Texto libre obligatorio: sin espacios en los extremos, con al menos una letra y sin
// caracteres de control.
export function textoSchema(maximo: number, opciones: OpcionesTexto = {}) {
  return z
    .string()
    .trim()
    .min(1, "No puede estar vacío")
    .max(maximo, `Máximo ${maximo} caracteres`)
    .refine((valor) => sinCaracteresNoPermitidos(valor, opciones), "Contiene caracteres no permitidos")
    .refine((valor) => LETRA.test(valor), "Debe contener al menos una letra");
}

// Para columnas que admiten NULL. Un texto vacío o solo con espacios se guarda como NULL: así el
// formulario puede borrar el campo mandando "", y no quedan cadenas vacías en la base.
export function textoOpcionalSchema(maximo: number, opciones: OpcionesTexto = {}) {
  return z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
    textoSchema(maximo, opciones).nullable(),
  );
}

// Para filtros de búsqueda: puede venir vacío y no exige letras, pero sí un largo acotado y sin
// caracteres de control.
export function textoBusquedaSchema(maximo: number) {
  return z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .refine((valor) => sinCaracteresNoPermitidos(valor, {}), "Contiene caracteres no permitidos");
}
