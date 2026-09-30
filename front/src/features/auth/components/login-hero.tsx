import { CheckCircle2, Star } from "lucide-react";
import { BrandBadge } from "@/features/auth/components/brand-badge";

const ROLE_PILLS = ["Alumnos", "Profesora", "Propietaria"] as const;

export function LoginHero() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-dark p-8 sm:p-12 lg:w-[54%] lg:p-16 xl:w-[56%]">
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-dark/70 via-dark/80 to-dark/90" />
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse-glow rounded-full bg-primary/35 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-primary-dark/30 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <BrandBadge size="md" />
          <div>
            <span className="block text-lg font-extrabold leading-tight tracking-tight text-white">MiFR</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff7cb9]">Athletic Hub</span>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md sm:inline-flex">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Acceso de Socios &amp; Staff
        </span>
      </header>

      <div className="relative z-10 my-auto max-w-xl py-10">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff7cb9] shadow-sm backdrop-blur-md">
          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current text-primary" />
          Centro de Alto Rendimiento
        </p>
        <h1 className="mb-6 text-[34px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[42px] lg:text-[44px]">
          Tu espacio de <br />
          <span className="bg-gradient-to-r from-rose-200 via-primary to-pink-300 bg-clip-text text-transparent">
            superación y entrenamiento inteligente.
          </span>
        </h1>
        <p className="mb-8 max-w-lg text-[18px] font-normal leading-relaxed text-white/80">
          Gestioná tus rutinas, reservá clases y controlá métricas de rendimiento en tiempo real junto a tu cuerpo de
          entrenadores.
        </p>
        <ul aria-label="Roles con acceso" className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
          {ROLE_PILLS.map((role, index) => (
            <li key={role} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-white/40">
                  •
                </span>
              )}
              <span
                className={
                  role === "Propietaria"
                    ? "rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1.5 tracking-wide text-[#ff7cb9] backdrop-blur-sm"
                    : "rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 tracking-wide text-white backdrop-blur-sm"
                }
              >
                {role}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="relative z-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" />
          Equipamiento de nivel olímpico &amp; bio-tracking
        </p>
        <p className="font-mono text-[11px]">Planes 100% Personalizados</p>
      </footer>
    </div>
  );
}
