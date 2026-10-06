// El back devuelve cupo null cuando la actividad grupal no tiene límite.
export function textoCupo(cupo: number | null): string {
  return cupo === null ? "Sin límite" : String(cupo);
}
