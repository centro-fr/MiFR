import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import {
  BOTON_MODAL,
  BOTON_MODAL_PRINCIPAL,
  CABECERA_MODAL,
  CONTENIDO_MODAL,
  DESCRIPCION_MODAL,
  PIE_MODAL,
  TITULO_MODAL,
} from "./estilos-modal";

// Estructura común de los modales de formulario y de detalle: misma cabecera (título y subtítulo),
// mismo cuerpo con scroll, mismo pie con línea arriba y los mismos botones. Así todos se ven iguales
// y un cambio de estilo se hace en un solo lugar.
//
//   <Dialog>
//     <ModalContenido>
//       <ModalCabecera titulo="…" descripcion="…" />
//       <ModalCuerpo>…<ModalSeccion titulo="Detalle cobro">…</ModalSeccion></ModalCuerpo>
//       <ModalPie><BotonModalSecundario>Cancelar</BotonModalSecundario><BotonModalPrincipal>…</BotonModalPrincipal></ModalPie>
//     </ModalContenido>
//   </Dialog>
//
// En un formulario, ModalFormulario envuelve el cuerpo y el pie: así el pie queda fijo abajo y el
// botón principal sigue siendo el envío del form.

const ANCHOS = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl" } as const;

type PropsContenido = ComponentPropsWithoutRef<typeof DialogContent> & { ancho?: keyof typeof ANCHOS };

// La cruz de cierre la dibuja ModalCabecera, alineada con el título.
export function ModalContenido({ ancho = "lg", className, children, ...props }: PropsContenido) {
  return (
    <DialogContent
      hideClose
      className={cn(CONTENIDO_MODAL, ANCHOS[ancho], className)}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export function ModalFormulario({ className, ...props }: ComponentPropsWithoutRef<"form">) {
  return <form noValidate className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />;
}

interface PropsCabecera {
  titulo: ReactNode;
  descripcion?: ReactNode;
  /** Va a la izquierda del título, por ejemplo el logo en un comprobante. */
  icono?: ReactNode;
  /** Nombre de la cruz para el lector de pantalla; distinto del botón "Cerrar" del pie si lo hay. */
  etiquetaCerrar?: string;
}

export function ModalCabecera({ titulo, descripcion, icono, etiquetaCerrar = "Cerrar ventana" }: PropsCabecera) {
  return (
    <DialogHeader className={cn(CABECERA_MODAL, "flex flex-row items-start justify-between gap-3 pr-6")}>
      <div className="flex min-w-0 items-center gap-3">
        {icono}
        <div className="min-w-0 space-y-0.5">
          <DialogTitle className={TITULO_MODAL}>{titulo}</DialogTitle>
          {descripcion ? (
            <DialogDescription className={DESCRIPCION_MODAL}>{descripcion}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{titulo}</DialogDescription>
          )}
        </div>
      </div>
      <DialogClose
        aria-label={etiquetaCerrar}
        className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-primary pointer-fine:size-9 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <X aria-hidden="true" className="size-5" />
      </DialogClose>
    </DialogHeader>
  );
}

export function ModalCuerpo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5", className)}>{children}</div>;
}

/** Un bloque del cuerpo con su título: "Detalle cobro", "Alumnos a cargo"… */
export function ModalSeccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{titulo}</h3>
      {children}
    </section>
  );
}

export function ModalPie({ children }: { children: ReactNode }) {
  return (
    <div className={PIE_MODAL}>{children}</div>
  );
}

type PropsBoton = ComponentPropsWithoutRef<typeof Button>;

export function BotonModalSecundario({ className, type = "button", ...props }: PropsBoton) {
  return <Button type={type} variant="outline" className={cn(BOTON_MODAL, className)} {...props} />;
}

export function BotonModalPrincipal({ className, type = "button", ...props }: PropsBoton) {
  return (
    <Button type={type} className={cn(BOTON_MODAL_PRINCIPAL, className)} {...props} />
  );
}
