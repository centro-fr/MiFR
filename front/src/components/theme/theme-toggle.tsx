import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/utils/cn";

interface ThemeToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  compacto?: boolean;
}

/** Botón para alternar entre tema claro y oscuro. Persiste en localStorage.
    forwardRef + props spread: lo requieren los `TooltipTrigger asChild` de shadcn. */
export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, compacto = false, ...props }, ref) => {
    const tema = useThemeStore((estado) => estado.tema);
    const alternarTema = useThemeStore((estado) => estado.alternarTema);
    const esOscuro = tema === "oscuro";
    const etiqueta = esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

    return (
      <button
        ref={ref}
        type="button"
        {...props}
        onClick={(evento) => {
          // El tema nuevo se revela desde el centro del botón (ver theme-store).
          const caja = evento.currentTarget.getBoundingClientRect();
          alternarTema({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 });
        }}
        aria-pressed={esOscuro}
        aria-label={etiqueta}
        title={etiqueta}
        className={cn(
          "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
          "text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-white/10",
          compacto && "h-11 min-h-0 w-11 justify-center p-0",
          className,
        )}
      >
        {esOscuro ? (
          <Sun aria-hidden="true" className="h-5 w-5 shrink-0" />
        ) : (
          <Moon aria-hidden="true" className="h-5 w-5 shrink-0" />
        )}
        {!compacto && <span className="flex-1 text-left">{esOscuro ? "Tema claro" : "Tema oscuro"}</span>}
      </button>
    );
  },
);
ThemeToggle.displayName = "ThemeToggle";
