import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StepperBar } from "./StepperBar";
import { Paso1DatosPersonales } from "./Paso1DatosPersonales";
import { Paso2PlanYProfesora } from "./Paso2PlanYProfesora";
import { Paso3SeleccionHorarios } from "./Paso3SeleccionHorarios";
import { Paso4ResumenConfirmacion } from "./Paso4ResumenConfirmacion";
import { usePreinscripcion } from "../../hooks/use-preinscripcion";
import type { Plan } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

interface ModalPreinscripcionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planes: Plan[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioApi[];
  onExito?: () => void;
}

export function ModalPreinscripcion({
  open,
  onOpenChange,
  planes,
  profesoras,
  horarios,
  onExito,
}: ModalPreinscripcionProps) {
  const {
    paso,
    setPaso,
    datosAlumno,
    setDatosAlumno,
    erroresPaso1,
    edadCalculada,
    menorDeEdad,
    esSoloProfesora,
    idPlan,
    setIdPlan,
    planSeleccionado,
    idProfesora,
    setIdProfesora,
    idsHorarios,
    toggleHorario,
    clasesRequeridas,
    horariosDisponibles,
    sinCargo,
    setSinCargo,
    fechaInicio,
    setFechaInicio,
    observacionesInscripcion,
    setObservacionesInscripcion,
    enviando,
    avanzarPaso,
    retrocederPaso,
    reiniciar,
    confirmarPreinscripcion,
  } = usePreinscripcion({
    planes,
    profesoras,
    horarios,
    onExito: () => {
      onOpenChange(false);
      onExito?.();
    },
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
        className="w-[96vw] sm:w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
            Nueva Pre-inscripción de Alumno
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Completá los pasos para registrar el alumno y reservar sus horarios semanales.
          </p>
        </DialogHeader>

        {/* Stepper de progreso */}
        <StepperBar pasoActual={paso} irAPaso={(p) => setPaso(p)} />

        {/* Contenido dinámico según el paso */}
        <div className="py-2 min-h-[300px]">
          {paso === 1 && (
            <Paso1DatosPersonales
              datos={datosAlumno}
              onChange={setDatosAlumno}
              errores={erroresPaso1}
              edadCalculada={edadCalculada}
              menorDeEdad={menorDeEdad}
            />
          )}

          {paso === 2 && (
            <Paso2PlanYProfesora
              planes={planes}
              profesoras={profesoras}
              idPlanSeleccionado={idPlan}
              onSeleccionarPlan={(id) => setIdPlan(id)}
              idProfesoraSeleccionada={idProfesora}
              onSeleccionarProfesora={(id) => setIdProfesora(id)}
              esSoloProfesora={esSoloProfesora}
              sinCargo={sinCargo}
              onToggleSinCargo={setSinCargo}
              fechaInicio={fechaInicio}
              onChangeFechaInicio={setFechaInicio}
            />
          )}

          {paso === 3 && (
            <Paso3SeleccionHorarios
              horarios={horariosDisponibles}
              idsSeleccionados={idsHorarios}
              onToggleHorario={toggleHorario}
              clasesRequeridas={clasesRequeridas}
            />
          )}

          {paso === 4 && (
            <Paso4ResumenConfirmacion
              datosAlumno={datosAlumno}
              menorDeEdad={menorDeEdad}
              edadCalculada={edadCalculada}
              plan={planSeleccionado}
              profesora={profesoraSeleccionada}
              horariosSeleccionados={horariosSeleccionadosCompletos}
              sinCargo={sinCargo}
              fechaInicio={fechaInicio}
              observacionesInscripcion={observacionesInscripcion}
              onChangeObservacionesInscripcion={setObservacionesInscripcion}
            />
          )}
        </div>

        {/* Footer con botones de navegación */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 gap-2">
          {paso > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={retrocederPaso}
              disabled={enviando}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl gap-1.5 font-bold text-xs sm:text-sm"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => cerrarModal(false)}
              disabled={enviando}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm"
            >
              Cancelar
            </Button>
          )}

          {paso < 4 ? (
            <Button
              type="button"
              onClick={avanzarPaso}
              className="min-h-[44px] px-4 sm:px-5 rounded-xl gap-1.5 ml-auto font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={confirmarPreinscripcion}
              disabled={enviando}
              className="min-h-[44px] px-4 sm:px-5 rounded-xl gap-1.5 ml-auto font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors"
            >
              {enviando ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Confirmar Pre-inscripción
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
