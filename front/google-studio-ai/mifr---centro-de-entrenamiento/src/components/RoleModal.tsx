import { X, Users, Dumbbell, ShieldAlert, Check } from 'lucide-react';
import { RoleInfo } from '../types';

interface RoleModalProps {
  role: RoleInfo | null;
  onClose: () => void;
}

export default function RoleModal({ role, onClose }: RoleModalProps) {
  if (!role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#181C26] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl text-white">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-[#E91E82]/20 text-[#ff7cb9] border border-[#E91E82]/30">
            {role.id === 'alumnos' && <Users className="w-6 h-6" />}
            {role.id === 'profesores' && <Dumbbell className="w-6 h-6" />}
            {role.id === 'admin' && <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E91E82] bg-[#E91E82]/15 px-2 py-0.5 rounded-full border border-[#E91E82]/30">
              {role.badge}
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">
              {role.title}
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          {role.description}
        </p>

        <div className="space-y-2 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Funcionalidades asignadas:
          </p>
          {role.features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/5 p-2.5 rounded-xl border border-white/5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-[#E91E82] hover:bg-[#BC1266] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
