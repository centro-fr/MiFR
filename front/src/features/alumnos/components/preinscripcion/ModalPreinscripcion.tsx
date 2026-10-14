import { useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, Loader2 } from "lucide-react";
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
  /**
   * Ofrecer "Confirmar y cobrar ahora": quien puede registrar el primer cobro lo hace sin pasar
   * por Pendientes de alta. Es opcional porque el alumno puede abonar otro día.
   */
  puedeCobrarAhora?: boolean;
}

export function ModalPreinscripcion({
  open,
  onOpenChange,
  planes: planesProp,
  profesoras: profesorasProp,
  horarios: horariosProp,
  onExito,
  puedeCobrarAhora = false,
}: ModalPreinscripcionProps) {
  // Qué botón se tocó, para mostrar el "Registrando..." en ese y no en el otro.
  const [cobroPedido, setCobroPedido] = useState(false);
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
    profesorasCompatibles,
    actividadQuePideMedidas,
    medidas,
    setMedidas,
    erroresMedidas,
    idsHorarios,
    toggleHorario,
    clasesRequeridas,
    horariosDisponibles,
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
    onExito: (resultado) => {
      onOpenChange(false);
      onExito?.(resultado);
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
        // Con un clic afuera se cierra y vuelve al listado, salvo mientras se guarda la pre-inscripción.
        onInteractOutside={(e) => {
          if (enviando) e.preventDefault();
        }}
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
              onRevisarCampo={revisarCampo}
              edadCalculada={edadCalculada}
              menorDeEdad={menorDeEdad}
            />
          )}

          {paso === 2 && (
            <Paso2PlanYProfesora
              planes={planes}
              profesoras={profesoras}
              profesorasCompatibles={profesorasCompatibles}
              idPlanSeleccionado={idPlan}
              onSeleccionarPlan={(id) => setIdPlan(id)}
              idProfesoraSeleccionada={idProfesora}
              onSeleccionarProfesora={(id) => setIdProfesora(id)}
              esSoloProfesora={esSoloProfesora}
              fechaInicio={fechaInicio}
              onChangeFechaInicio={setFechaInicio}
            />
          )}

          {paso === 3 && (
            <div className="space-y-5">
              <Paso3SeleccionHorarios
                horarios={horariosDisponibles}
                idsSeleccionados={idsHorarios}
                onToggleHorario={toggleHorario}
                clasesRequeridas={clasesRequeridas}
              />
              {actividadQuePideMedidas && (
                <CamposMedidas actividad={actividadQuePideMedidas} medidas={medidas} onChange={setMedidas} errores={erroresMedidas} />
              )}
            </div>
          )}

          {paso === 4 && (
            <Paso4ResumenConfirmacion
              datosAlumno={datosAlumno}
              menorDeEdad={menorDeEdad}
              edadCalculada={edadCalculada}
              plan={planSeleccionado}
              profesora={profesoraSeleccionada}
              horariosSeleccionados={horariosSeleccionadosCompletos}
              fechaInicio={fechaInicio}
              medidas={actividadQuePideMedidas ? medidas : null}
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
            <BotonesDeConfirmacion
              enviando={enviando}
              cobroPedido={cobroPedido}
              ofrecerCobro={puedeCobrarAhora}
              onConfirmar={(cobrarAhora) => {
                setCobroPedido(cobrarAhora);
                void confirmarPreinscripcion({ cobrarAhora });
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Registrando() {
  return (
    <>
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      Registrando...
    </>
  );
}

interface BotonesDeConfirmacionProps {
  enviando: boolean;
  cobroPedido: boolean;
  ofrecerCobro: boolean;
  onConfirmar: (cobrarAhora: boolean) => void;
}

function BotonesDeConfirmacion({ enviando, cobroPedido, ofrecerCobro, onConfirmar }: BotonesDeConfirmacionProps) {
  return (
    <div className="ml-auto flex flex-wrap justify-end gap-2">
      {ofrecerCobro && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onConfirmar(true)}
          disabled={enviando}
          className="min-h-[44px] px-4 sm:px-5 rounded-xl gap-1.5 font-bold text-xs sm:text-sm border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
        >
          {enviando && cobroPedido ? (
            <Registrando />
          ) : (
            <>
              <Banknote aria-hidden="true" className="size-4" />
              Confirmar y cobrar ahora
            </>
          )}
        </Button>
      )}
      <Button
        type="button"
        onClick={() => onConfirmar(false)}
        disabled={enviando}
        className="min-h-[44px] px-4 sm:px-5 rounded-xl gap-1.5 font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors"
      >
        {enviando && !cobroPedido ? (
          <Registrando />
        ) : (
          <>
            <Check aria-hidden="true" className="size-4" />
            Confirmar Pre-inscripción
          </>
        )}
      </Button>
    </div>
  );
}
