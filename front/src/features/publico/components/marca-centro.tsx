import { cn } from "@/utils/cn";

export const NOMBRE_DEL_CENTRO = "FR Centro de Entrenamiento";

// El logo ya lleva el fondo oscuro de la marca: se ve igual en tema claro y oscuro.
export function LogoCentro({ className }: { className?: string }) {
  return (
    <img
      src="/logo-fr.webp"
      alt=""
      width={256}
      height={256}
      decoding="async"
      className={cn("size-10 shrink-0 rounded-xl", className)}
    />
  );
}
