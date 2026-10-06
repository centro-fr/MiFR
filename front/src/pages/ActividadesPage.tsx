import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../components/theme/theme-toggle';
import { toast } from 'react-toastify';
import { useAuth } from '../features/auth/hooks/use-auth';
import type { Actividad } from '../types/actividad';
import { ModalFormActividad } from '../components/modals/ModalFormActividad';
import { ModalBajaLogica } from '../components/modals/ModalBajaLogica';

const ACTIVIDADES_INICIALES: Actividad[] = [
  { id: '1', nombre: 'Reto 3M', descripcion: 'Es un programa grupal estructurado, pero al estar orientado al seguimiento progresivo de objetivos, requiere una atención personalizada para evaluar los avances de cada persona a lo largo de los tres meses.', tipoBadge: 'Grupal / Personalizada', cupo: '15 alumnos', grupo: 'HIBRIDA', activa: true, turnosPendientes: 6, alumnosInscriptos: 15 },
  { id: '2', nombre: 'Entrenamiento', descripcion: 'Esta opción es flexible. Su descripción aclara que se dicta en modalidad grupal o personalizada según el horario, por lo que cumple con ambas condiciones pero por separado (deberás elegir el horario que se adapte a lo que buscás).', tipoBadge: 'Grupal o Personalizada', cupo: 'Según horario', grupo: 'HIBRIDA', activa: true, turnosPendientes: 12, alumnosInscriptos: 34 },
  { id: '3', nombre: 'Funcional', descripcion: 'Rutinas generales para todos los asistentes sin seguimiento individualizado de objetivos.', tipoBadge: 'Grupal', cupo: '25 alumnos', grupo: 'GRUPAL', activa: true, turnosPendientes: 18, alumnosInscriptos: 52 },
  { id: '4', nombre: 'HIIT', descripcion: 'Entrenamiento en intervalos de alta intensidad, dinámicas grupales generales.', tipoBadge: 'Grupal', cupo: '20 alumnos', grupo: 'GRUPAL', activa: true, turnosPendientes: 10, alumnosInscriptos: 28 },
  { id: '5', nombre: 'GAP', descripcion: 'Clase grupal enfocada en glúteos, abdomen y piernas para todos los niveles.', tipoBadge: 'Grupal', cupo: '20 alumnos', grupo: 'GRUPAL', activa: true, turnosPendientes: 8, alumnosInscriptos: 24 },
  { id: '6', nombre: 'Clase infantil', descripcion: 'Actividades físicas lúdicas y formativas dictadas en grupo para niños.', tipoBadge: 'Grupal', cupo: '15 alumnos', grupo: 'GRUPAL', activa: true, turnosPendientes: 6, alumnosInscriptos: 14 },
  { id: '7', nombre: 'Posing', descripcion: 'Al ser una técnica de posado para fisicoculturismo, suele ser una práctica individual o muy específica que no entra en la categoría de entrenamiento físico grupal tradicional.', tipoBadge: 'Personalizada / Específica', cupo: '1 alumno (Estricto)', grupo: 'INDIVIDUAL', activa: true, turnosPendientes: 4, alumnosInscriptos: 3 },
];

// Ítems del menú lateral con sus rutas reales. Las secciones sin
// funcionalidad implementada apuntan a la pantalla "En construcción".
const ITEMS_NAV_ACTIVIDADES = [
  { etiqueta: 'Dashboard', to: '/app/dashboard' },
  { etiqueta: 'Alumnos', to: '/app/alumnos' },
  { etiqueta: 'Actividades y Horarios', to: '/app/actividades' },
  { etiqueta: 'Planes y Precios', to: '/app/planes' },
  { etiqueta: 'Cobros y Cuotas', to: '/app/pagos' },
  { etiqueta: 'Asistencia', to: '/app/asistencia' },
  { etiqueta: 'Honorarios', to: '/app/honorarios' },
  { etiqueta: 'Notificaciones', to: '/app/notificaciones' },
  { etiqueta: 'Reportes', to: '/app/reportes' },
  { etiqueta: 'Configuración', to: '/app/seguridad/permisos' },
];

const SECCION_ACTIVA = 'Actividades y Horarios';

