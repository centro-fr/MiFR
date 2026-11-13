import { useEffect, useState } from "react";

const UN_MINUTO_MS = 60_000;

/**
 * La hora actual, actualizada en cada cambio de minuto. Para mostrar "ahora" en un formulario que
 * puede quedar abierto un rato sin que el dato quede viejo.
 */
export function useMinutoActual(): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    let intervalo: number | undefined;
    // Primero hasta el próximo cambio de minuto y después cada minuto: cambia junto con el reloj.
    const espera = window.setTimeout(() => {
      setAhora(new Date());
      intervalo = window.setInterval(() => setAhora(new Date()), UN_MINUTO_MS);
    }, UN_MINUTO_MS - (Date.now() % UN_MINUTO_MS));
    return () => {
      window.clearTimeout(espera);
      window.clearInterval(intervalo);
    };
  }, []);

  return ahora;
}
