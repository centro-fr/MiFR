import { useRef } from "react";
import { MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { animarSeccion } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import { enlacesDeContacto, type EnlacesDeContacto } from "@/features/publico/utils/contacto";
import {
  BOTON_CONTORNO,
  BOTON_DESTACADO,
  CONTENEDOR_PUBLICO,
  ESPACIO_DE_SECCION,
  TEXTO_HUECO,
  TITULO_DE_SECCION,
} from "./estilos-publicos";
import { LineaDeTitulo } from "./linea-de-titulo";

// Llamado a la acción del final: escribir por WhatsApp o ver el Instagram del centro.
// Si no hay ningún contacto configurado, la sección no aparece.
export function Contacto({ enlaces = enlacesDeContacto() }: { enlaces?: EnlacesDeContacto }) {
  const raiz = useRef<HTMLElement>(null);
  const hayContacto = Boolean(enlaces.whatsapp || enlaces.instagram);
  useAnimacion(raiz, animarSeccion, hayContacto);

  if (!hayContacto) return null;

  return (
    <section ref={raiz} id="contacto" aria-labelledby="titulo-contacto" className="border-t border-publico-borde">
      <div className={`${CONTENEDOR_PUBLICO} ${ESPACIO_DE_SECCION}`}>
        <h2 id="titulo-contacto" data-titulo="" className={TITULO_DE_SECCION}>
          <LineaDeTitulo>
            <span className={TEXTO_HUECO}>¿Arrancamos</span>
          </LineaDeTitulo>
          <LineaDeTitulo>esta semana?</LineaDeTitulo>
        </h2>
        <div className="mt-8 flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center">
          {enlaces.whatsapp && (
            <a
              data-aparece=""
              href={enlaces.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON_DESTACADO} h-[52px] px-6`}
            >
              <MessageCircle aria-hidden="true" className="size-[18px]" />
              Escribinos por WhatsApp
            </a>
          )}
          {enlaces.instagram && (
            <a
              data-aparece=""
              href={enlaces.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON_CONTORNO} h-[52px]`}
            >
              <InstagramIcon className="size-[18px]" />
              Seguinos en Instagram
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
