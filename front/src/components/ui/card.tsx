import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "w-full max-w-[420px] rounded-3xl bg-white p-8 text-slate-900 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.08)] sm:p-10",
        className,
      )}
      {...props}
    />
  );
}
