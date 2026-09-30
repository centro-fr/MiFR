import { cn } from "@/utils/cn";

interface BrandBadgeProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZES = {
  sm: "h-6 w-6 rounded-lg text-[10px]",
  md: "h-10 w-10 rounded-2xl text-base",
  lg: "h-20 w-20 rounded-3xl text-2xl",
} as const;

export function BrandBadge({ size = "md", label = "FR" }: BrandBadgeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center bg-gradient-to-tr from-primary to-primary-dark font-black tracking-tight text-white shadow-lg",
        size === "lg" && "border border-white/30 shadow-xl",
        size === "md" && "border border-white/20",
        SIZES[size],
      )}
    >
      {label}
    </div>
  );
}
