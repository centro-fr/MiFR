import { useState } from 'react';
import { X, Phone, MessageCircle, Mail, MapPin, CheckCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roleInterest: 'socio',
    message: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      roleInterest: 'socio',
      message: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181C26] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-sm shadow-md">
            FR
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Administración MiFR
            </h3>
            <p className="text-xs text-[#E91E82] font-semibold">
              Solicitud de Alta de Socio o Staff
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">¡Solicitud Recibida!</h4>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              El equipo de administración de MiFR se comunicará a tu correo{' '}
              <strong className="text-white">{formData.email || 'registrado'}</strong> en menos de 24 horas para habilitar tu acceso.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 rounded-full bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Cerrar y volver al portal
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-300 mb-6">
              Para ingresar a la plataforma, tu cuenta de Google debe estar vinculada a una membresía activa o registro de staff. Completá tus datos o contactanos directamente:
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Martín Rodríguez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E91E82] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email de Google
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu.cuenta@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E91E82] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+54 9 11 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E91E82] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Acceso Requerido
                </label>
                <select
                  value={formData.roleInterest}
                  onChange={(e) => setFormData({ ...formData, roleInterest: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f2430] border border-white/10 text-sm text-white focus:outline-none focus:border-[#E91E82] transition-colors"
                >
                  <option value="socio">Alumno / Socio Nuevo</option>
                  <option value="profesor">Profesor / Entrenador</option>
                  <option value="staff">Personal Administrativo</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-bold shadow-brand-glow transition-all cursor-pointer"
              >
                Enviar Solicitud de Habilitación
              </button>
            </form>

            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Oficial</span>
              </a>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>+54 11 4567-8900</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
