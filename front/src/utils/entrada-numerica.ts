import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";

// Filtros para los campos que solo admiten números (teléfonos, cupos, días, montos, medidas). Lo que
// no es un dígito se descarta al escribir o pegar, así nunca entra un signo menos, una letra ni la
// "e" de la notación científica que <input type="number"> deja escribir.

/** Deja solo los dígitos, cortados en `maximoDigitos` si se indica. */
export function soloDigitos(valor: string, maximoDigitos?: number): string {
  const digitos = valor.replace(/\D/g, "");
  return maximoDigitos === undefined ? digitos : digitos.slice(0, maximoDigitos);
}

/** Un teléfono se guarda solo con dígitos: entre 7 y 15 según la validación del back. */
export const MAXIMO_DIGITOS_TELEFONO = 15;

export function soloDigitosDeTelefono(valor: string): string {
  return soloDigitos(valor, MAXIMO_DIGITOS_TELEFONO);
}

/**
 * Deja un número decimal positivo: dígitos y un solo separador decimal, coma o punto como se haya
 * escrito (los formularios aceptan los dos), con hasta `maximoDecimales` decimales.
 */
export function soloDecimal(valor: string, maximoDecimales = 2): string {
  const limpio = valor.replace(/[^\d.,]/g, "");
  const posicionSeparador = limpio.search(/[.,]/);
  if (posicionSeparador === -1) return limpio;
  const entera = limpio.slice(0, posicionSeparador);
  const decimales = soloDigitos(limpio.slice(posicionSeparador + 1), maximoDecimales);
  return `${entera}${limpio[posicionSeparador]}${decimales}`;
}

/**
 * Para los precios de los planes, que se escriben con puntos de miles y coma decimal ("28.000,50"):
 * deja dígitos, puntos antes de la coma y una sola coma con hasta `maximoDecimales` decimales. El
 * formato exacto lo valida el esquema del plan.
 */
export function soloImporteConMiles(valor: string, maximoDecimales = 2): string {
  const limpio = valor.replace(/[^\d.,]/g, "");
  const posicionComa = limpio.indexOf(",");
  if (posicionComa === -1) return limpio;
  return `${limpio.slice(0, posicionComa)},${soloDigitos(limpio.slice(posicionComa + 1), maximoDecimales)}`;
}

// Teclas de edición y navegación: no escriben caracteres y tienen que seguir andando.
const TECLAS_DE_CONTROL = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

/**
 * onKeyDown para un <input type="number">: el navegador deja escribir "e", "+", "-" y el separador
 * decimal, y como su value queda vacío, el filtro del onChange no los puede borrar de la pantalla.
 */
export function bloquearTeclasNoNumericas(evento: KeyboardEvent<HTMLInputElement>, permitirDecimal = false): void {
  const { key, ctrlKey, metaKey } = evento;
  if (ctrlKey || metaKey || TECLAS_DE_CONTROL.has(key)) return;
  if (/^\d$/.test(key)) return;
  if (permitirDecimal && (key === "." || key === ",")) return;
  evento.preventDefault();
}

/** onPaste para un <input type="number">: no deja pegar un texto que no sea un número positivo. */
export function bloquearPegadoNoNumerico(evento: ClipboardEvent<HTMLInputElement>, permitirDecimal = false): void {
  const texto = evento.clipboardData.getData("text").trim();
  const patron = permitirDecimal ? /^\d+([.,]\d+)?$/ : /^\d+$/;
  if (!patron.test(texto)) evento.preventDefault();
}

/**
 * Filtra lo que se escribe en un campo registrado con react-hook-form: corrige el valor del input
 * antes de que el formulario lo lea.
 */
export function registroFiltrado<R extends { onChange: (evento: ChangeEvent<HTMLInputElement>) => unknown }>(
  registro: R,
  filtro: (valor: string) => string,
): R {
  return {
    ...registro,
    onChange: (evento: ChangeEvent<HTMLInputElement>) => {
      evento.target.value = filtro(evento.target.value);
      return registro.onChange(evento);
    },
  };
}
