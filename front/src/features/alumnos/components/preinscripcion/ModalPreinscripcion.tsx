import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StepperBar } from "./StepperBar";
import { Paso1DatosPersonales } from "./Paso1DatosPersonales";
import { Paso2PlanYHorarios } from "./Paso2PlanYHorarios";
import { Paso3Confirmar } from "./Paso3Confirmar";
import { PantallaExito } from "./PantallaExito";
import { CamposMedidas } from "./CamposMedidas";
import { useQuery } from "@tanstack/react-query";
import { usePlanes } from "../../hooks/use-planes";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { usePreinscripcion, type ResultadoPreinscripcion } from "../../hooks/use-preinscripcion";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

interface ModalPreinscripcionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planes?: PlanApiRespuesta[];
  profesoras?: ProfesoraDatos[];
  horarios?: HorarioApi[];
  onExito?: (resultado: ResultadoPreinscripcion) => void;
  puedeCobrarAhora?: boolean;
}

export function ModalPreinscripcion({
  open,
  onOpenChange,
  planes: planesProp,
  profesoras: profesorasProp,
  horarios: horariosProp,
  onExito,
}: ModalPreinscripcionProps) {
  const { data: planesQuery = [] } = usePlanes();
  const { data: profesorasQuery = [] } = useQuery({
    queryKey: ["profesoras"],
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
    enabled: open && !profesorasProp,
  });
  const { data: horariosQuery = [] } = useQuery({
    queryKey: ["horarios"],
    queryFn: listarHorarios,
    staleTime: 5 * 60_000,
    enabled: open && !horariosProp,
  });

  const planes = planesProp ?? planesQuery;
  const profesoras = profesorasProp ?? profesorasQuery;
  const horarios = horariosProp ?? horariosQuery;

  const {
    paso,
    setPaso,
    exito,
    idInscripcionCreada,
    idAlumnoCreado,
    datosAlumno,
    setDatosAlumno,
    revisarCampo,
    erroresPaso1,
    edadCalculada,
    menorDeEdad,
    esSoloProfesora,
    idPlan,
    setIdPlan,
    planSeleccionado,
    idProfesora,
    setIdProfesora,
    actividadQuePideMedidas,
    medidas,
    setMedidas,
    erroresMedidas,
    idsHorarios,
    toggleHorario,
    limpiarHorarios,
    clasesRequeridas,
    fechaInicio,
    setFechaInicio,
    datosCobro,
    setDatosCobro,
    enviando,
    avanzarPaso,
    retrocederPaso,
    reiniciar,
    confirmarPreinscripcion,
  } = usePreinscripcion({
    planes,
    profesoras,
    horarios,
  });

  const cerrarModal = (nuevoEstado: boolean) => {
    if (!nuevoEstado) {
      reiniciar();
    }
    onOpenChange(nuevoEstado);
  };

  const horariosSeleccionadosCompletos = horarios.filter((h) => idsHorarios.includes(h.id_horario));
  const profesoraSeleccionada = profesoras.find((p) => Number(p.id) === idProfesora) || null;

  return (
    <Dialog open={open} onOpenChange={cerrarModal}>
      <DialogContent
        className="flex max-h-[90dvh] w-[96vw] sm:w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onInteractOutside={(e) => {
          if (enviando) e.preventDefault();
        }}
      >
        {/* Encabezado estándar */}
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-white/5">
          <div className="space-y-0.5 pr-4">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Nueva pre-inscripción
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Queda pendiente de alta hasta el primer cobro.
            </p>
          </div>
        </DialogHeader>

        {/* Si ya se completó con éxito, mostrar la Pantalla de Éxito */}
        {exito ? (
          <div className="flex-1 overflow-y-auto p-6">
            <PantallaExito
              yaAbono={datosCobro.yaAbono}
              onCargarOtro={reiniciar}
              onVerFicha={() => {
                cerrarModal(false);
                onExito?.({
                  idInscripcion: idInscripcionCreada!,
                  idAlumno: idAlumnoCreado ?? undefined,
                  cobrarAhora: false,
                });
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Stepper de 3 Pasos */}
              <StepperBar pasoActual={paso} irAPaso={(p) => setPaso(p)} />

              {/* Contenido dinámico según el paso */}
              <div className="py-2 min-h-[320px]">
              {paso === 1 && (
                <Paso1DatosPersonales
                  datos={datosAlumno}
                  onChange={setDatosAlumno}
                  errores={erroresPaso1}
                  onRevisarCampo={revisarCampo}
                  edadCalculada={edadCalculada}
                  menorDeEdad={menorDeEdad}
                />
              )}

              {paso === 2 && (
                <div className="space-y-5">
                  <Paso2PlanYHorarios
                    planes={planes}
                    profesoras={profesoras}
                    horarios={horarios}
                    idPlanSeleccionado={idPlan}
                    onSeleccionarPlan={setIdPlan}
                    idProfesoraSeleccionada={idProfesora}
                    onSeleccionarProfesora={setIdProfesora}
                    esSoloProfesora={esSoloProfesora}
                    idsHorarios={idsHorarios}
                    onToggleHorario={toggleHorario}
                    onLimpiarHorarios={limpiarHorarios}
                    clasesRequeridas={clasesRequeridas}
                    fechaInicio={fechaInicio}
                    onChangeFechaInicio={setFechaInicio}
                  />

                  {actividadQuePideMedidas && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <CamposMedidas
                        actividad={actividadQuePideMedidas}
                        medidas={medidas}
                        onChange={setMedidas}
                        errores={erroresMedidas}
                      />
                    </div>
                  )}
                </div>
              )}

              {paso === 3 && (
                <Paso3Confirmar
                  datosAlumno={datosAlumno}
                  edadCalculada={edadCalculada}
                  plan={planSeleccionado}
                  profesora={profesoraSeleccionada}
                  horariosSeleccionados={horariosSeleccionadosCompletos}
                  onEditarAlumno={() => setPaso(1)}
                  onEditarPlanYHorarios={() => setPaso(2)}
                  datosCobro={datosCobro}
                  onChangeDatosCobro={setDatosCobro}
                />
              )}
            </div>
          </div>

          {/* Footer con botones de navegación */}
          <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4 gap-3">
              {paso > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={retrocederPaso}
                  disabled={enviando}
                  className="min-h-[44px] px-5 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  Atrás
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cerrarModal(false)}
                  disabled={enviando}
                  className="min-h-[44px] px-5 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </Button>
              )}

              {paso < 3 ? (
                <Button
                  type="button"
                  onClick={avanzarPaso}
                  className="min-h-[44px] px-6 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs ml-auto"
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void confirmarPreinscripcion()}
                  disabled={enviando}
                  className="min-h-[44px] px-6 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs ml-auto flex items-center gap-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Guardando...
                    </>
                  ) : datosCobro.yaAbono ? (
                    "Guardar y dar de alta"
                  ) : (
                    "Guardar pre-inscripción"
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
