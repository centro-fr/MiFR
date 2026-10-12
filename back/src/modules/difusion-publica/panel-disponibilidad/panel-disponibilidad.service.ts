import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { ActividadesPublicas, ActividadPublica } from "./panel-disponibilidad.types.js";

// Componente PanelDisponibilidad del subsistema DifusionPublica (vista arquitectónica). No tiene
// persistencia propia: arma las actividades del centro a partir de los horarios vigentes, así una
// actividad sin clases no se ofrece. Elige campo por campo qué sale, para que un dato nuevo de horarios
// o de actividades no llegue a un visitante sin que nadie lo decida.
export class PanelDisponibilidadService {
  constructor(private readonly horarios: IInfoHorarios) {}

  async consultarActividades(): Promise<ActividadesPublicas> {
    const porActividad = new Map<number, ActividadPublica>();
    for (const { actividad, dia_semana } of await this.horarios.listarVigentes()) {
      const publica = porActividad.get(actividad.id_actividad) ?? {
        id_actividad: actividad.id_actividad,
        nombre: actividad.nombre,
        descripcion: actividad.descripcion,
        modalidad: actividad.modalidad,
        dias: [],
        clases_por_semana: 0,
      };
      if (!publica.dias.includes(dia_semana)) publica.dias.push(dia_semana);
      publica.clases_por_semana += 1;
      porActividad.set(actividad.id_actividad, publica);
    }
    // Los horarios llegan ordenados por día y hora: los días ya quedan en orden.
    return { actividades: [...porActividad.values()] };
  }
}
