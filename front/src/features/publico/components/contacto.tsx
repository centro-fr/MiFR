import { MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { Button } from "@/components/ui/button";
import { enlacesDeContacto, type EnlacesDeContacto } from "@/features/publico/utils/contacto";

// Llamado a la acción del final de la home: escribir por WhatsApp o ver el Instagram del centro.
// Si no hay ningún contacto configurado, la sección no aparece.
export function Contacto({ enlaces = enlacesDeContacto() }: { enlaces?: EnlacesDeContacto }) {
  if (!enlaces.whatsapp && !enlaces.instagram) return null;

  return (
    <section aria-labelledby="titulo-contacto" className="py-12">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-col gap-5 rounded-3xl bg-dark p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="titulo-contacto" className="text-2xl font-extrabold">
              ¿Querés sumarte?
            </h2>
            <p className="mt-1 text-base text-slate-300">Escribinos y te contamos los planes y precios.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {enlaces.whatsapp && (
              <Button asChild className="h-12 rounded-xl px-6 text-base font-bold shadow-brand-glow hover:bg-primary-dark">
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
                className="h-12 rounded-xl border-white/25 bg-transparent px-6 text-base font-bold text-white hover:bg-white/10 hover:text-white"
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
