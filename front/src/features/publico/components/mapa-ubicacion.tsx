import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./mapa-ubicacion.css";

// Teselas estándar de OpenStreetMap: no piden clave (las oscuras de CARTO sí). El tono oscuro, para
// que vayan con el fondo de la página, sale de un filtro CSS (mapa-ubicacion.css).
// Su política de uso alcanza para el tráfico de un centro; con mucho más, conviene un proveedor propio.
const TESELAS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ZOOM_DE_CALLE = 16;

interface MapaUbicacionProps {
  coordenadas: readonly [number, number];
  nombre: string;
}

// Se carga aparte (React.lazy desde ubicacion.tsx): Leaflet solo se descarga para mostrar el mapa.
// Sin zoom con la rueda, para que el scroll de la página no quede atrapado en el mapa.
export default function MapaUbicacion({ coordenadas, nombre }: MapaUbicacionProps) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contenedor.current) return;
    const centro: L.LatLngTuple = [coordenadas[0], coordenadas[1]];
    const mapa = L.map(contenedor.current, { scrollWheelZoom: false }).setView(centro, ZOOM_DE_CALLE);

    L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(mapa);
    mapa.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const pin = L.divIcon({ className: "", html: '<div class="mapa-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 22] });
    L.marker(centro, { icon: pin, title: nombre, alt: nombre }).addTo(mapa);

    return () => {
      mapa.remove();
    };
  }, [coordenadas, nombre]);

  return (
    <div
      ref={contenedor}
      role="region"
      aria-label={`Mapa: ${nombre}`}
      className="mapa-ubicacion h-[300px] rounded-[3px] border border-publico-borde md:h-[420px]"
    />
  );
}
