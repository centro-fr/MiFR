import { useEffect, type RefObject } from "react";

interface UseDialogA11yOptions {
  /** El diálogo está abierto y debe gestionar el foco. */
  active: boolean;
  /** Cierre (Escape). */
  onClose: () => void;
  /** Contenedor del diálogo (overlay o panel). */
  dialogRef: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad base para diálogos: Escape para cerrar, foco inicial,
 * trampa de foco con Tab, bloqueo de scroll de fondo y retorno de foco
 * al elemento que abrió el diálogo.
 */
export function useDialogA11y({ active, onClose, dialogRef }: UseDialogA11yOptions) {
  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Foco inicial: elemento marcado o primer foco posible del diálogo.
    const initial =
      dialog?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initial?.focus();

    // Bloqueo de scroll de fondo.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [active, onClose, dialogRef]);
}
