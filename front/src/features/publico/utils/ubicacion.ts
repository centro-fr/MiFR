// Dónde está el centro. No lo guarda el back: cambia rara vez y se publica con el front.

export const DIRECCION_DEL_CENTRO = {
  calle: "Sánchez de Bustamante",
  altura: "425",
  codigoPostal: "Y4610",
  localidad: "Perico, Jujuy",
} as const;

export const DIRECCION_COMPLETA = `${DIRECCION_DEL_CENTRO.calle} ${DIRECCION_DEL_CENTRO.altura}, ${DIRECCION_DEL_CENTRO.localidad}`;

// El punto que marca Google Maps para la dirección (OpenStreetMap no tiene la numeración de Perico).
export const COORDENADAS_DEL_CENTRO: readonly [latitud: number, longitud: number] = [-24.3808932, -65.1178121];

export const DIAS_DE_CLASE = "Clases de lunes a viernes";

// Con el código postal, Google Maps no confunde la calle con otra Bustamante de la provincia.
const DIRECCION_PARA_BUSCAR = `${DIRECCION_DEL_CENTRO.calle} ${DIRECCION_DEL_CENTRO.altura}, ${DIRECCION_DEL_CENTRO.codigoPostal} ${DIRECCION_DEL_CENTRO.localidad}`;

export const ENLACE_COMO_LLEGAR = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECCION_PARA_BUSCAR)}`;
