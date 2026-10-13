import { cn } from "@/utils/cn";

// El ícono de FR (public/logo-fr.webp): la R gris sobre el rosa de la marca, con las esquinas
// redondeadas ya en la imagen. Es decorativo: el nombre del centro siempre va escrito al lado o en
// el título, así que no lleva texto alternativo.
export function LogoFr({ className }: { className?: string }) {
  return (
    <img
      src="/logo-fr.webp"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      decoding="async"
      draggable={false}
      className={cn("size-10 shrink-0 select-none", className)}
    />
  );
}
