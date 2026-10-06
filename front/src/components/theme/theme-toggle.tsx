import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/utils/cn";

interface ThemeToggleProps {
  className?: string;
  compacto?: boolean;
}

/** Botón para alternar entre tema claro y oscuro. Persiste en localStorage. */
export function ThemeToggle({ className, compacto = false }: ThemeToggleProps) {
  const tema = useThemeStore((estado) => estado.tema);
  const alternarTema = useThemeStore((estado) => estado.alternarTema);
  const esOscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-pressed={esOscuro}
      aria-label={esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={cn(
        "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
        "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
        compacto && "min-h-[40px] min-w-[40px] justify-center px-2",
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
}
