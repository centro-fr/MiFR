// Convierte la tarjeta del ranking (un <svg> armado en pantalla) en un PNG para compartir en historias,
// sin librerías: el SVG se dibuja en un canvas del tamaño de una historia (1080 × 1920).

const ANCHO = 1080;
const ALTO = 1920;

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error("No se pudo dibujar la imagen para compartir."));
    imagen.src = url;
  });
}

export async function svgAPng(svg: SVGSVGElement): Promise<Blob> {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copia.setAttribute("width", String(ANCHO));
  copia.setAttribute("height", String(ALTO));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" }));
  try {
    const imagen = await cargarImagen(url);
    const canvas = document.createElement("canvas");
    canvas.width = ANCHO;
    canvas.height = ALTO;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("El navegador no permite generar la imagen.");
    contexto.drawImage(imagen, 0, 0, ANCHO, ALTO);
    return await new Promise<Blob>((resolver, rechazar) =>
      canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo generar la imagen."))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Abre el menú de compartir del celular con la imagen. Donde no se pueden compartir archivos (la
 * mayoría de las computadoras), la descarga. false si la persona canceló.
 */
export async function compartirImagen(blob: Blob, nombre: string, titulo: string): Promise<boolean> {
  const archivo = new File([blob], nombre, { type: "image/png" });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: titulo });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      throw error;
    }
  }
  descargarArchivo(blob, nombre);
  return true;
}
