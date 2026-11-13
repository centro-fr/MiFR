import { createContext, useContext } from "react";
import type { ItemConEstado } from "./use-owner-navigation";

export const EnAppMovilContext = createContext(false);

/** true dentro del shell móvil (profesora y alumno): la barra superior ya trae la flecha de volver. */
export function useEnAppMovil(): boolean {
  return useContext(EnAppMovilContext);
}

/** El ítem destacado (Inicio del alumno) va en el medio de la barra inferior. */
export function ordenEnLaBarra(items: ItemConEstado[]): ItemConEstado[] {
  const destacado = items.find((item) => item.destacado);
  if (!destacado) return items;
  const resto = items.filter((item) => item !== destacado);
  const mitad = Math.floor(resto.length / 2);
  return [...resto.slice(0, mitad), destacado, ...resto.slice(mitad)];
}
