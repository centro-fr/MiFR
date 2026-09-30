import { X, ShieldCheck } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181C26] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white max-h-[85vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#E91E82]/20 text-[#E91E82] border border-[#E91E82]/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {type === 'terms' ? 'Términos y Condiciones de Uso' : 'Política de Privacidad y Datos'}
            </h3>
            <p className="text-xs text-slate-400">
              Centro de Entrenamiento MiFR • Athletic Hub
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 pr-2 border-t border-white/10 pt-4">
          {type === 'terms' ? (
            <>
              <p>
                <strong>1. Acceso y Registro:</strong> El acceso a la plataforma MiFR está restringido a socios con membresía vigente, profesores designados y personal administrativo debidamente acreditado.
              </p>
              <p>
                <strong>2. Uso de Identidad Única Google:</strong> La plataforma utiliza exclusivamente Google Identity Services (SSO) para garantizar la seguridad criptográfica de las sesiones y prescindir del almacenamiento de contraseñas locales.
              </p>
              <p>
                <strong>3. Reserva de Clases y Bloques de Entrenamiento:</strong> Las reservas de turnos o equipamiento bio-tracking deben realizarse con hasta 24 horas de antelación y cancelarse con al menos 2 horas de anticipación.
              </p>
              <p>
                <strong>4. Normas de Convivencia:</strong> El uso de equipamiento olímpico requiere calzado adecuado y toalla obligatoria. El incumplimiento podrá resultar en la baja temporal del usuario en el sistema.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>1. Protección de Datos Personales:</strong> En MiFR resguardamos tu información personal bajo estrictas medidas de encriptación y los estándares de seguridad ISO/IEC 27001.
              </p>
              <p>
                <strong>2. Datos Recabados:</strong> Al autenticarte con tu cuenta de Google, únicamente solicitamos acceso a tu nombre, dirección de correo electrónico y fotografía de perfil para propósitos de identificación dentro del centro.
              </p>
              <p>
                <strong>3. Métricas y Bio-Tracking:</strong> Los registros de fuerza, frecuencia cardíaca, cargas y repeticiones son de uso exclusivo personal y de tu entrenador asignado. Jamás se comercializan ni comparten con terceros.
              </p>
              <p>
                <strong>4. Derechos ARCO:</strong> Podés solicitar la exportación o eliminación de tu historial de entrenamiento enviando un correo a privacidad@mifr.com.
              </p>
            </>
          )}
        </div>

        <div className="pt-5 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#E91E82] hover:bg-[#BC1266] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
