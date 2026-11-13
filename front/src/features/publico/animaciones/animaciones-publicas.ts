import { gsap } from "gsap";

// Todas las animaciones usan from(): el estado final es el que dibuja el CSS. Si GSAP no corre, o la
// persona pidió reducir el movimiento, la página se ve completa y quieta.
// Los selectores se resuelven dentro de la raíz de cada componente (useAnimacion la pasa como scope).

export type Animacion = (raiz: HTMLElement) => void;

export const animarEntradaDelEncabezado: Animacion = (raiz) => {
  gsap.from(raiz, { y: -16, autoAlpha: 0, duration: 0.5, delay: 0.1, ease: "power3.out" });
};

// El título es lo principal y llega primero, renglón por renglón; el botón y la bajada lo siguen con
// menos recorrido y quedan quietos antes del segundo, para que se puedan tocar enseguida. La foto es
// decoración: se aclara con un zoom mínimo, de fondo.
export const animarPortada: Animacion = (raiz) => {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from("[data-foto]", { scale: 1.04, filter: "contrast(1.1) brightness(0.35)", duration: 1.4, ease: "power2.out" }, 0)
    .from("[data-linea] > span", { yPercent: 110, duration: 0.55, stagger: 0.12, ease: "power4.out" }, 0.05)
    .from("[data-bajada] > *", { y: 12, autoAlpha: 0, duration: 0.4 }, 0.35);

  // Parallax: la foto baja más lento que la página y el texto se desvanece al salir.
  const alSalirDeLaPortada = { trigger: raiz, start: "top top", scrub: true };
  gsap.to("[data-foto]", { yPercent: 16, scale: 1.06, ease: "none", scrollTrigger: { ...alSalirDeLaPortada, end: "bottom top" } });
  gsap.to("[data-contenido]", { y: -110, autoAlpha: 0, ease: "none", scrollTrigger: { ...alSalirDeLaPortada, end: "70% top" } });
};

// Secciones de abajo: el título sube renglón por renglón y después aparecen sus elementos
// ([data-aparece]) con sus rayas dibujándose de izquierda a derecha ([data-raya]).
export const animarSeccion: Animacion = (raiz) => {
  const titulo = raiz.querySelector("[data-titulo]");
  if (titulo) {
    gsap.from(titulo.querySelectorAll("[data-linea] > span"), {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.12,
      ease: "power4.out",
      scrollTrigger: { trigger: titulo, start: "top 88%" },
    });
  }

  const elementos = raiz.querySelectorAll("[data-aparece]");
  if (elementos.length === 0) return;
  const aparicion = gsap
    .timeline({ scrollTrigger: { trigger: elementos[0], start: "top 90%" } })
    // Retrasos que se achican y un total con tope: con muchas actividades, la última no espera de más.
    .from(elementos, { y: 32, autoAlpha: 0, duration: 0.6, stagger: { amount: 0.3, ease: "power2.out" }, ease: "power3.out" }, 0);

  const rayas = raiz.querySelectorAll("[data-raya]");
  if (rayas.length > 0) {
    aparicion.from(rayas, { scaleX: 0, transformOrigin: "left", duration: 0.8, stagger: { amount: 0.3, ease: "power2.out" }, ease: "power2.inOut" }, 0.1);
  }
};
