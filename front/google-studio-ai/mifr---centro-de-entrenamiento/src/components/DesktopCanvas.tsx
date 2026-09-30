import { DesktopState, RoleInfo } from '../types';
import GoogleIcon from './GoogleIcon';
import { Star, CheckCircle2, RotateCw, AlertTriangle, XCircle, Sparkles } from 'lucide-react';

interface DesktopCanvasProps {
  desktopState: DesktopState;
  setDesktopState: (state: DesktopState) => void;
  onOpenContact: () => void;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
  onOpenRole: (role: RoleInfo) => void;
}

const ROLES_DATA: Record<'alumnos' | 'profesores' | 'admin', RoleInfo> = {
  alumnos: {
    id: 'alumnos',
    title: 'Portal de Alumnos',
    badge: 'Membresías & Clases',
    description: 'Acceso para atletas y socios activos del centro de entrenamiento.',
    features: [
      'Visualización de rutinas diarias personalizadas',
      'Reserva de cupos en clases funcionales y bio-tracking',
      'Histórico de marcas personales (1RM) y bio-impedancia',
      'Check-in automático en recepción',
    ],
  },
  profesores: {
    id: 'profesores',
    title: 'Staff de Entrenadores',
    badge: 'Cuerpo Técnico',
    description: 'Panel exclusivo para profesores y preparadores físicos.',
    features: [
      'Asignación y ajuste de cargas en tiempo real',
      'Pase de lista y control de asistencia a clases grupales',
      'Monitoreo de frecuencia cardíaca de atletas en vivo',
      'Comunicación directa con administración',
    ],
  },
  admin: {
    id: 'admin',
    title: 'Administración Central',
    badge: 'Gestión & Control',
    description: 'Gestión integral de socios, cobros, equipamiento y altas.',
    features: [
      'Alta y baja de usuarios con Google SSO',
      'Gestión de membresías y estados de pago',
      'Auditoría y control de aforo por turnos',
      'Reportes de rendimiento institucional',
    ],
  },
};

