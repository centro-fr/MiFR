import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
                <Badge
                  variant="outline"
                  className="rounded-full border-pink-200 bg-pink-100 px-2.5 py-1 text-sm font-extrabold text-[#BC1266] dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300"
                >
                  {actividades.length} activas
                </Badge>
              )}
            </div>
            <p className="hidden md:block text-sm text-slate-600 mt-1 dark:text-slate-400">
              Administrá las disciplinas y cupos del centro.
            </p>
          </div>
          <Button
            onClick={abrirNueva}
            type="button"
            className="min-h-[44px] rounded-xl bg-[#E91E82] px-4 text-sm font-extrabold text-white shadow-lg shadow-[#E91E82]/30 transition-transform hover:bg-[#BC1266] active:scale-95 md:px-5"
          >
            + Nueva<span className="hidden md:inline"> actividad</span>
          </Button>
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
            <Button type="button" onClick={() => void refetch()} className="min-h-[44px] rounded-xl px-5 text-sm font-bold">
              Reintentar
            </Button>
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
    <Card className="border-0 bg-transparent px-6 py-16 text-center shadow-none">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-0">
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
        <Button
          type="button"
          onClick={onNuevo}
          className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#E91E82] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E91E82]/30 transition-transform hover:bg-[#BC1266] active:scale-95"
        >
          + Nueva actividad
        </Button>
      </CardContent>
    </Card>
  );
}

function BotonesAcciones({ actividad, onEditar, onBaja }: { actividad: Actividad } & AccionesActividad) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={() => onEditar(actividad)}
        className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-[#E91E82] hover:text-[#E91E82] md:min-h-0 md:px-2.5 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
      >
        Editar
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onBaja(actividad)}
        className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-rose-200 bg-white px-3 py-1.5 text-sm font-bold text-rose-600 transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white md:min-h-0 md:px-2.5 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600"
      >
        Dar de baja
      </Button>
    </div>
  );
}

function ActividadCard({ actividad, badge, ...acciones }: { actividad: Actividad; badge: string } & AccionesActividad) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-surface-low">
      <Badge variant="outline" className={`inline-flex rounded-md border px-2 py-1 text-sm font-extrabold leading-none ${badge}`}>
        {textoModalidad(actividad.modalidad)}
      </Badge>
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
    </Card>
  );
}

function TablaActividades({ actividades, acciones }: { actividades: Actividad[]; acciones: AccionesActividad }) {
  return (
    <Card className="hidden overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm md:block dark:border-white/10 dark:bg-surface-low">
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[760px] text-left text-sm">
          <TableHeader>
            <TableRow className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <TableHead scope="col" className="w-[50%] px-6 py-4">Actividad</TableHead>
              <TableHead scope="col" className="w-[18%] px-4 py-4">Modalidad</TableHead>
              <TableHead scope="col" className="w-[16%] px-4 py-4">Cupo máximo</TableHead>
              <TableHead scope="col" className="w-[16%] px-6 py-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
            {SECCIONES.map((seccion) => {
              const deLaSeccion = actividades.filter((actividad) => actividad.modalidad === seccion.modalidad);
              if (deLaSeccion.length === 0) return null;
              return [
                <TableRow key={seccion.modalidad} className={`border-y font-bold ${seccion.encabezado}`}>
                  <TableHead scope="colgroup" colSpan={4} className="px-6 py-2.5 text-left text-xs uppercase tracking-wider">
                    {seccion.titulo} ({deLaSeccion.length})
                  </TableHead>
                </TableRow>,
                ...deLaSeccion.map((actividad) => (
                  <TableRow key={actividad.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <TableCell className="px-6 py-4 align-top">
                      <div className="font-black text-sm text-[#181C26] dark:text-white">{actividad.nombre}</div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{actividad.codigo}</div>
                      {actividad.descripcion && (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-xl dark:text-slate-400">
                          {actividad.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <Badge variant="outline" className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${seccion.badge}`}>
                        {textoModalidad(actividad.modalidad)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top font-extrabold text-slate-900 dark:text-slate-200">
                      {textoCupoActividad(actividad.cupoMaximo)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right align-top">
                      <BotonesAcciones actividad={actividad} {...acciones} />
                    </TableCell>
                  </TableRow>
                )),
              ];
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
