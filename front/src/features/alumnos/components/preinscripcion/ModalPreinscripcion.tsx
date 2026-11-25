import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useNavigate } from "react-router-dom";
import { usePlanes } from "../../hooks/use-planes";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { usePreinscripcion, type ResultadoPreinscripcion } from "../../hooks/use-preinscripcion";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

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
  // Un horario con la baja programada no admite alumnos nuevos (US-04).
  const horarios = (horariosProp ?? horariosQuery).filter((h) => !h.fecha_baja_programada);

  const {
    paso,
    setPaso,
    exito,
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
    datosCobro,
    setDatosCobro,
    cotizacionCobro,
    promocionesDelPlan,
    seleccionarPromocion,
    esPropietaria,
    enviando,
    avanzarPaso,
    retrocederPaso,
    reiniciar,
    confirmarPreinscripcion,
  } = usePreinscripcion({
    planes,
    profesoras,
    horarios,
    onExito,
  });

  const navigate = useNavigate();

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
        className={cn(CONTENIDO_MODAL, "w-[96vw] sm:w-full max-w-2xl")}
        onInteractOutside={(e) => {
          if (enviando) e.preventDefault();
        }}
      >
        {/* Encabezado del mismo color que el body */}
        <DialogHeader className={CABECERA_MODAL}>
          <div className="space-y-0.5">
            <DialogTitle className={TITULO_MODAL}>
              Nueva pre-inscripción
            </DialogTitle>
            <DialogDescription className={DESCRIPCION_MODAL}>
              Queda pendiente de alta hasta el primer cobro.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Si ya se completó con éxito, mostrar la Pantalla de Éxito */}
        {exito ? (
          <div className={CUERPO_MODAL}>
            <PantallaExito
              yaAbono={datosCobro.yaAbono}
              onCargarOtro={reiniciar}
              onVerFicha={() => {
                // Se toma antes de cerrar: cerrar reinicia el formulario y borra el id del alumno creado.
                const idAlumno = idAlumnoCreado;
                cerrarModal(false);
                if (idAlumno !== null) navigate(`/app/alumnos/${idAlumno}`);
              }}
            />
          </div>
        ) : (
          <>
            <div className={CUERPO_MODAL}>
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
                    menorDeEdad={menorDeEdad}
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
                  />

                  {actividadQuePideMedidas && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <CamposMedidas
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
                  cotizacion={cotizacionCobro}
                  promociones={promocionesDelPlan}
                  onSeleccionarPromocion={seleccionarPromocion}
                  esPropietaria={esPropietaria}
                />
              )}
            </div>
          </div>

          {/* Footer del mismo color que el body */}
          <div className={cn(PIE_MODAL, "justify-between")}>
              {paso > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={retrocederPaso}
                  disabled={enviando}
                  className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Atrás
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cerrarModal(false)}
                  disabled={enviando}
                  className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </Button>
              )}

              {paso < 3 ? (
                <Button
                  type="button"
                  onClick={avanzarPaso}
                  className="rounded-xl bg-primary px-5 font-bold text-white shadow-md hover:bg-primary-dark ml-auto"
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void confirmarPreinscripcion()}
                  disabled={enviando}
                  className="rounded-xl bg-primary px-5 font-bold text-white shadow-md hover:bg-primary-dark ml-auto flex items-center gap-2"
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
