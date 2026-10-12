import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { HorarioRespuesta } from "../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { Disponibilidad, HorarioPublico, PanelDisponibilidad } from "./panel-disponibilidad.types.js";

// US-32: desde el 60 % de ocupación el horario se muestra casi lleno.
const UMBRAL_CASI_LLENO = 0.6;

function disponibilidadDe(cupo: number | null, ocupados: number): Disponibilidad {
  if (cupo === null) return "SIN_LIMITE";
  if (ocupados >= cupo) return "COMPLETO";
  return ocupados / cupo >= UMBRAL_CASI_LLENO ? "CASI_LLENO" : "LIBRE";
}

// Componente PanelDisponibilidad del subsistema DifusionPublica (vista arquitectónica). No tiene
// persistencia propia: arma el cronograma con IInfoHorarios y la ocupación con IInfoInscripciones, con la
// misma regla de cupo que el alta (las reservas vencidas no ocupan lugar). Elige campo por campo qué sale,
// para que un dato nuevo de horarios o de profesoras no llegue a un visitante sin que nadie lo decida.
export class PanelDisponibilidadService {
  constructor(
    private readonly horarios: IInfoHorarios,
    private readonly inscripciones: IInfoInscripciones,
  ) {}

  async consultar(): Promise<PanelDisponibilidad> {
    const horarios = await this.horarios.listarVigentes();
    const ocupados = await this.inscripciones.contarLugaresOcupados(
      horarios.map(({ id_horario }) => id_horario),
    );
    return {
      horarios: horarios.map((horario) => this.aPublico(horario, ocupados.get(horario.id_horario) ?? 0)),
    };
  }

  private aPublico(horario: HorarioRespuesta, ocupados: number): HorarioPublico {
    const cupo = horario.cupo_maximo_efectivo;
    return {
      id_horario: horario.id_horario,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      actividad: {
        id_actividad: horario.actividad.id_actividad,
        nombre: horario.actividad.nombre,
        descripcion: horario.actividad.descripcion,
        modalidad: horario.actividad.modalidad,
      },
      profesora: {
        nombre: horario.profesora.usuario.nombre,
        apellido: horario.profesora.usuario.apellido,
      },
      cupo_maximo: cupo,
      cupo_disponible: cupo === null ? null : Math.max(cupo - ocupados, 0),
      disponibilidad: disponibilidadDe(cupo, ocupados),
    };
  }
}
