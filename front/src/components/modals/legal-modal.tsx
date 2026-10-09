import { ShieldCheck, X } from "lucide-react";
import type { LegalModalType } from "@/features/auth/schemas/contact";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  return (
    <Dialog
      open={type !== null}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-white/15 bg-dark p-6 text-white shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white [&_svg]:size-5"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </Button>

        <div className="mb-4 flex items-center gap-3 pr-12">
          <span className="rounded-xl border border-primary/30 bg-primary/20 p-2.5 text-primary">
            <ShieldCheck aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <DialogTitle className="text-lg font-bold tracking-tight text-white">
              {type === "terms" ? "Términos y Condiciones de Uso" : "Política de Privacidad y Datos"}
            </DialogTitle>
            <p className="text-sm text-slate-400">Centro de Entrenamiento MiFR • Athletic Hub</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-white/10 pb-5 pr-2 pt-4 text-sm leading-relaxed text-slate-300">
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
              <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10 p-3">
                <AlertDescription className="text-sm text-amber-200">
                  Texto legal completo pendiente de definición por la administración del centro.
                </AlertDescription>
              </Alert>
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
              <Alert className="rounded-xl border-amber-500/30 bg-amber-500/10 p-3">
                <AlertDescription className="text-sm text-amber-200">
                  Texto legal completo pendiente de definición por la administración del centro.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-white/10 pt-5">
          <Button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
