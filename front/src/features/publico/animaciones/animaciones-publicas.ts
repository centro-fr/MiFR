import { gsap } from "gsap";

// Todas las animaciones usan from(): el estado final es el que dibuja el CSS. Si GSAP no corre, o la
// persona pidió reducir el movimiento, la página se ve completa y quieta.
// Los selectores se resuelven dentro de la raíz de cada componente (useAnimacion la pasa como scope).

export type Animacion = (raiz: HTMLElement) => void;

export const animarEntradaDelEncabezado: Animacion = (raiz) => {
  gsap.from(raiz, { y: -24, autoAlpha: 0, duration: 0.7, delay: 0.2, ease: "power3.out" });
};

export const animarPortada: Animacion = (raiz) => {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from("[data-foto]", { scale: 1.15, filter: "contrast(1.1) brightness(0.35)", duration: 2.4, ease: "power2.out" }, 0)
    .from("[data-linea] > span", { yPercent: 110, duration: 1, stagger: 0.14, ease: "power4.out" }, 0.3)
    .from("[data-bajada] > *", { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, 0.85);

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
    .from(elementos, { y: 40, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: "power3.out" }, 0);

  const rayas = raiz.querySelectorAll("[data-raya]");
  if (rayas.length > 0) {
    aparicion.from(rayas, { scaleX: 0, transformOrigin: "left", duration: 0.9, stagger: 0.06, ease: "power2.inOut" }, 0.1);
  }
};
