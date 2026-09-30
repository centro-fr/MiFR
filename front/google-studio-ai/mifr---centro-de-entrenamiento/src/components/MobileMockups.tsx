import { useState } from 'react';
import GoogleIcon from './GoogleIcon';
import { RotateCw, XCircle, AlertTriangle } from 'lucide-react';

interface MobileMockupsProps {
  onOpenContact: () => void;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
}

export default function MobileMockups({ onOpenContact, onOpenLegal }: MobileMockupsProps) {
  // Mobile Card 1 interactive state simulation
  const [mobile1Loading, setMobile1Loading] = useState(false);

  const handleMobile1Click = () => {
    setMobile1Loading(true);
    setTimeout(() => {
      setMobile1Loading(false);
    }, 2000);
  };

  return (
    <section id="section-mobile" className="transition-all duration-300">
      {/* Header spec info */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-10">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E91E82]"></span>
            <h3 className="text-white font-bold tracking-wide text-base">
              FORMATO MOBILE (390px Width Mockups)
            </h3>
            <span className="text-xs text-[#E91E82] bg-[#E91E82]/10 px-2 py-0.5 rounded-full font-bold">
              4 Estados
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Padding lateral 20–24px (px-5/px-6) • Espaciado generoso logo/botón 48–64px • Botón altura ≥52px • Textos ≥14px • Términos ≥12px
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 0 Sidebar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 0 Bottom Nav
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Sin Auth Previa
          </span>
        </div>
      </div>

      {/* 4 Mobile Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-7xl mx-auto justify-items-center">
        {/* ==================== MOBILE CARD 1: ESTADO 1 (PRINCIPAL) ==================== */}
        <div className="w-full max-w-[390px] flex flex-col">
          <div className="flex items-center justify-between px-3 mb-2 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Estado 1: Principal
            </span>
            <span className="text-[11px] font-mono text-slate-400">390 × 844px</span>
          </div>

          {/* Phone Shell Container */}
          <div className="w-full bg-[#FDFBFC] rounded-[42px] border-[8px] border-[#1f2430] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative">
            {/* Phone Island / Speaker Notch */}
            <div className="w-full pt-3 pb-1 flex justify-center bg-transparent z-20">
              <div className="w-28 h-4 bg-[#181C26] rounded-full flex items-center justify-end px-3">
                <span className="w-2 h-2 rounded-full bg-[#2c3444]"></span>
              </div>
            </div>

            {/* Minimal Public Header Mobile */}
            <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-[10px]">
                  FR
                </div>
                <span className="font-extrabold text-[#181C26] text-sm">MiFR</span>
              </div>
              <span className="text-[10px] font-bold text-[#E91E82] uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-md">
                Acceso
              </span>
            </div>

            {/* Mobile Content Body */}
            <div className="px-6 flex-1 flex flex-col justify-between py-6">
              {/* Marca y Logo Central */}
              <div className="pt-6 text-center flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-[#E91E82] rounded-3xl blur-lg opacity-40"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#E91E82] via-[#d81673] to-[#BC1266] shadow-xl flex items-center justify-center text-white text-2xl font-black tracking-tight border border-white/30">
                    MiFR
                  </div>
                </div>
                <h4 className="text-2xl font-black text-[#181C26] tracking-tight">MiFR</h4>
                <p className="text-[11px] font-extrabold tracking-widest text-[#E91E82] uppercase mt-1">
                  Centro de Entrenamiento
                </p>
                <p className="text-sm text-slate-500 mt-2.5 max-w-[280px] leading-relaxed">
                  Tu espacio para seguir entrenamientos, clases y tu progreso diario.
                </p>
              </div>

              {/* Generous Spacing to Google Button (48px to 64px gap) */}
              <div className="my-auto py-6 space-y-4">
                {/* Google Button: Mobile min-h-[52px] h-[52px] */}
                <button
                  type="button"
                  onClick={handleMobile1Click}
                  className="w-full min-h-[52px] h-[52px] flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] text-[15px] font-semibold rounded-full border border-slate-300 shadow-google transition-all px-5 cursor-pointer"
                >
                  {mobile1Loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-[#E91E82]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-5 h-5 shrink-0" />
                      <span>Iniciar sesión con Google</span>
                    </>
                  )}
                </button>

                {/* Help text: Exactly >= 14px */}
                <p className="text-center text-[14px] text-slate-500">
                  {mobile1Loading ? 'Conectando con Google...' : 'Usá tu cuenta de Google'}
                </p>
                <div className="pt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Conexión segura SSL</span>
                </div>
              </div>

              {/* Footer Links >= 12px */}
              <footer className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[12px] text-slate-500 leading-tight">
                  Al ingresar aceptás nuestros{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Términos
                  </button>{' '}
                  y{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
                <div className="mt-4 w-32 h-1 bg-slate-300 rounded-full mx-auto"></div>
              </footer>
            </div>
          </div>
        </div>

        {/* ==================== MOBILE CARD 2: ESTADO 2 (CARGANDO) ==================== */}
        <div className="w-full max-w-[390px] flex flex-col">
          <div className="flex items-center justify-between px-3 mb-2 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Estado 2: Cargando
            </span>
            <span className="text-[11px] font-mono text-slate-400">390 × 844px</span>
          </div>

          <div className="w-full bg-[#FDFBFC] rounded-[42px] border-[8px] border-[#1f2430] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative">
            {/* Notch */}
            <div className="w-full pt-3 pb-1 flex justify-center bg-transparent z-20">
              <div className="w-28 h-4 bg-[#181C26] rounded-full flex items-center justify-end px-3">
                <span className="w-2 h-2 rounded-full bg-[#2c3444]"></span>
              </div>
            </div>

            {/* Minimal Public Header */}
            <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-[10px]">
                  FR
                </div>
                <span className="font-extrabold text-[#181C26] text-sm">MiFR</span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                Validando
              </span>
            </div>

            {/* Content */}
            <div className="px-6 flex-1 flex flex-col justify-between py-6">
              <div className="pt-6 text-center flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-[#E91E82] rounded-3xl blur-lg opacity-40"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#E91E82] via-[#d81673] to-[#BC1266] shadow-xl flex items-center justify-center text-white text-2xl font-black tracking-tight border border-white/30">
                    MiFR
                  </div>
                </div>
                <h4 className="text-2xl font-black text-[#181C26] tracking-tight">MiFR</h4>
                <p className="text-[11px] font-extrabold tracking-widest text-[#E91E82] uppercase mt-1">
                  Centro de Entrenamiento
                </p>
                <p className="text-sm text-slate-500 mt-2.5 max-w-[280px] leading-relaxed">
                  Verificando credenciales seguras con Google Identity Services...
                </p>
              </div>

              {/* Disabled Button with Animated Spinner (min-h-[52px]) */}
              <div className="my-auto py-6 space-y-4">
                <div className="w-full min-h-[52px] h-[52px] flex items-center justify-center gap-3 bg-slate-100 text-slate-600 text-[15px] font-semibold rounded-full border border-slate-200 shadow-sm cursor-wait px-5">
                  <svg className="animate-spin h-5 w-5 text-[#E91E82]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Iniciando sesión...</span>
                </div>

                {/* Animated loading indicator pill */}
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center gap-2 text-xs text-[#BC1266]">
                  <span className="w-2 h-2 rounded-full bg-[#E91E82] animate-ping"></span>
                  <span className="font-medium">Autenticando usuario...</span>
                </div>
                <p className="text-center text-[14px] text-slate-400">
                  Por favor espere unos segundos...
                </p>
              </div>

              {/* Footer Links >= 12px */}
              <footer className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[12px] text-slate-500 leading-tight">
                  Al ingresar aceptás nuestros{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Términos
                  </button>{' '}
                  y{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
                <div className="mt-4 w-32 h-1 bg-slate-300 rounded-full mx-auto"></div>
              </footer>
            </div>
          </div>
        </div>

        {/* ==================== MOBILE CARD 3: ESTADO 3 (ERROR - NO REGISTRADA) ==================== */}
        <div className="w-full max-w-[390px] flex flex-col">
          <div className="flex items-center justify-between px-3 mb-2 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Estado 3: No Registrada
            </span>
            <span className="text-[11px] font-mono text-slate-400">390 × 844px</span>
          </div>

          <div className="w-full bg-[#FDFBFC] rounded-[42px] border-[8px] border-[#1f2430] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative">
            {/* Notch */}
            <div className="w-full pt-3 pb-1 flex justify-center bg-transparent z-20">
              <div className="w-28 h-4 bg-[#181C26] rounded-full flex items-center justify-end px-3">
                <span className="w-2 h-2 rounded-full bg-[#2c3444]"></span>
              </div>
            </div>

            {/* Minimal Public Header */}
            <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-[10px]">
                  FR
                </div>
                <span className="font-extrabold text-[#181C26] text-sm">MiFR</span>
              </div>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-md">
                Sin Acceso
              </span>
            </div>

            {/* Content with Error Banner & "Volver a intentar" */}
            <div className="px-6 flex-1 flex flex-col justify-between py-6">
              <div className="pt-6 text-center flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-rose-400 rounded-3xl blur-lg opacity-30"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#E91E82] via-[#d81673] to-[#BC1266] shadow-xl flex items-center justify-center text-white text-2xl font-black tracking-tight border border-white/30">
                    MiFR
                  </div>
                </div>
                <h4 className="text-2xl font-black text-[#181C26] tracking-tight">MiFR</h4>
                <p className="text-[11px] font-extrabold tracking-widest text-[#E91E82] uppercase mt-1">
                  Centro de Entrenamiento
                </p>
              </div>

              {/* Error 3 Middle Area */}
              <div className="my-auto py-4 space-y-4">
                {/* Banner per spec */}
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-[#E91E82]/30 text-left flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-rose-100 text-[#BC1266] shrink-0 mt-0.5">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#BC1266]">Acceso no habilitado</h5>
                    <p className="text-[12px] text-rose-900/80 mt-0.5 leading-snug">
                      Tu cuenta no está registrada como socio o staff activo. Contactá al centro para solicitar el alta.
                    </p>
                  </div>
                </div>

                {/* Button: "Volver a intentar" (min-h-[52px]) */}
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="w-full min-h-[52px] h-[52px] flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-[#1f1f1f] text-[15px] font-semibold rounded-full border border-slate-300 shadow-google transition-all px-5 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-[#BC1266]" />
                  <span>Volver a intentar</span>
                </button>

                <div className="pt-2 text-center">
                  <span className="text-xs text-slate-500">¿Sos nuevo en el centro?</span>
                  <button
                    type="button"
                    onClick={onOpenContact}
                    className="block w-full mt-1 text-[13px] font-bold text-[#E91E82] hover:text-[#BC1266] underline decoration-[#E91E82]/40 cursor-pointer"
                  >
                    Contactar administración MiFR
                  </button>
                </div>
              </div>

              {/* Footer Links >= 12px */}
              <footer className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[12px] text-slate-500 leading-tight">
                  Al ingresar aceptás nuestros{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Términos
                  </button>{' '}
                  y{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
                <div className="mt-4 w-32 h-1 bg-slate-300 rounded-full mx-auto"></div>
              </footer>
            </div>
          </div>
        </div>

        {/* ==================== MOBILE CARD 4: ESTADO 4 (ERROR - CONEXIÓN) ==================== */}
        <div className="w-full max-w-[390px] flex flex-col">
          <div className="flex items-center justify-between px-3 mb-2 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Estado 4: Error Autenticación
            </span>
            <span className="text-[11px] font-mono text-slate-400">390 × 844px</span>
          </div>

          <div className="w-full bg-[#FDFBFC] rounded-[42px] border-[8px] border-[#1f2430] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative">
            {/* Notch */}
            <div className="w-full pt-3 pb-1 flex justify-center bg-transparent z-20">
              <div className="w-28 h-4 bg-[#181C26] rounded-full flex items-center justify-end px-3">
                <span className="w-2 h-2 rounded-full bg-[#2c3444]"></span>
              </div>
            </div>

            {/* Minimal Public Header */}
            <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-[10px]">
                  FR
                </div>
                <span className="font-extrabold text-[#181C26] text-sm">MiFR</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md">
                Error
              </span>
            </div>

            {/* Content with Connection Error & "Reintentar con Google" */}
            <div className="px-6 flex-1 flex flex-col justify-between py-6">
              <div className="pt-6 text-center flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-amber-400 rounded-3xl blur-lg opacity-25"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#E91E82] via-[#d81673] to-[#BC1266] shadow-xl flex items-center justify-center text-white text-2xl font-black tracking-tight border border-white/30">
                    MiFR
                  </div>
                </div>
                <h4 className="text-2xl font-black text-[#181C26] tracking-tight">MiFR</h4>
                <p className="text-[11px] font-extrabold tracking-widest text-[#E91E82] uppercase mt-1">
                  Centro de Entrenamiento
                </p>
              </div>

              {/* Error 4 Middle Area */}
              <div className="my-auto py-4 space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">Fallo de conexión</h5>
                    <p className="text-[12px] text-amber-800/80 mt-0.5 leading-snug">
                      No pudimos completar el inicio de sesión. Por favor reintentá en unos momentos.
                    </p>
                  </div>
                </div>

                {/* Button: "Reintentar con Google" (min-h-[52px]) */}
                <button
                  type="button"
                  onClick={() => alert('Reintentando autenticación con Google Identity Services...')}
                  className="w-full min-h-[52px] h-[52px] flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#1f1f1f] text-[15px] font-semibold rounded-full border border-slate-300 shadow-google transition-all px-5 cursor-pointer"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Reintentar con Google</span>
                </button>

                <p className="text-center text-[13px] text-slate-500 leading-tight px-1">
                  Verificá tu conexión a internet o deshabilitá bloqueadores emergentes.
                </p>
              </div>

              {/* Footer Links >= 12px */}
              <footer className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[12px] text-slate-500 leading-tight">
                  Al ingresar aceptás nuestros{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Términos
                  </button>{' '}
                  y{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="text-[#BC1266] font-semibold underline cursor-pointer"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
                <div className="mt-4 w-32 h-1 bg-slate-300 rounded-full mx-auto"></div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
