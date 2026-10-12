import { Sparkles } from "lucide-react";

// Lugar reservado para los datos públicos que el back todavía no expone (planes, precios y la
// promoción vigente de US-32). No se muestra nada inventado: solo el aviso.
export function Proximamente() {
  return (
    <section aria-labelledby="titulo-proximamente" className="py-12">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-dark p-6 text-white sm:flex-row sm:items-center sm:gap-5 sm:p-8">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h2 id="titulo-proximamente" className="text-xl font-extrabold">
              Planes, precios y promociones
            </h2>
            <p className="mt-1 text-base text-slate-300">Muy pronto vas a poder consultarlos desde acá.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
