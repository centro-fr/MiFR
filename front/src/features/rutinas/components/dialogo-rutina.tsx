import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActualizarRutina, useCrearRutina, useEliminarRutina } from "@/features/rutinas/hooks/use-rutinas";
import {
  MAXIMO_DIAS,
  aCrearRutinaBody,
  crearRutinaFormSchema,
  diaVacio,
  valoresDeRutina,
  valoresIniciales,
  type RutinaFormValues,
} from "@/features/rutinas/schemas/rutina-form";
import { textoOpcional } from "@/features/rutinas/schemas/texto-libre";
import { cargarEjerciciosDataset, type EjercicioSugerido } from "@/features/rutinas/data/catalogo-ejercicios";
import { EditorDiaRutina } from "@/features/rutinas/components/editor-dia-rutina";

import type { Rutina } from "@/types/rutinas";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, FILA_DE_CAMPOS_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface PropsDialogoRutina {
  abierto: boolean;
  idAlumno: number;
  nombreAlumno: string;
  rutinaAEditar?: Rutina | null;
  rutinasExistentes?: Rutina[];
  vigente?: Rutina | null;
  onClose: () => void;
}

export function DialogoRutina({
  abierto,
  idAlumno,
  nombreAlumno,
  rutinaAEditar,
  rutinasExistentes,
  onClose,
}: PropsDialogoRutina) {
  const rutinaTarget = rutinaAEditar ?? null;
  const esEdicion = Boolean(rutinaTarget);

  const crear = useCrearRutina(idAlumno);
  const actualizar = useActualizarRutina(idAlumno);
  const eliminar = useEliminarRutina(idAlumno);
  const enviando = crear.isPending || actualizar.isPending || eliminar.isPending;
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const nombresOcupados = useMemo(
    () =>
      (rutinasExistentes ?? [])
        .filter((r) => (esEdicion ? r.id !== rutinaTarget?.id : true))
        .map((r) => r.nombre),
    [rutinasExistentes, esEdicion, rutinaTarget],
  );

  const schema = useMemo(() => crearRutinaFormSchema(nombresOcupados), [nombresOcupados]);

  const formulario = useForm<RutinaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: rutinaTarget ? valoresDeRutina(rutinaTarget) : valoresIniciales(fechaActualArgentina()),
  });

  const { register, control, handleSubmit, formState: { errors } } = formulario;
  const dias = useFieldArray({ control, name: "dias" });
  const [diaActivo, setDiaActivo] = useState(0);
  const [catalogo, setCatalogo] = useState<EjercicioSugerido[] | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const [reintentosCatalogo, setReintentosCatalogo] = useState(0);

  const indiceValido = Math.min(Math.max(diaActivo, 0), Math.max(dias.fields.length - 1, 0));
  const diaSeleccionado = dias.fields[indiceValido];

  useEffect(() => {
    if (abierto) {
      formulario.reset(rutinaTarget ? valoresDeRutina(rutinaTarget) : valoresIniciales(fechaActualArgentina()));
      setDiaActivo(0);
    }
  }, [abierto, rutinaTarget, formulario]);

  useEffect(() => {
    if (!abierto || catalogo !== null) return;

    let activo = true;
    setCargandoCatalogo(true);
    setErrorCatalogo(false);

    void cargarEjerciciosDataset()
      .then((ejercicios) => {
        if (activo) setCatalogo(ejercicios);
      })
      .catch(() => {
        if (activo) setErrorCatalogo(true);
      })
      .finally(() => {
        if (activo) setCargandoCatalogo(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto, catalogo, reintentosCatalogo]);

  const guardar = handleSubmit(async (valores) => {
    try {
      if (esEdicion && rutinaTarget) {
        await actualizar.mutateAsync({
          idRutina: rutinaTarget.id,
          cuerpo: {
            nombre: valores.nombre.trim(),
            fecha_desde: valores.desde,
            fecha_hasta: valores.hasta || null,
            contenido: {
              dias: valores.dias.map((dia) => ({
                nombre: dia.nombre.trim(),
                ejercicios: dia.ejercicios.map((ej) => ({
                  nombre: ej.nombre.trim(),
                  series: Number(ej.series.trim()),
                  repeticiones: ej.repeticiones.trim(),
                  notas: textoOpcional(ej.notas),
                })),
              })),
            },
            observaciones: textoOpcional(valores.observaciones),
          },
        });
        toast.success("Rutina actualizada.");
      } else {
        await crear.mutateAsync(aCrearRutinaBody(idAlumno, valores));
        toast.success("Rutina creada.");
      }
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la rutina."));
    }
  });

  return (
    <>
      <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
        <DialogContent className={cn(CONTENIDO_MODAL, "max-w-2xl")}>
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            {esEdicion ? "Editar rutina" : "Nueva rutina"}
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            {esEdicion
              ? `Para ${nombreAlumno}. Modificá los ejercicios o días de la rutina.`
              : `Para ${nombreAlumno}. Creá una nueva rutina distribuyendo los ejercicios por día.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void guardar(e)} noValidate className={cn(CUERPO_MODAL, "flex flex-col gap-5 space-y-0")}>
          {/* Nombre de la rutina */}
          <div className={CAMPO_MODAL}>
            <label htmlFor="nombre-rutina" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Nombre <span className="text-primary">*</span>
            </label>
            <Input
              id="nombre-rutina"
              placeholder="Ej: Movilidad y core"
              {...register("nombre")}
              className="h-10 rounded-xl border-slate-200 bg-white font-medium dark:border-slate-800 dark:bg-slate-900"
            />
            {errors.nombre && <p className="text-xs font-semibold text-rose-600">{errors.nombre.message}</p>}
          </div>

          {/* Fechas: Desde y Hasta */}
          <div className={FILA_DE_CAMPOS_MODAL}>
            <div className={CAMPO_MODAL}>
              <label htmlFor="desde-rutina" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Desde <span className="text-primary">*</span>
              </label>
              <Input
                id="desde-rutina"
                type="date"
                {...register("desde")}
                className="h-10 rounded-xl border-slate-200 bg-white font-medium dark:border-slate-800 dark:bg-slate-900"
              />
              {errors.desde && <p className="text-xs font-semibold text-rose-600">{errors.desde.message}</p>}
            </div>

            <div className={CAMPO_MODAL}>
              <label htmlFor="hasta-rutina" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Hasta <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <Input
                id="hasta-rutina"
                type="date"
                {...register("hasta")}
                className="h-10 rounded-xl border-slate-200 bg-white font-medium dark:border-slate-800 dark:bg-slate-900"
              />
              {errors.hasta && <p className="text-xs font-semibold text-rose-600">{errors.hasta.message}</p>}
            </div>
          </div>

          {/* Días y ejercicios */}
          <div className="space-y-3 pt-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Días y ejercicios
            </h3>

            {/* Pestañas de días (según reg-de-ejercicios.png) */}
            <div className="flex flex-wrap items-center gap-2">
              {dias.fields.map((campo, idx) => {
                const esActivo = idx === indiceValido;
                return (
                  <button
                    key={campo.id}
                    type="button"
                    onClick={() => setDiaActivo(idx)}
                    className={cn(
                      "rounded-full px-3.5 py-1 text-xs transition-all cursor-pointer",
                      esActivo
                        ? "bg-slate-900 text-white font-bold shadow-2xs dark:bg-slate-100 dark:text-slate-900"
                        : "border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                    )}
                  >
                    Día {idx + 1}
                  </button>
                );
              })}

              {dias.fields.length < MAXIMO_DIAS && (
                <button
                  type="button"
                  onClick={() => {
                    const nuevoIndice = dias.fields.length;
                    dias.append(diaVacio(nuevoIndice + 1));
                    setDiaActivo(nuevoIndice);
                  }}
                  className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  + Día
                </button>
              )}
            </div>

            {diaSeleccionado && (
              <EditorDiaRutina
                key={diaSeleccionado.id}
                formulario={formulario}
                indiceDia={indiceValido}
                puedeQuitar={dias.fields.length > 1}
                onQuitar={() => {
                  dias.remove(indiceValido);
                  setDiaActivo(Math.max(0, indiceValido - 1));
                }}
                catalogo={catalogo}
                cargandoCatalogo={cargandoCatalogo}
                errorCatalogo={errorCatalogo}
                onReintentarCatalogo={() => setReintentosCatalogo((intentos) => intentos + 1)}
              />
            )}
          </div>

          {/* Observaciones */}
          <div className={cn(CAMPO_MODAL, "pt-1")}>
            <label htmlFor="observaciones-rutina" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Observaciones <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="observaciones-rutina"
              rows={2}
              placeholder="Ej: Ojo: cuidar la rodilla izquierda, sin saltos."
              {...register("observaciones")}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Footer de acciones estilo Cobrar en Alumnos-Lista */}
          <div className={cn(PIE_MODAL, "-mx-6 -mb-5 mt-2")}>
            {esEdicion && rutinaTarget && (
              <Button
                type="button"
                variant="ghost"
                disabled={enviando}
                onClick={() => setConfirmandoEliminar(true)}
                className="mr-auto rounded-xl px-3 font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="size-4 mr-1.5" />
                Eliminar rutina
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
            >
              {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear rutina"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Diálogo de confirmación para eliminar */}
    {confirmandoEliminar && rutinaTarget && (
      <AlertDialog open={confirmandoEliminar} onOpenChange={setConfirmandoEliminar}>
        <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
          <AlertDialogHeader className={CABECERA_MODAL}>
            <AlertDialogTitle className={TITULO_MODAL}>
              ¿Eliminar rutina?
            </AlertDialogTitle>
            <AlertDialogDescription className={DESCRIPCION_MODAL}>
              Se eliminará la rutina <strong className="text-slate-900 dark:text-white">&quot;{rutinaTarget.nombre}&quot;</strong> del alumno {nombreAlumno}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={PIE_MODAL}>
            <AlertDialogCancel
              disabled={eliminar.isPending}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={eliminar.isPending}
              onClick={async () => {
                try {
                  await eliminar.mutateAsync(rutinaTarget.id);
                  toast.success("Rutina eliminada.");
                  setConfirmandoEliminar(false);
                  onClose();
                } catch (err) {
                  toast.error(mensajeDeErrorApi(err, "No se pudo eliminar la rutina."));
                }
              }}
              className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
            >
              {eliminar.isPending ? "Eliminando..." : "Eliminar rutina"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </>
);
}
