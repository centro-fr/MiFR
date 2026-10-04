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
    <div className="flex bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      {/* SIDEBAR OFICIAL PROPIETARIA (10 ÍTEMS) */}
      <aside className="w-60 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 hidden lg:flex">
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#E91E82] text-white flex items-center justify-center font-black text-xs">FR</div>
            <div>
              <div className="font-extrabold text-xs text-[#181C26]">MiFR Centro</div>
              <div className="text-[9px] font-bold text-[#E91E82] uppercase tracking-wider">Propietaria</div>
            </div>
          </div>
          
          <nav className="mt-4 space-y-1 text-xs font-semibold text-slate-600">
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Dashboard</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Alumnos</a>
            
            {/* Activo */}
            <a href="#" className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FDF2F7] text-[#E91E82] font-bold">
              <span>Actividades y Horarios</span>
              <span className="w-1.5 h-3.5 bg-[#E91E82] rounded-full"></span>
            </a>

            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Planes y Precios</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Pagos y Cuotas</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Asistencia</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Honorarios</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Notificaciones</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Reportes</a>
            <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600">Configuración</a>
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">MR</div>
            <div className="text-[11px] font-bold text-slate-800 leading-tight">Mariana FR</div>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Propietaria</span>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 h-screen overflow-y-auto">
        
        {/* TOP HEADER */}
        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-500">
            <span>MiFR Centro</span> <span className="mx-1">/</span> <span className="text-slate-900 font-bold">Actividades</span>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sistema en línea
          </span>
        </div>

        {/* CABECERA Y ACCIÓN */}
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-[#181C26] tracking-tight">Actividades</h2>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-pink-100 text-[#BC1266] border border-pink-200">
                  {actividades.length} disciplinas oficiales
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Administrá las disciplinas y cupos del centro. Habilitadas para diagramar horarios y reservas.
              </p>
            </div>

            <button onClick={handleNueva} className="bg-[#E91E82] hover:bg-[#BC1266] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-[#E91E82]/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 w-full md:w-auto justify-center">
              + Nueva actividad
            </button>
          </div>

          {/* TABLA PRINCIPAL DE ALTA LEGIBILIDAD */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
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

                  {/* GRUPO 1: HÍBRIDAS / GRUPALES Y PERSONALIZADAS */}
                  {agrupar('HIBRIDA').length > 0 && (
                    <>
                      <tr className="bg-pink-50/70 border-y border-pink-100 font-bold text-[#BC1266]">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👥 1. Actividades Grupales y Personalizadas ({agrupar('HIBRIDA').length})
                        </td>
                      </tr>
                      {agrupar('HIBRIDA').map(act => (
                        <FilaActividad key={act.id} act={act} colorBadge="pink" onEditar={() => handleEditar(act)} onBaja={() => handleBaja(act)} />
                      ))}
                    </>
                  )}

                  {/* GRUPO 2: ÚNICAMENTE GRUPALES */}
                  {agrupar('GRUPAL').length > 0 && (
                    <>
                      <tr className="bg-blue-50/70 border-y border-blue-100 font-bold text-blue-800">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👥 2. Actividades Únicamente Grupales (Clases tradicionales) ({agrupar('GRUPAL').length})
                        </td>
                      </tr>
                      {agrupar('GRUPAL').map(act => (
                        <FilaActividad key={act.id} act={act} colorBadge="blue" onEditar={() => handleEditar(act)} onBaja={() => handleBaja(act)} />
                      ))}
                    </>
                  )}

                  {/* GRUPO 3: INDIVIDUALES O ESPECÍFICAS */}
                  {agrupar('INDIVIDUAL').length > 0 && (
                    <>
                      <tr className="bg-amber-50/80 border-y border-amber-200 font-bold text-amber-900">
                        <td colSpan={5} className="py-2.5 px-6 text-[11px] uppercase tracking-wider">
                          👤 3. Actividades Individuales o Específicas ({agrupar('INDIVIDUAL').length})
                        </td>
                      </tr>
                      {agrupar('INDIVIDUAL').map(act => (
                        <FilaActividad key={act.id} act={act} colorBadge="amber" isRowAmber onEditar={() => handleEditar(act)} onBaja={() => handleBaja(act)} />
                      ))}
                    </>
                  )}

                </tbody>
              </table>
            </div>

            {/* FOOTER TABLA */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 font-medium gap-2">
              <div>Mostrando <strong>{actividades.length} actividades solicitadas</strong> en catálogo activo</div>
              <div className="text-[11px] text-slate-500 font-semibold">Baja lógica protegida (los registros pasados preservan facturación y asistencia)</div>
            </div>
          </div>

        </div>
      </main>

      {/* MODALES */}
      {isFormOpen && <ModalFormActividad actividad={actividadEditar} onClose={() => setIsFormOpen(false)} onSave={onGuardarForm} />}
      {isDeleteOpen && actividadDarBaja && <ModalBajaLogica actividad={actividadDarBaja} onClose={() => setIsDeleteOpen(false)} onConfirm={onConfirmarBaja} />}
      
    </div>
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