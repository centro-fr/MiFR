import { InstagramIcon } from "@/components/icons/instagram-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { enlacesDeContacto, type EnlacesDeContacto } from "@/features/publico/utils/contacto";
import { BOTON_CONTORNO, BOTON_DESTACADO } from "./estilos-publicos";

// Llamado a la acción del final de la home: escribir por WhatsApp o ver el Instagram del centro.
// Si no hay ningún contacto configurado, la sección no aparece.
export function Contacto({ enlaces = enlacesDeContacto() }: { enlaces?: EnlacesDeContacto }) {
  if (!enlaces.whatsapp && !enlaces.instagram) return null;

  return (
    <section id="contacto" aria-labelledby="titulo-contacto" className="bg-publico-niebla px-4 pb-16 md:px-6 md:pb-24">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#e91e82_0%,#bc1266_55%,#5c0a33_100%)] px-5 py-11 text-white md:rounded-[32px] md:px-[72px] md:py-[88px]">
        <div
          aria-hidden="true"
          className="absolute -inset-1/2 bg-[repeating-linear-gradient(-62deg,transparent_0_60px,rgba(255,255,255,0.06)_60px_68px)]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-[60px] -right-[30px] -skew-x-12 font-display text-[220px] leading-[220px] text-white/8 md:-bottom-[110px] md:text-[360px] md:leading-[360px]"
        >
          FR
        </div>
        <div className="relative max-w-[760px]">
          <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#ffd1e8]">
            Tu primera clase te espera
          </p>
          <h2
            id="titulo-contacto"
            className="m-0 font-display text-[46px] font-normal uppercase leading-[46px] md:text-[80px] md:leading-[78px] lg:text-[104px] lg:leading-[98px]"
          >
            ¿Arrancamos
            <br />
            esta semana?
          </h2>
          <p className="mb-8 mt-5 text-lg leading-7 text-[#ffe3f1]">
            Escribinos y te contamos planes, precios y horarios con lugar.
          </p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {enlaces.whatsapp && (
              <a
                href={enlaces.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOTON_DESTACADO} h-[58px] bg-white text-[#8f0d4d] shadow-[0_10px_24px_rgba(0,0,0,0.2)]`}
              >
                <WhatsAppIcon className="size-5" />
                Escribinos por WhatsApp
              </a>
            )}
            {enlaces.instagram && (
              <a
                href={enlaces.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOTON_CONTORNO} h-[58px] border-white/50 hover:bg-white/10`}
              >
                <InstagramIcon />
                Seguinos en Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
