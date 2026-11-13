import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { EstadoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoInscripciones } from "../inscripcion/interface/i-info-inscripciones.js";

// Mientras la cuota está paga o en sus días de gracia, el alumno sigue en lo que contrató.
const CUOTA_CORRIENDO: EstadoHabilitacion[] = ["AL_DIA", "POR_VENCER", "CLASE_SUELTA_VIGENTE"];

export interface ResultadoDelDia {
  cambiosDePlan: number;
  salidasDeHorario: number;
  horariosDadosDeBaja: number;
  errores: unknown[];
}

// Componente AplicadorProgramados (<<process>>) de la vista arquitectónica. Aplica lo que se programó
// para cuando termina la gracia de la cuota que corre: el cambio de plan (US-14) y la salida de los
// inscriptos de un horario con la baja programada (US-04). Corre a lo sumo una vez por día y por
// proceso; un error con una inscripción no frena a las demás y se reintenta al día siguiente.
export class AplicadorProgramadosService {
  private ultimoDia: string | null = null;

  constructor(
    private readonly inscripciones: IInfoInscripciones,
    private readonly cuotas: IInfoCuotas,
    private readonly horarios: IInfoHorarios,
  ) {}

  async aplicarDelDia(ahora: Date = new Date()): Promise<ResultadoDelDia | null> {
    const hoy = fechaActualArgentina(ahora);
    const dia = hoy.toISOString().slice(0, 10);
    if (this.ultimoDia === dia) return null;
    this.ultimoDia = dia;

    const resultado: ResultadoDelDia = {
      cambiosDePlan: 0,
      salidasDeHorario: 0,
      horariosDadosDeBaja: 0,
      errores: [],
    };
    await this.aplicarCambiosDePlan(hoy, resultado);
    await this.vaciarHorariosConBajaProgramada(resultado);
    return resultado;
  }

  private async aplicarCambiosDePlan(hoy: Date, resultado: ResultadoDelDia): Promise<void> {
    for (const cambio of await this.inscripciones.listarCambiosParaAplicar(hoy)) {
      try {
        await this.inscripciones.aplicarCambioProgramado(cambio);
        resultado.cambiosDePlan += 1;
      } catch (error) {
        resultado.errores.push(error);
      }
    }
  }

  // Sale quien terminó su gracia (o no llegó a pagar); el horario se da de baja cuando no queda nadie.
  private async vaciarHorariosConBajaProgramada(resultado: ResultadoDelDia): Promise<void> {
    for (const horario of await this.horarios.listarConBajaProgramada()) {
      const enHorario = await this.inscripciones.listarEnHorario(horario.id_horario);
      const habilitaciones = await this.cuotas.habilitacionDeInscripciones(
        enHorario.map(({ id_inscripcion }) => id_inscripcion),
      );
      for (const inscripcion of enHorario) {
        const estado = habilitaciones.get(inscripcion.id_inscripcion)?.estado;
        if (inscripcion.estado === "ACTIVA" && estado !== undefined && CUOTA_CORRIENDO.includes(estado))
          continue;
        try {
          await this.inscripciones.sacarDelHorario(inscripcion, horario.id_horario);
          resultado.salidasDeHorario += 1;
        } catch (error) {
          resultado.errores.push(error);
        }
      }
      if (await this.horarios.completarBajaProgramada(horario.id_horario)) resultado.horariosDadosDeBaja += 1;
    }
  }
}
