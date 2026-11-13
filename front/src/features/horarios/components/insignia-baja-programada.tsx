/** Horario con la baja programada (US-04): sigue hasta que sale el último alumno y no admite nuevos. */
export function InsigniaBajaProgramada({ compacta = false }: { compacta?: boolean }) {
  return (
    <span
      title="No admite alumnos nuevos: se da de baja cuando sale el último"
      className={
        compacta
          ? "inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-1.5 text-[10px] font-bold whitespace-nowrap text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
          : "inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800 shadow-2xs dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
      }
    >
      Baja programada
    </span>
  );
}
