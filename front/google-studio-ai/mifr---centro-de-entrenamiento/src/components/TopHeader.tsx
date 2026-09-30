import { ViewMode, DesktopState } from '../types';

interface TopHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  desktopState: DesktopState;
  setDesktopState: (state: DesktopState) => void;
}

export default function TopHeader({
  viewMode,
  setViewMode,
  desktopState,
  setDesktopState,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#181C26]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand badge & Public context indicator */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E91E82] to-[#BC1266] flex items-center justify-center text-white font-black text-xs tracking-tight shadow-md">
              FR
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                MiFR{' '}
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#E91E82] bg-[#E91E82]/15 px-2 py-0.5 rounded-full border border-[#E91E82]/30">
                  Público / Login
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Sin autenticación previa • Acceso único con Google
              </p>
            </div>
          </div>
          <span className="md:hidden text-xs text-[#E91E82] font-semibold bg-[#E91E82]/10 px-2.5 py-1 rounded-lg">
            1440px & 390px
          </span>
        </div>

        {/* View Mode Switcher: All / Desktop 1440px / Mobile 390px */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'all'
                ? 'bg-[#E91E82] text-white shadow font-bold'
                : 'hover:text-white text-slate-300'
            }`}
            onClick={() => setViewMode('all')}
          >
            <span>✨ Ver Todo (Desktop + Mobile)</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'desktop'
                ? 'bg-[#E91E82] text-white shadow font-bold'
                : 'hover:text-white text-slate-300'
            }`}
            onClick={() => setViewMode('desktop')}
          >
            <span>💻 Desktop (1440px)</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'mobile'
                ? 'bg-[#E91E82] text-white shadow font-bold'
                : 'hover:text-white text-slate-300'
            }`}
            onClick={() => setViewMode('mobile')}
          >
            <span>📱 Mobile (390px - 4 Estados)</span>
          </button>
        </div>

        {/* Desktop Global State Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 hidden lg:inline">
            Estado Desktop:
          </span>
          <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                desktopState === 1
                  ? 'bg-[#E91E82] text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setDesktopState(1)}
            >
              1. Normal
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                desktopState === 2
                  ? 'bg-[#E91E82] text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setDesktopState(2)}
            >
              2. Cargando
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                desktopState === 3
                  ? 'bg-[#E91E82] text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setDesktopState(3)}
            >
              3. No Reg.
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                desktopState === 4
                  ? 'bg-[#E91E82] text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setDesktopState(4)}
            >
              4. Error
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
