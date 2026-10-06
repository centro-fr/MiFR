import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { ModalBajaActividad } from "@/features/actividades/components/modal-baja-actividad";
import { ModalFormActividad } from "@/features/actividades/components/modal-form-actividad";
import {
  useActividades,
  useActualizarActividad,
  useCrearActividad,
  useDarDeBajaActividad,
} from "@/features/actividades/hooks/use-actividades";
import type { ActividadFormData } from "@/features/actividades/schemas/actividad";
import type { Actividad, ModalidadActividad } from "@/types/actividad";

// Colores de actividad de front/AGENTS.md: grupal azul, personalizada violeta.
const SECCIONES: { modalidad: ModalidadActividad; titulo: string; badge: string; encabezado: string }[] = [
  {
    modalidad: "GRUPAL",
    titulo: "Grupales",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    encabezado: "bg-blue-50/70 border-blue-100 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300",
  },
  {
    modalidad: "PERSONALIZADA",
    titulo: "Personalizadas",
    badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
    encabezado: "bg-violet-50/70 border-violet-100 text-violet-800 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300",
  },
];

function textoModalidad(modalidad: ModalidadActividad): string {
  return modalidad === "GRUPAL" ? "Grupal" : "Personalizada";
}

function textoCupoActividad(cupo: number | null): string {
  if (cupo === null) return "Sin límite";
  return cupo === 1 ? "1 alumno" : `${cupo} alumnos`;
}

interface AccionesActividad {
  onEditar: (actividad: Actividad) => void;
  onBaja: (actividad: Actividad) => void;
}

export function ActividadesPage() {
  const { data: actividades = [], isPending, isError, error, refetch } = useActividades();
  const crear = useCrearActividad();
  const actualizar = useActualizarActividad();
  const darDeBaja = useDarDeBajaActividad();

  const [formAbierto, setFormAbierto] = useState(false);
  const [actividadEditar, setActividadEditar] = useState<Actividad | null>(null);
  const [actividadBaja, setActividadBaja] = useState<Actividad | null>(null);

  const guardado = actividadEditar ? actualizar : crear;

  const abrirNueva = () => {
    crear.reset();
    setActividadEditar(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (actividad: Actividad) => {
    actualizar.reset();
    setActividadEditar(actividad);
    setFormAbierto(true);
  };

  const abrirBaja = (actividad: Actividad) => {
    darDeBaja.reset();
    setActividadBaja(actividad);
  };

  const guardar = (datos: ActividadFormData) => {
    const alGuardar = (mensaje: string) => () => {
      setFormAbierto(false);
      toast.success(mensaje);
    };
    if (actividadEditar) {
      actualizar.mutate(
        { id: actividadEditar.id, datos },
        { onSuccess: alGuardar(`Actividad "${datos.nombre}" actualizada`) },
      );
    } else {
      crear.mutate(datos, { onSuccess: alGuardar(`Actividad "${datos.nombre}" creada`) });
    }
  };

  const confirmarBaja = () => {
    if (!actividadBaja) return;
    darDeBaja.mutate(actividadBaja.id, {
      onSuccess: () => {
        toast.info(`Actividad "${actividadBaja.nombre}" dada de baja`);
        setActividadBaja(null);
      },
    });
  };

  const acciones: AccionesActividad = { onEditar: abrirEdicion, onBaja: abrirBaja };

  return (
    <OwnerLayout>
      <div className="px-4 py-5 md:p-8 max-w-[1180px] mx-auto w-full">
        <div className="flex items-center gap-2 text-sm font-medium mb-2 select-none">
          <span className="text-slate-400">MiFR Centro</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-semibold dark:text-slate-300">Actividades y Horarios</span>
          <span className="text-slate-300">/</span>
          <span className="text-[#E91E82] font-semibold">Actividades</span>
        </div>
        <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] md:text-2xl font-black text-[#181C26] dark:text-white tracking-tight">
                Actividades
              </h1>
              {!isPending && !isError && (
                <span className="text-sm font-extrabold px-2.5 py-1 rounded-full bg-pink-100 text-[#BC1266] border border-pink-200 dark:bg-primary/20 dark:text-pink-300 dark:border-primary/40">
                  {actividades.length} activas
                </span>
              )}
            </div>
            <p className="hidden md:block text-sm text-slate-600 mt-1 dark:text-slate-400">
              Administrá las disciplinas y cupos del centro.
            </p>
          </div>
          <button
            onClick={abrirNueva}
            type="button"
            className="bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-extrabold min-h-[44px] px-4 md:px-5 rounded-xl shadow-lg shadow-[#E91E82]/30 cursor-pointer transition-transform active:scale-95"
          >
            + Nueva<span className="hidden md:inline"> actividad</span>
          </button>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[#E91E82]" />
            Cargando actividades…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudieron cargar las actividades.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-[44px] px-5 rounded-xl bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-bold"
            >
              Reintentar
            </button>
          </div>
        ) : actividades.length === 0 ? (
          <EmptyActividades onNuevo={abrirNueva} />
        ) : (
          <>
            <div className="md:hidden space-y-3 pb-8">
              {SECCIONES.map((seccion) =>
                actividades
                  .filter((actividad) => actividad.modalidad === seccion.modalidad)
                  .map((actividad) => (
                    <ActividadCard key={actividad.id} actividad={actividad} badge={seccion.badge} {...acciones} />
                  )),
              )}
            </div>
            <TablaActividades actividades={actividades} acciones={acciones} />
          </>
        )}
      </div>

      {formAbierto && (
        <ModalFormActividad
          key={actividadEditar?.id ?? "nueva"}
          actividad={actividadEditar}
          guardando={guardado.isPending}
          errorGuardado={guardado.isError ? mensajeDeErrorApi(guardado.error, "No se pudo guardar la actividad.") : null}
          onClose={() => setFormAbierto(false)}
          onSave={guardar}
        />
      )}

      {actividadBaja && (
        <ModalBajaActividad
          actividad={actividadBaja}
          dandoDeBaja={darDeBaja.isPending}
          errorBaja={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja la actividad.") : null}
          onClose={() => setActividadBaja(null)}
          onConfirm={confirmarBaja}
        />
      )}
    </OwnerLayout>
  );
}

function EmptyActividades({ onNuevo }: { onNuevo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-[#BC1266] dark:bg-pink-500/15 dark:text-pink-300"
      >
        <CalendarPlus className="h-8 w-8" />
      </span>
      <h2 className="text-xl font-extrabold tracking-tight text-[#181C26] dark:text-white">Todavía no hay actividades</h2>
      <p className="max-w-[320px] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Creá la primera disciplina del centro para empezar a diagramar horarios.
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
}

function BotonesAcciones({ actividad, onEditar, onBaja }: { actividad: Actividad } & AccionesActividad) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onEditar(actividad)}
        className="min-h-[44px] md:min-h-0 inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap px-3 md:px-2.5 md:py-1.5 rounded-lg border border-slate-200 hover:border-[#E91E82] text-slate-700 hover:text-[#E91E82] font-bold text-sm bg-white transition-colors dark:border-white/15 dark:bg-transparent dark:text-slate-200"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => onBaja(actividad)}
        className="min-h-[44px] md:min-h-0 inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap px-3 md:px-2.5 md:py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-600 hover:border-rose-600 hover:text-white font-bold text-sm bg-white transition-colors dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300"
      >
        Dar de baja
      </button>
    </div>
  );
}

