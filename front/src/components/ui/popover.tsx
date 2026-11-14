import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/utils/cn";

// Versión fijada en 1.2.0: comparte con @radix-ui/react-dialog las capas internas (dismissable-layer,
// focus-scope, portal). Con versiones distintas, un clic dentro del popover abierto en un modal
// cuenta como "afuera" del modal y lo cierra. Actualizar los dos juntos.
const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

// Se dibuja en un portal: así ningún contenedor con overflow (modales, listas con scroll) lo recorta,
// y Radix lo da vuelta hacia arriba o lo corre si no entra en la pantalla.
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, collisionPadding = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        "z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
