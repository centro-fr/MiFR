interface Props {
  id: string;
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  deshabilitada?: boolean;
}

// planes.solo_menores del DER: el back no admite en el plan a quien ya cumplió 18 al inscribirse o cambiar de plan.
export function CasillaSoloMenores({ id, marcada, onCambiar, deshabilitada }: Props) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 has-disabled:cursor-not-allowed has-disabled:opacity-60 dark:border-white/15 dark:bg-white/5"
    >
      <input
        type="checkbox"
        id={id}
        checked={marcada}
        disabled={deshabilitada}
        onChange={(evento) => onCambiar(evento.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Solo para menores de 18 años</span>
        <span className="text-xs text-muted-foreground">Al inscribir o cambiar de plan, no admite a quien ya cumplió 18.</span>
      </span>
    </label>
  );
}
