import type { ComponentProps } from "react";
import { useController, type Control, type FieldPathByValue, type FieldValues } from "react-hook-form";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { cn } from "@/utils/cn";

type PropsCampoFechaDelFormulario<T extends FieldValues> = Omit<ComponentProps<typeof CampoFecha>, "value" | "onChange" | "name"> & {
  control: Control<T>;
  name: FieldPathByValue<T, string>;
};

/**
 * CampoFecha conectado a react-hook-form: valor, blur y foco en el primer error. Para que se vea como los
 * demás campos, pasá su clase y md:text-base, porque el Input base achica la letra desde md.
 */
export function CampoFechaDelFormulario<T extends FieldValues>({ control, name, className, ...props }: PropsCampoFechaDelFormulario<T>) {
  const { field } = useController({ control, name });
  // CampoFecha pone el pr-11 del ícono antes de className, y un px-3 de afuera lo pisaría.
  return <CampoFecha {...props} {...field} className={cn(className, "pr-11")} />;
}