export const ActividadesPage: React.FC = () => {
  const [actividades, setActividades] = useState<Actividad[]>(ACTIVIDADES_INICIALES);
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  }, [logout, navigate]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actividadEditar, setActividadEditar] = useState<Actividad | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actividadDarBaja, setActividadDarBaja] = useState<Actividad | null>(null);

  const agrupar = (grupo: string) => actividades.filter(a => a.grupo === grupo);

  const handleNueva = () => {
    setActividadEditar(null);
    setIsFormOpen(true);
  };

  const handleEditar = (act: Actividad) => {
    setActividadEditar(act);
    setIsFormOpen(true);
  };

  const handleBaja = (act: Actividad) => {
    setActividadDarBaja(act);
    setIsDeleteOpen(true);
  };

  const onGuardarForm = (data: Partial<Actividad>) => {
    if (actividadEditar) {
      setActividades(prev => prev.map(a => a.id === actividadEditar.id ? { ...a, ...data } as Actividad : a));
      toast.info(`Actividad "${data.nombre ?? actividadEditar.nombre}" actualizada correctamente`);
    } else {
      const nueva: Actividad = {
        id: Date.now().toString(),
        nombre: data.nombre || 'Nueva Actividad',
        descripcion: data.descripcion || '',
        tipoBadge: data.grupo === 'INDIVIDUAL' ? 'Personalizada / Específica' : data.grupo === 'HIBRIDA' ? 'Grupal / Personalizada' : 'Grupal',
        cupo: data.cupo || '20 alumnos',
        grupo: data.grupo || 'GRUPAL',
        activa: true,
        turnosPendientes: 0,
        alumnosInscriptos: 0,
      };
      setActividades(prev => [...prev, nueva]);
      toast.success(`Actividad "${nueva.nombre}" creada correctamente`);
    }
    setIsFormOpen(false);
  };

  const onConfirmarBaja = () => {
    if (actividadDarBaja) {
       setActividades(prev => prev.filter(a => a.id !== actividadDarBaja.id));
       setIsDeleteOpen(false);
       toast.error(`Actividad "${actividadDarBaja.nombre}" dada de baja`);
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-800 dark:text-slate-100 font-sans dark:bg-canvas dark:text-slate-200">
      {/* SIDEBAR DESKTOP — fijo, solo el nav interno scrollea */}
      <aside className="hidden lg:flex w-60 shrink-0 h-dvh sticky top-0 bg-white border-r border-slate-200 p-4 flex-col overflow-hidden dark:bg-surface-low dark:border-white/10">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 shrink-0 dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-xs">
              FR
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#181C26] dark:text-white">MiFR Centro</div>
              <div className="text-sm font-bold text-[#BC1266] uppercase tracking-wider dark:text-pink-300">
                Propietaria
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-1 text-sm font-semibold text-slate-600 flex-1 min-h-0 overflow-y-auto pr-1 dark:text-slate-300">
            {ITEMS_NAV_ACTIVIDADES.map((item) =>
              item.etiqueta === SECCION_ACTIVA ? (
                <span
                  key={item.etiqueta}
                  aria-current="page"
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FDF2F7] text-[#E91E82] font-bold dark:bg-primary/20 dark:text-pink-300"
                >
                  <span>{item.etiqueta}</span>
                  <span className="w-1.5 h-3.5 bg-[#E91E82] rounded-full" />
                </span>
              ) : (
                <Link
                  key={item.etiqueta}
                  to={item.to}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {item.etiqueta}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-100 shrink-0 bg-white dark:border-white/10 dark:bg-surface-low">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                MR
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Mariana FR</div>
            </div>
            <span className="text-sm text-slate-500 font-semibold dark:text-slate-400">Propietaria</span>
          </div>
          <ThemeToggle className="mt-2 w-full px-2 text-sm" />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-2 flex cursor-pointer items-center gap-1.5 min-h-[44px] text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors dark:text-slate-400 dark:hover:text-pink-300"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MENÚ MOBILE */}
      {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/40 cursor-default"
          />

          <aside id="menu-actividades" className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col overflow-hidden dark:bg-surface-low">
            <div className="h-[60px] px-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-[11px]">
                  FR
                </div>
                <div className="leading-none">
                  <div className="font-extrabold text-sm text-[#181C26] dark:text-white">MiFR Centro</div>
                  <div className="text-sm font-bold text-[#BC1266] uppercase tracking-wide mt-0.5 dark:text-pink-300">
                    Propietaria
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="h-11 w-11 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Navegación principal" className="p-3 space-y-1 text-sm font-semibold text-slate-600 flex-1 min-h-0 overflow-y-auto dark:text-slate-300">
              {ITEMS_NAV_ACTIVIDADES.map((item) =>
                item.etiqueta === SECCION_ACTIVA ? (
                  <span
                    key={item.etiqueta}
                    aria-current="page"
                    className="flex items-center justify-between px-3 py-3 rounded-lg bg-[#FDF2F7] text-[#E91E82] font-bold dark:bg-primary/20 dark:text-pink-300"
                  >
                    <span>{item.etiqueta}</span>
                    <span className="w-1.5 h-3.5 bg-[#E91E82] rounded-full" />
                  </span>
                ) : (
                  <Link
                    key={item.etiqueta}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-3 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {item.etiqueta}
                  </Link>
                ),
              )}
            </nav>

            <div className="mt-auto p-4 border-t border-slate-100 shrink-0 bg-white dark:border-white/10 dark:bg-surface-low">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                  MR
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Mariana FR</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Propietaria</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors dark:text-slate-400 dark:hover:text-pink-300"
              >
                <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* CONTENIDO — única zona con scroll */}
      <main className="flex-1 min-w-0 h-dvh overflow-y-auto bg-slate-50 dark:bg-canvas">
        {/* HEADER DESKTOP */}
        <div className="hidden md:flex h-14 bg-white border-b border-slate-200 px-6 items-center justify-between sticky top-0 z-10 dark:bg-surface-low dark:border-white/10">
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>MiFR Centro</span>
            <span className="mx-1">/</span>
            <span className="text-slate-900 font-bold dark:text-white">Actividades</span>
          </div>
        </div>

        {/* HEADER MOBILE — inspirado en el Stitch */}
        <header className="md:hidden h-[60px] bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20 dark:bg-surface-low dark:border-white/10">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="menu-actividades"
            onClick={() => setMenuOpen(true)}
            className="h-11 w-11 flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-lg dark:text-slate-300 dark:active:bg-white/10"
          >
            <Menu aria-hidden="true" className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2.5 mr-auto ml-2">
            <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-[11px]">
              FR
            </div>
            <div className="leading-none">
              <div className="font-extrabold text-sm text-[#181C26] dark:text-white">MiFR Centro</div>
              <div className="text-sm font-bold text-[#BC1266] uppercase tracking-wide mt-0.5 dark:text-pink-300">
                Propietaria
              </div>
            </div>
          </div>

          <button
            onClick={handleNueva}
            type="button"
            className="bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-extrabold min-h-[44px] px-4 rounded-lg shadow-sm active:scale-95 transition-transform"
          >
            + Nueva
          </button>
        </header>

        <div className="px-4 py-5 md:p-8 max-w-[1180px] mx-auto">
          {/* CABECERA */}
          <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] md:text-2xl font-black text-[#181C26] dark:text-white tracking-tight">
                  Actividades
                </h1>
                <span className="text-sm font-extrabold px-2.5 py-1 rounded-full bg-pink-100 text-[#BC1266] border border-pink-200 dark:bg-primary/20 dark:text-pink-300 dark:border-primary/40">
                  {actividades.length} activas
                </span>
              </div>
              <p className="hidden md:block text-sm text-slate-600 mt-1 dark:text-slate-400">
                Administrá las disciplinas y cupos del centro. Habilitadas para diagramar horarios y reservas.
              </p>
            </div>

            {/* En desktop se conserva el botón grande */}
            <button
              onClick={handleNueva}
              type="button"
              className="hidden md:flex bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-extrabold min-h-[44px] px-5 rounded-xl shadow-lg shadow-[#E91E82]/30 items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              + Nueva actividad
            </button>
          </div>

          {actividades.length === 0 ? (
            <EmptyActividades onNuevo={handleNueva} />
          ) : (
            <>
          {/* MOBILE: CARDS */}
          <div className="md:hidden space-y-3 pb-8">
            {(['HIBRIDA', 'GRUPAL', 'INDIVIDUAL'] as const).map((grupo) => {
              const items = agrupar(grupo);
              if (!items.length) return null;

              return (
                <React.Fragment key={grupo}>
                  {grupo === 'INDIVIDUAL' && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <span className="h-px flex-1 bg-amber-200 dark:bg-amber-500/30" />
                      <span className="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Personalizadas
                      </span>
                      <span className="h-px flex-1 bg-amber-200 dark:bg-amber-500/30" />
                    </div>
                  )}

                  {items.map((act) => (
                    <ActividadCard
                      key={act.id}
                      act={act}
                      colorBadge={
                        grupo === 'HIBRIDA'
                          ? 'pink'
                          : grupo === 'GRUPAL'
                            ? 'blue'
                            : 'amber'
                      }
                      onEditar={() => handleEditar(act)}
                      onBaja={() => handleBaja(act)}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>

          {/* DESKTOP: TABLA */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden dark:bg-surface-low dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 dark:text-slate-100 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:bg-white/5 dark:text-slate-200 dark:border-white/10">
                    <th className="py-4 px-6 w-[45%]">Nombre y Descripción de la Actividad</th>
                    <th className="py-4 px-4 w-[20%]">Tipo / Modalidad</th>
                    <th className="py-4 px-4 w-[15%]">Cupo Máximo</th>
                    <th className="py-4 px-4 w-[10%]">Estado</th>
                    <th className="py-4 px-6 text-right w-[10%]">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
                  {agrupar('HIBRIDA').length > 0 && (
                    <>
                      <tr className="bg-pink-50/70 border-y border-pink-100 font-bold text-[#BC1266] dark:bg-pink-500/10 dark:border-pink-500/20 dark:text-pink-300">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👥 1. Actividades Grupales y Personalizadas ({agrupar('HIBRIDA').length})
                        </td>
                      </tr>
                      {agrupar('HIBRIDA').map(act => (
                        <FilaActividad
                          key={act.id}
                          act={act}
                          colorBadge="pink"
                          onEditar={() => handleEditar(act)}
                          onBaja={() => handleBaja(act)}
                        />
                      ))}
                    </>
                  )}

                  {agrupar('GRUPAL').length > 0 && (
                    <>
                      <tr className="bg-blue-50/70 border-y border-blue-100 font-bold text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👥 2. Actividades Únicamente Grupales (Clases tradicionales) ({agrupar('GRUPAL').length})
                        </td>
                      </tr>
                      {agrupar('GRUPAL').map(act => (
                        <FilaActividad
                          key={act.id}
                          act={act}
                          colorBadge="blue"
                          onEditar={() => handleEditar(act)}
                          onBaja={() => handleBaja(act)}
                        />
                      ))}
                    </>
                  )}

                  {agrupar('INDIVIDUAL').length > 0 && (
                    <>
                      <tr className="bg-amber-50/80 border-y border-amber-200 font-bold text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👤 3. Actividades Individuales o Específicas ({agrupar('INDIVIDUAL').length})
                        </td>
                      </tr>
                      {agrupar('INDIVIDUAL').map(act => (
                        <FilaActividad
                          key={act.id}
                          act={act}
                          colorBadge="amber"
                          isRowAmber
                          onEditar={() => handleEditar(act)}
                          onBaja={() => handleBaja(act)}
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600 font-medium gap-2 dark:bg-white/5 dark:border-white/10 dark:text-slate-400">
              <div>
                Mostrando <strong>{actividades.length} actividades solicitadas</strong> en catálogo activo
              </div>
              <div className="text-sm text-slate-500 font-semibold dark:text-slate-400">
                Baja lógica protegida
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </main>

      {/* MODALES */}
      {isFormOpen && (
        <ModalFormActividad
          key={actividadEditar?.id ?? "nueva"}
          actividad={actividadEditar}
          onClose={() => setIsFormOpen(false)}
          onSave={onGuardarForm}
        />
      )}

      {isDeleteOpen && actividadDarBaja && (
        <ModalBajaLogica
          actividad={actividadDarBaja}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={onConfirmarBaja}
        />
      )}
    </div>
  );
}


// --- ESTADO VACÍO ---
const EmptyActividades = ({ onNuevo }: { onNuevo: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-[#BC1266] dark:bg-pink-500/15 dark:text-pink-300"
      >
        <CalendarPlus className="h-8 w-8" />
      </span>
      <h2 className="text-xl font-extrabold tracking-tight text-[#181C26] dark:text-white">
        Todavía no hay actividades
      </h2>
      <p className="max-w-[320px] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Creá la primera disciplina del centro para empezar a diagramar horarios y reservas.
      </p>
      <button
        type="button"
        onClick={onNuevo}
        className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#E91E82] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E91E82]/30 transition-transform hover:bg-[#BC1266] active:scale-95"
      >
        + Nueva actividad
      </button>
    </div>
  );
};


// --- SUB-COMPONENTE MOBILE ---
const ActividadCard = ({
  act,
  colorBadge,
  onEditar,
  onBaja,
}: {
  act: Actividad;
  colorBadge: 'pink' | 'blue' | 'amber';
  onEditar: () => void;
  onBaja: () => void;
}) => {
  const badgeClasses = {
    pink: 'bg-[#FDF2F7] text-[#BC1266] border-[#F9A8D4] dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
    blue: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  };

  return (
    <article
      className={`bg-white border rounded-xl p-3.5 shadow-sm dark:bg-surface-low ${
        colorBadge === 'amber'
          ? 'border-amber-200 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5'
          : 'border-slate-200 dark:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex px-2 py-1 rounded-md border text-sm font-extrabold leading-none ${badgeClasses[colorBadge]}`}
          >
            {act.tipoBadge}
          </span>

          <h2 className="text-base font-black text-[#181C26] dark:text-white mt-2 leading-tight">
            {act.nombre}
          </h2>
        </div>

        {act.activa ? (
          <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full text-sm font-extrabold flex items-center gap-1 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Activa
          </span>
        ) : (
          <span className="shrink-0 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full text-sm font-extrabold dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
            Inactiva
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3 dark:text-slate-400">
        {act.descripcion}
      </p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/10">
        <div>
          <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide dark:text-slate-400">
            Cupo
          </div>
          <div className="text-sm text-slate-800 dark:text-slate-100 font-extrabold mt-0.5">
            {act.cupo}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onEditar}
            type="button"
            className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm bg-white cursor-pointer active:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:active:bg-white/10"
          >
            Editar
          </button>
          <button
            onClick={onBaja}
            type="button"
            className="min-h-[44px] px-3 rounded-lg border border-rose-200 text-rose-600 font-bold text-sm bg-white cursor-pointer hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 active:bg-rose-100 transition-colors dark:bg-transparent dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/15 dark:active:bg-rose-500/25"
          >
            Baja
          </button>
        </div>
      </div>
    </article>
  );
};

// --- SUB-COMPONENTE DE FILA ---
const FilaActividad = ({ act, colorBadge, isRowAmber, onEditar, onBaja }: { act: Actividad, colorBadge: 'pink' | 'blue' | 'amber', isRowAmber?: boolean, onEditar: () => void, onBaja: () => void }) => {
  const badgeClasses = {
    pink: 'bg-[#FDF2F7] text-[#BC1266] border-[#F9A8D4] dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
    blue: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  };

  return (
    <tr
      className={`transition-colors ${
        isRowAmber
          ? 'bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-500/5 dark:hover:bg-amber-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-white/5'
      }`}
    >
      <td className="py-4 px-6 align-top">
        <div className="font-black text-sm text-[#181C26] dark:text-white">{act.nombre}</div>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl dark:text-slate-400">{act.descripcion}</p>
      </td>
      <td className="py-4 px-4 align-top">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClasses[colorBadge]}`}>
          {act.tipoBadge}
        </span>
      </td>
      <td className="py-4 px-4 align-top">
        <div className={`font-extrabold px-2.5 py-1 rounded border inline-block text-xs ${isRowAmber ? 'bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30' : 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10'}`}>
          {act.cupo}
        </div>
      </td>
      <td className="py-4 px-4 align-top">
        {act.activa ? (
          <span className="bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] border inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activa
          </span>
        ) : (
           <span className="bg-slate-100 text-slate-500 border-slate-200 border inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold dark:bg-white/10 dark:text-slate-300 dark:border-white/10">Inactiva</span>
        )}
      </td>
      <td className="py-4 px-6 text-right align-top">
        <div className="flex flex-nowrap items-center justify-end gap-1.5">
          <button onClick={onEditar} className="inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#E91E82] text-slate-700 dark:text-slate-200 hover:text-[#E91E82] font-bold text-xs bg-white transition-colors dark:border-white/15 dark:bg-transparent dark:text-slate-200">Editar</button>
          <button onClick={onBaja} className="inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-600 hover:border-rose-600 hover:text-white hover:shadow-md active:bg-rose-700 font-bold text-xs bg-white transition-colors dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300">Dar de baja</button>
        </div>
      </td>
    </tr>
  );
};