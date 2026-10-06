interface TermsFooterProps {
  onOpenLegal: (type: "terms" | "privacy") => void;
  onContact?: () => void;
  variant?: "desktop" | "mobile";
}

export function TermsFooter({ onOpenLegal, onContact, variant = "desktop" }: TermsFooterProps) {
  if (variant === "mobile") {
    return (
      <footer className="border-t border-slate-100 pt-4 text-center dark:border-white/10">
        <p className="text-sm leading-relaxed text-slate-500">
          Al ingresar aceptás nuestros{" "}
          <FooterLink label="Términos" onClick={() => onOpenLegal("terms")} /> y{" "}
          <FooterLink label="Política de Privacidad" onClick={() => onOpenLegal("privacy")} />.
        </p>
        {onContact && (
          <button
            type="button"
            onClick={onContact}
            className="mt-1 min-h-[44px] text-sm font-semibold text-primary-dark hover:text-primary"
          >
            Contactar administración
          </button>
        )}
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-32 rounded-full bg-slate-300" />
      </footer>
    );
  }

  return (
    <footer className="w-full max-w-[420px] pt-6 text-center text-slate-500">
      <p className="text-sm leading-relaxed">
        Al ingresar aceptás nuestros <FooterLink label="Términos" onClick={() => onOpenLegal("terms")} /> y{" "}
        <FooterLink label="Política de Privacidad" onClick={() => onOpenLegal("privacy")} />.
      </p>
      <p className="mt-1 text-sm">Centro de Entrenamiento FR © 2026 • Todos los derechos reservados</p>
    </footer>
  );
}

function FooterLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] font-semibold text-primary-dark underline decoration-primary-dark/30 hover:text-primary"
    >
      {label}
    </button>
  );
}
