import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Animacion } from "./animaciones-publicas";

const SIN_PEDIDO_DE_MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: no-preference)";

// Corre una animación de GSAP sobre la raíz de un componente. gsap.matchMedia la arma solo si la
// persona no pidió reducir el movimiento y la revierte entera (ScrollTriggers incluidos) al
// desmontar. useLayoutEffect: el from() fija el estado inicial antes del primer pintado, sin parpadeo.
// `lista` deja esperar a que lleguen los datos de la sección antes de animar sus elementos.
export function useAnimacion(raiz: RefObject<HTMLElement | null>, animar: Animacion, lista = true) {
  useLayoutEffect(() => {
    const elemento = raiz.current;
    if (!elemento || !lista || typeof window.matchMedia !== "function") return;

    // Se registra recién acá: ScrollTrigger consulta matchMedia al registrarse y fuera de un
    // navegador (jsdom en los tests) no existe. Registrarlo de nuevo no hace nada.
    gsap.registerPlugin(ScrollTrigger);
    const medios = gsap.matchMedia(elemento);
    medios.add(SIN_PEDIDO_DE_MOVIMIENTO_REDUCIDO, () => animar(elemento));
    return () => medios.revert();
  }, [raiz, animar, lista]);
}
