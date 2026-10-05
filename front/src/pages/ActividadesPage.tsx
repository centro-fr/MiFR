import React, { useState } from 'react';
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

export const ActividadesPage: React.FC = () => {
  const [actividades, setActividades] = useState<Actividad[]>(ACTIVIDADES_INICIALES);
  const [menuOpen, setMenuOpen] = useState(false);
  
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
    }
    setIsFormOpen(false);
  };

  const onConfirmarBaja = () => {
    if (actividadDarBaja) {
       setActividades(prev => prev.map(a => a.id === actividadDarBaja.id ? { ...a, activa: false } : a));
       setIsDeleteOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-slate-200 p-4 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-xs">
              FR
            </div>
            <div>
              <div className="font-extrabold text-xs text-[#181C26]">MiFR Centro</div>
              <div className="text-[9px] font-bold text-[#E91E82] uppercase tracking-wider">
                Propietaria
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-1 text-xs font-semibold text-slate-600">
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Dashboard</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Alumnos</a>
            <a href="#" className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FDF2F7] text-[#E91E82] font-bold">
              <span>Actividades y Horarios</span>
              <span className="w-1.5 h-3.5 bg-[#E91E82] rounded-full" />
            </a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Planes y Precios</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Pagos y Cuotas</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Asistencia</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Honorarios</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Notificaciones</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Reportes</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100">Configuración</a>
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
              MR
            </div>
            <div className="text-[11px] font-bold text-slate-800 leading-tight">Mariana FR</div>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Propietaria</span>
        </div>
      </aside>

      {/* MENÚ MOBILE */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col">
            <div className="h-[60px] px-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-[11px]">
                  FR
                </div>
                <div className="leading-none">
                  <div className="font-extrabold text-[12px] text-[#181C26]">MiFR Centro</div>
                  <div className="text-[8px] font-bold text-[#E91E82] uppercase tracking-wide mt-0.5">
                    Propietaria
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 text-lg"
              >
                ×
              </button>
            </div>

            <nav className="p-3 space-y-1 text-sm font-semibold text-slate-600">
              {['Dashboard', 'Alumnos'].map((item) => (
                <a
                  key={item}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                  className="flex items-center px-3 py-3 rounded-lg hover:bg-slate-100"
                >
                  {item}
                </a>
              ))}

              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                className="flex items-center justify-between px-3 py-3 rounded-lg bg-[#FDF2F7] text-[#E91E82] font-bold"
              >
                <span>Actividades y Horarios</span>
                <span className="w-1.5 h-3.5 bg-[#E91E82] rounded-full" />
              </a>

              {['Planes y Precios', 'Pagos y Cuotas', 'Asistencia', 'Honorarios', 'Notificaciones', 'Reportes', 'Configuración'].map((item) => (
                <a
                  key={item}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                  className="flex items-center px-3 py-3 rounded-lg hover:bg-slate-100"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="mt-auto p-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                  MR
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Mariana FR</div>
                  <div className="text-[10px] text-slate-400">Propietaria</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* CONTENIDO */}
      <main className="flex-1 min-w-0 min-h-screen bg-slate-50">
        {/* HEADER DESKTOP */}
        <div className="hidden md:flex h-14 bg-white border-b border-slate-200 px-6 items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">
            <span>MiFR Centro</span>
            <span className="mx-1">/</span>
            <span className="text-slate-900 font-bold">Actividades</span>
          </div>

          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sistema en línea
          </span>
        </div>

        {/* HEADER MOBILE — inspirado en el Stitch */}
        <header className="md:hidden h-[60px] bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-lg"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          <div className="flex items-center gap-2.5 mr-auto ml-2">
            <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-[11px]">
              FR
            </div>
            <div className="leading-none">
              <div className="font-extrabold text-[12px] text-[#181C26]">MiFR Centro</div>
              <div className="text-[8px] font-bold text-[#E91E82] uppercase tracking-wide mt-0.5">
                Propietaria
              </div>
            </div>
          </div>

          <button
            onClick={handleNueva}
            type="button"
            className="bg-[#E91E82] hover:bg-[#BC1266] text-white text-[11px] font-extrabold px-3 py-2 rounded-lg shadow-sm active:scale-95 transition-transform"
          >
            + Nueva
          </button>
        </header>

        <div className="px-4 py-5 md:p-8 max-w-[1180px] mx-auto">
          {/* CABECERA */}
          <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] md:text-2xl font-black text-[#181C26] tracking-tight">
                  Actividades
                </h1>
                <span className="text-[10px] md:text-xs font-extrabold px-2.5 py-1 rounded-full bg-pink-100 text-[#BC1266] border border-pink-200">
                  {actividades.length} activas
                </span>
              </div>
              <p className="hidden md:block text-sm text-slate-600 mt-1">
                Administrá las disciplinas y cupos del centro. Habilitadas para diagramar horarios y reservas.
              </p>
            </div>

            {/* En desktop se conserva el botón grande */}
            <button
              onClick={handleNueva}
              type="button"
              className="hidden md:flex bg-[#E91E82] hover:bg-[#BC1266] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-[#E91E82]/30 items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              + Nueva actividad
            </button>
          </div>

          {/* MOBILE: CARDS */}
          <div className="md:hidden space-y-3 pb-8">
            {(['HIBRIDA', 'GRUPAL', 'INDIVIDUAL'] as const).map((grupo) => {
              const items = agrupar(grupo);
              if (!items.length) return null;

              return (
                <React.Fragment key={grupo}>
                  {grupo === 'INDIVIDUAL' && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <span className="h-px flex-1 bg-amber-200" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                        Personalizadas
                      </span>
                      <span className="h-px flex-1 bg-amber-200" />
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
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6 w-[45%]">Nombre y Descripción de la Actividad</th>
                    <th className="py-4 px-4 w-[20%]">Tipo / Modalidad</th>
                    <th className="py-4 px-4 w-[15%]">Cupo Máximo</th>
                    <th className="py-4 px-4 w-[10%]">Estado</th>
                    <th className="py-4 px-6 text-right w-[10%]">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-medium">
                  {agrupar('HIBRIDA').length > 0 && (
                    <>
                      <tr className="bg-pink-50/70 border-y border-pink-100 font-bold text-[#BC1266]">
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
                      <tr className="bg-blue-50/70 border-y border-blue-100 font-bold text-blue-800">
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
                      <tr className="bg-amber-50/80 border-y border-amber-200 font-bold text-amber-900">
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

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium gap-2">
              <div>
                Mostrando <strong>{actividades.length} actividades solicitadas</strong> en catálogo activo
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                Baja lógica protegida
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALES */}
      {isFormOpen && (
        <ModalFormActividad
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
    pink: 'bg-[#FDF2F7] text-[#BC1266] border-[#F9A8D4]',
    blue: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  };

  return (
    <article
      className={`bg-white border rounded-xl p-3.5 shadow-sm ${
        colorBadge === 'amber' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex px-2 py-1 rounded-md border text-[9px] font-extrabold leading-none ${badgeClasses[colorBadge]}`}
          >
            {act.tipoBadge}
          </span>

          <h2 className="text-[15px] font-black text-[#181C26] mt-2 leading-tight">
            {act.nombre}
          </h2>
        </div>

        {act.activa ? (
          <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full text-[9px] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Activa
          </span>
        ) : (
          <span className="shrink-0 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full text-[9px] font-extrabold">
            Inactiva
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-600 mt-2 leading-relaxed line-clamp-3">
        {act.descripcion}
      </p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">
            Cupo
          </div>
          <div className="text-[11px] text-slate-800 font-extrabold mt-0.5">
            {act.cupo}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onEditar}
            type="button"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[10px] bg-white active:bg-slate-50"
          >
            Editar
          </button>
          <button
            onClick={onBaja}
            type="button"
            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 font-bold text-[10px] bg-white active:bg-rose-50"
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
    pink: 'bg-[#FDF2F7] text-[#BC1266] border-[#F9A8D4]',
    blue: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
  };

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isRowAmber ? 'bg-amber-50/20' : ''}`}>
      <td className="py-4 px-6 align-top">
        <div className="font-black text-sm text-[#181C26]">{act.nombre}</div>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">{act.descripcion}</p>
      </td>
      <td className="py-4 px-4 align-top">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClasses[colorBadge]}`}>
          {act.tipoBadge}
        </span>
      </td>
      <td className="py-4 px-4 align-top">
        <div className={`font-extrabold px-2.5 py-1 rounded border inline-block text-xs ${isRowAmber ? 'bg-amber-100/90 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-900 border-slate-200'}`}>
          {act.cupo}
        </div>
      </td>
      <td className="py-4 px-4 align-top">
        {act.activa ? (
          <span className="bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] border inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activa
          </span>
        ) : (
           <span className="bg-slate-100 text-slate-500 border-slate-200 border inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold">Inactiva</span>
        )}
      </td>
      <td className="py-4 px-6 text-right align-top">
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={onEditar} className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#E91E82] text-slate-700 hover:text-[#E91E82] font-bold text-xs bg-white transition-colors">Editar</button>
          <button onClick={onBaja} className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs bg-white transition-colors">Dar de baja</button>
        </div>
      </td>
    </tr>
  );
};