function ActividadCard({ actividad, badge, ...acciones }: { actividad: Actividad; badge: string } & AccionesActividad) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm dark:bg-surface-low dark:border-white/10">
      <span className={`inline-flex px-2 py-1 rounded-md border text-sm font-extrabold leading-none ${badge}`}>
        {textoModalidad(actividad.modalidad)}
      </span>
      <h2 className="text-base font-black text-[#181C26] dark:text-white mt-2 leading-tight">{actividad.nombre}</h2>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{actividad.codigo}</p>
      {actividad.descripcion && (
        <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3 dark:text-slate-400">{actividad.descripcion}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/10">
        <div>
          <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide dark:text-slate-400">Cupo</div>
          <div className="text-sm text-slate-800 dark:text-slate-100 font-extrabold mt-0.5">
            {textoCupoActividad(actividad.cupoMaximo)}
          </div>
        </div>
        <BotonesAcciones actividad={actividad} {...acciones} />
      </div>
    </article>
  );
}

function TablaActividades({ actividades, acciones }: { actividades: Actividad[]; acciones: AccionesActividad }) {
  return (
    <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden dark:bg-surface-low dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-xs tracking-wider border-b border-slate-200 dark:bg-white/5 dark:text-slate-200 dark:border-white/10">
              <th scope="col" className="py-4 px-6 w-[50%]">Actividad</th>
              <th scope="col" className="py-4 px-4 w-[18%]">Modalidad</th>
              <th scope="col" className="py-4 px-4 w-[16%]">Cupo máximo</th>
              <th scope="col" className="py-4 px-6 text-right w-[16%]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
            {SECCIONES.map((seccion) => {
              const deLaSeccion = actividades.filter((actividad) => actividad.modalidad === seccion.modalidad);
              if (deLaSeccion.length === 0) return null;
              return [
                <tr key={seccion.modalidad} className={`border-y font-bold ${seccion.encabezado}`}>
                  <th scope="colgroup" colSpan={4} className="py-2.5 px-6 text-xs uppercase tracking-wider text-left">
                    {seccion.titulo} ({deLaSeccion.length})
                  </th>
                </tr>,
                ...deLaSeccion.map((actividad) => (
                  <tr key={actividad.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-4 px-6 align-top">
                      <div className="font-black text-sm text-[#181C26] dark:text-white">{actividad.nombre}</div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{actividad.codigo}</div>
                      {actividad.descripcion && (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-xl dark:text-slate-400">
                          {actividad.descripcion}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${seccion.badge}`}>
                        {textoModalidad(actividad.modalidad)}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top font-extrabold text-slate-900 dark:text-slate-200">
                      {textoCupoActividad(actividad.cupoMaximo)}
                    </td>
                    <td className="py-4 px-6 text-right align-top">
                      <BotonesAcciones actividad={actividad} {...acciones} />
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
