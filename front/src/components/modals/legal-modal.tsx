import { ShieldCheck, X } from "lucide-react";
import { useEscapeToClose, type LegalModalType } from "@/features/auth/schemas/contact";

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  useEscapeToClose(onClose, type !== null);
  if (!type) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-white/15 bg-dark p-6 text-white shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-xl border border-primary/30 bg-primary/20 p-2.5 text-primary">
            <ShieldCheck aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h3 id="legal-title" className="text-lg font-bold tracking-tight text-white">
              {type === "terms" ? "Términos y Condiciones de Uso" : "Política de Privacidad y Datos"}
            </h3>
            <p className="text-xs text-slate-400">Centro de Entrenamiento MiFR • Athletic Hub</p>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto border-t border-white/10 pr-2 pt-4 text-xs leading-relaxed text-slate-300">
          {type === "terms" ? (
            <>
              <p>
                <strong>1. Acceso y Registro:</strong> el acceso a la plataforma MiFR está restringido a usuarios con
                cuenta de Google habilitada por la administración del centro.
              </p>
              <p>
                <strong>2. Identidad única Google:</strong> la plataforma utiliza exclusivamente Google Identity
                Services (SSO); no se almacenan contraseñas locales.
              </p>
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Texto legal completo pendiente de definición por la administración del centro.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>1. Protección de Datos Personales:</strong> MiFR resguarda tu información personal y solo
                utiliza los datos provistos por Google (nombre, correo y foto de perfil) para identificarte dentro del
                centro.
              </p>
              <p>
                <strong>2. Uso de datos:</strong> tus datos no se comparten con terceros ni se utilizan con fines
                distintos a la gestión del centro.
              </p>
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Texto legal completo pendiente de definición por la administración del centro.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-primary px-5 py-2 text-xs font-bold text-white transition-all hover:bg-primary-dark"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
