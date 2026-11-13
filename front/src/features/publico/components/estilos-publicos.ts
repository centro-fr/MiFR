// Clases que comparten las secciones de la página pública, para que todas alineen al mismo ancho y
// sus títulos tengan la misma escala.

export const CONTENEDOR_PUBLICO = "mx-auto w-full max-w-[1240px] px-4 md:px-6";

export const ESPACIO_DE_SECCION = "py-16 md:py-28";

export const TITULAR = "m-0 font-display font-extrabold uppercase font-stretch-expanded tracking-[-0.01em]";

export const TITULO_DE_SECCION = `${TITULAR} text-[28px] leading-[34px] md:text-[40px] md:leading-[48px]`;

// Texto calado: solo el contorno, para la primera parte de cada título.
export const TEXTO_HUECO = "text-transparent [-webkit-text-stroke:1.5px_#ffffff]";

const BOTON = "inline-flex w-full items-center justify-center gap-2.5 rounded-[3px] text-[15px] md:w-auto";

export const BOTON_DESTACADO = `${BOTON} group bg-primary px-7 font-extrabold text-white transition-colors hover:bg-primary-dark`;

export const BOTON_CONTORNO = `${BOTON} border border-publico-borde-fuerte px-6 font-bold text-white transition-colors hover:bg-white hover:text-publico-tinta`;

// La flecha de los botones destacados se corre un poco al pasar el mouse.
export const FLECHA_DEL_BOTON = "size-[18px] transition-transform duration-200 group-hover:translate-x-1";