export default function DesktopCanvas({
  desktopState,
  setDesktopState,
  onOpenContact,
  onOpenLegal,
  onOpenRole,
}: DesktopCanvasProps) {
  const getStateDescription = () => {
    switch (desktopState) {
      case 1:
        return 'Tu espacio para seguir entrenamientos, clases y tu progreso diario.';
      case 2:
        return 'Verificando credenciales seguras con Google Identity Services...';
      case 3:
        return 'Revisá el estado de tu membresía o contactá al centro.';
      case 4:
        return 'Ocurrió un problema al conectar con el servidor de autenticación.';
      default:
        return '';
    }
  };

  const handleStartGoogleAuth = () => {
    setDesktopState(2);
    // Simulates auth completion or test state
    setTimeout(() => {
      // Keep in loading or switch depending on user preference
    }, 1500);
  };

  return (
    <section id="section-desktop" className="transition-all duration-300">
      {/* Spec header */}
      <div className="max-w-[1440px] mx-auto mb-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E91E82]"></span>
          <span className="text-white font-bold tracking-wide">CANVAS DESKTOP</span>
          <span className="text-slate-500 font-mono">1440px × 900px Viewport Reference</span>
        </div>
        <div className="text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/10">
          Bloque Login: <strong className="text-white">max-w-[420px]</strong> • Botón Google:{' '}
          <strong className="text-white min-h-[48px]">≥48px</strong>
        </div>
      </div>

      {/* 1440px Screen Container */}
      <div className="max-w-[1440px] mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#181C26]">
        <div className="w-full flex flex-col lg:flex-row min-h-[760px]">
          {/* LEFT HERO COLUMN */}
          <div className="relative lg:w-[54%] xl:w-[56%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-[#181C26]">
            {/* Background image & gradient overlays */}
            <div className="absolute inset-0 z-0">
              <img
                src="https://lh3.googleusercontent.com/aida/AEtjO1WWDDVOcNfs93FP4hULr5ZZ8NVT5Wv2Vj35Rf0YXI30V5HeeNaDX8JT80T02f4e0QuGbBSOYmthXB_0pxP_mih9Z8tVsoVvuUkFLfgzDKeFutaq7GSpgDByK8xdssLZi1suKhUFIumKRl2_vtpHFHRroi1JEffJqTxWWd3kZjrTVJaBcxVaCZSbkGGBvoaL4P_YW_DiKAc-0gfI4h5X4Noc0wrNEDDfnb4NsiQj5EdnGw8VTBMVixqSEoJO"
                alt="Centro de entrenamiento de alto rendimiento"
                className="w-full h-full object-cover object-center transform scale-105 filter brightness-[0.88] contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181C26] via-[#181C26]/75 to-transparent mix-blend-multiply"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-[#BC1266]/70 via-[#181C26]/80 to-[#181C26]/90 mix-blend-color-burn"></div>
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E91E82]/35 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
              <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#BC1266]/30 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Minimal Public Header: Logo MiFR + Contexto */}
            <header className="relative z-10 flex items-center justify-between pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E91E82] to-[#BC1266] shadow-lg flex items-center justify-center text-white font-black text-base border border-white/20">
                  FR
                </div>
                <div>
                  <span className="text-white font-extrabold text-lg tracking-tight block leading-tight">
                    MiFR
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#ff7cb9]">
                    ATHLETIC HUB
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Acceso de Socios & Staff
              </span>
            </header>

            {/* Central Statement (44px font title & 18px font subtitle) */}
            <div className="relative z-10 my-auto py-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#E91E82]/50 text-[#ff7cb9] text-xs font-bold tracking-wider uppercase mb-6 shadow-sm">
                <Star className="w-3.5 h-3.5 text-[#E91E82] fill-current" />
                Centro de Alto Rendimiento
              </div>

              <h1 className="text-[34px] sm:text-[42px] lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12] mb-6">
                Tu espacio de <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-[#E91E82] to-pink-300">
                  superación y entrenamiento inteligente.
                </span>
              </h1>

              <p className="text-white/80 text-[18px] leading-relaxed mb-8 max-w-lg font-normal">
                Gestioná tus rutinas, reservá clases y controlá métricas de rendimiento en tiempo real junto a tu cuerpo de entrenadores.
              </p>

              {/* Role Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onOpenRole(ROLES_DATA.alumnos)}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white tracking-wide transition-all cursor-pointer"
                >
                  Alumnos
                </button>
                <span className="text-white/40">•</span>
                <button
                  type="button"
                  onClick={() => onOpenRole(ROLES_DATA.profesores)}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white tracking-wide transition-all cursor-pointer"
                >
                  Profesores
                </button>
                <span className="text-white/40">•</span>
                <button
                  type="button"
                  onClick={() => onOpenRole(ROLES_DATA.admin)}
                  className="px-3.5 py-1.5 rounded-full bg-[#E91E82]/20 hover:bg-[#E91E82]/30 backdrop-blur-sm border border-[#E91E82]/40 text-[#ff7cb9] tracking-wide transition-all cursor-pointer"
                >
                  Administración
                </button>
              </div>
            </div>

            {/* Left Footer Info */}
            <footer className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#E91E82]" />
                <span>Equipamiento de nivel olímpico & bio-tracking</span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">Planes 100% Personalizados</div>
            </footer>
          </div>

          {/* RIGHT AUTH COLUMN: Centered vertically & horizontally, max-w-[420px] */}
          <div className="lg:w-[46%] xl:w-[44%] bg-[#FDFBFC] flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12">
            {/* Top Desktop Subheader / Indicator */}
            <div className="w-full max-w-[420px] flex items-center justify-between pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#181C26]/50">
                Portal de Acceso
              </span>
              <span className="text-[11px] font-semibold text-[#E91E82] bg-[#E91E82]/10 px-2.5 py-0.5 rounded-full border border-[#E91E82]/20">
                SSO Google Identity
              </span>
            </div>

            {/* Strictly 420px Center Block */}
            <div className="w-full max-w-[420px] my-auto flex flex-col justify-center">
              {/* Brand Badge Header */}
              <div className="text-center mb-8 flex flex-col items-center">
                <div className="relative mb-4 group cursor-pointer" onClick={() => setDesktopState(1)}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#E91E82] to-[#BC1266] rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#E91E82] via-[#d81673] to-[#BC1266] shadow-xl flex items-center justify-center text-white text-2xl font-black tracking-tight border border-white/30">
                    MiFR
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181C26] tracking-tight">
                  MiFR
                </h2>
                <p className="text-xs font-bold tracking-widest text-[#E91E82] uppercase mt-1">
                  Gestión del Centro de Entrenamiento
                </p>
                <p className="text-sm text-slate-500 mt-2 max-w-xs transition-opacity duration-200">
                  {getStateDescription()}
                </p>
              </div>

              {/* Dynamic State View Container for Desktop */}
              <div className="w-full min-h-[200px] flex flex-col justify-center">
                {/* DESKTOP STATE 1: Principal / Default */}
                {desktopState === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <button
                      type="button"
                      onClick={handleStartGoogleAuth}
                      className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] text-sm font-semibold rounded-full border border-slate-300 shadow-google hover:shadow-google-hover transition-all duration-200 px-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E91E82]/30"
                    >
                      <GoogleIcon className="w-5 h-5" />
                      <span>Iniciar sesión con Google</span>
                    </button>
                    {/* Exact shortened text >= 14px */}
                    <p className="text-center text-[14px] text-slate-500">
                      Usá tu cuenta de Google
                    </p>
                    <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Servidor conectado con Google Identity Cloud</span>
                    </div>

                    {/* Quick state switcher helper chips */}
                    <div className="pt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                      <span>Probar estados:</span>
                      <button
                        type="button"
                        onClick={() => setDesktopState(2)}
                        className="underline hover:text-[#E91E82] cursor-pointer"
                      >
                        Cargando
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setDesktopState(3)}
                        className="underline hover:text-[#E91E82] cursor-pointer"
                      >
                        No Reg.
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setDesktopState(4)}
                        className="underline hover:text-[#E91E82] cursor-pointer"
                      >
                        Error
                      </button>
                    </div>
                  </div>
                )}

                {/* DESKTOP STATE 2: Loading */}
                {desktopState === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-slate-50 text-slate-600 text-sm font-semibold rounded-full border border-slate-200 shadow-sm cursor-wait px-6">
                      <svg className="animate-spin h-5 w-5 text-[#E91E82]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Iniciando sesión...</span>
                    </div>

                    {/* Loading indicator pill */}
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center gap-2 text-xs text-[#BC1266]">
                      <span className="w-2 h-2 rounded-full bg-[#E91E82] animate-ping"></span>
                      <span className="font-medium">Conectando con Google Identity Services...</span>
                    </div>
                    <p className="text-center text-[14px] text-slate-500">
                      Por favor espere mientras validamos sus credenciales.
                    </p>

                    <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setDesktopState(1)}
                        className="text-[#E91E82] hover:underline cursor-pointer"
                      >
                        Cancelar y volver
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setDesktopState(3)}
                        className="hover:underline cursor-pointer"
                      >
                        Simular cuenta no registrada
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setDesktopState(4)}
                        className="hover:underline cursor-pointer"
                      >
                        Simular fallo
                      </button>
                    </div>
                  </div>
                )}

                {/* DESKTOP STATE 3: Error - Cuenta No Registrada */}
                {desktopState === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Banner: Acceso no habilitado / Tu cuenta no está registrada */}
                    <div className="p-4 rounded-2xl bg-rose-50 border border-[#E91E82]/30 flex items-start gap-3 text-left">
                      <div className="p-1 rounded-lg bg-rose-100 text-[#BC1266] shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-[#BC1266]">Acceso no habilitado</p>
                        <p className="text-rose-900/80 mt-0.5 leading-relaxed">
                          Tu cuenta no está registrada como socio o staff activo. Contactá al centro para solicitar el alta.
                        </p>
                      </div>
                    </div>

                    {/* Action Button: "Volver a intentar" */}
                    <button
                      type="button"
                      onClick={() => setDesktopState(1)}
                      className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#1f1f1f] text-sm font-semibold rounded-full border border-slate-300 shadow-google hover:shadow-google-hover transition-all duration-200 px-6 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4 text-[#BC1266]" />
                      <span>Volver a intentar</span>
                    </button>

                    <div className="pt-2 text-center">
                      <span className="text-xs text-slate-500">¿Sos alumno o profe nuevo?</span>
                      <button
                        type="button"
                        onClick={onOpenContact}
                        className="ml-1 inline-flex items-center text-xs font-bold text-[#E91E82] hover:text-[#BC1266] underline decoration-[#E91E82]/40 cursor-pointer"
                      >
                        Contactar administración MiFR
                      </button>
                    </div>
                  </div>
                )}

                {/* DESKTOP STATE 4: Error - Fallo Conexión */}
                {desktopState === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-left">
                      <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-amber-900">Fallo de conexión</p>
                        <p className="text-amber-800/80 mt-0.5 leading-relaxed">
                          No pudimos completar el inicio de sesión. Por favor reintentá en unos momentos.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDesktopState(2)}
                      className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#1f1f1f] text-sm font-semibold rounded-full border border-slate-300 shadow-google hover:shadow-google-hover transition-all duration-200 px-6 cursor-pointer"
                    >
                      <GoogleIcon className="w-5 h-5" />
                      <span>Reintentar con Google</span>
                    </button>

                    <p className="text-center text-[13px] text-slate-500">
                      Verificá tu conexión a internet o bloqueadores de ventanas emergentes.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Strict 420px Desktop Footer with terms & privacy links >=12px */}
            <footer className="w-full max-w-[420px] pt-6 text-center text-slate-400">
              <p className="text-[12px] leading-relaxed">
                Al ingresar aceptás nuestros{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="text-[#BC1266] hover:text-[#E91E82] font-semibold underline decoration-[#BC1266]/30 cursor-pointer"
                >
                  Términos
                </button>{' '}
                y{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-[#BC1266] hover:text-[#E91E82] font-semibold underline decoration-[#BC1266]/30 cursor-pointer"
                >
                  Política de Privacidad
                </button>
                .
              </p>
              <p className="mt-1 text-[11px] text-slate-400 font-mono">
                Centro de Entrenamiento FR © 2025 • Todos los derechos reservados
              </p>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
}
