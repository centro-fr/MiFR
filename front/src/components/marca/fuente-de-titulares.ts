// Archivo (los titulares, en su ancho expandido) solo la usan la página pública y el login: cada una la
// pide con un <link precedence> y no va en index.html, así el resto del sistema no la descarga.
// React la sube al <head> y no la duplica.
export const FUENTE_DE_TITULARES = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,800&display=swap";
