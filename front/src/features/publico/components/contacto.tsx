import { MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { Button } from "@/components/ui/button";
import { enlacesDeContacto, type EnlacesDeContacto } from "@/features/publico/utils/contacto";

// Llamado a la acción del final de la home: escribir por WhatsApp o ver el Instagram del centro.
// Si no hay ningún contacto configurado, la sección no aparece.
export function Contacto({ enlaces = enlacesDeContacto() }: { enlaces?: EnlacesDeContacto }) {
  if (!enlaces.whatsapp && !enlaces.instagram) return null;

  return (
    <section aria-labelledby="titulo-contacto" className="py-12 lg:py-16">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[#3b0a24] p-8 text-white shadow-brand-glow sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-extrabold uppercase tracking-widest text-pink-100">Tu primera clase te espera</p>
            <h2 id="titulo-contacto" className="mt-1 text-3xl font-black uppercase leading-tight sm:text-4xl">
              ¿Querés sumarte?
            </h2>
            <p className="mt-2 text-base text-pink-50">Escribinos y te contamos los planes y precios.</p>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row">
            {enlaces.whatsapp && (
              <Button asChild className="h-12 rounded-xl bg-white px-6 text-base font-bold text-primary-dark hover:bg-pink-50">
                <a href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  Escribinos por WhatsApp
                </a>
              </Button>
            )}
            {enlaces.instagram && (
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-white/40 bg-transparent px-6 text-base font-bold text-white hover:bg-white/15 hover:text-white"
              >
                <a href={enlaces.instagram} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon />
                  Seguinos en Instagram
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
