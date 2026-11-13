import { ConflictError } from "../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina, instanteArgentino } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoAsistencia } from "../asistencia/interface/i-info-asistencia.js";
import type { ClaseConDatos } from "../clase/clase.types.js";
import type { IInfoClases } from "../clase/interface/i-info-clases.js";

const MILISEGUNDOS_POR_MINUTO = 60_000;

// Componente CierreAsistencia (<<process>>) de la vista arquitectónica (US-21). Cierra la ventana
// de asistencia de una clase y registra ausentes a los inscriptos sin marcar. Lo dispara la
// profesora con el botón o, al terminar la clase, el cierre automático (decisiones de SPRINT-3.md).
export class CierreAsistenciaService {
  constructor(
    private readonly clases: IInfoClases,
    private readonly asistencias: IInfoAsistencia,
    private readonly parametros: IInfoParametros,
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
  ) {}

  // Si la clase tiene marcas manuales, se completan con ausente los inscriptos no marcados.
  // RN: Si una clase no tiene marcada ninguna asistencia, debe pasarse a todos los alumnos como presentes.
  async cerrarManualmente(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos> {
    const clase = await this.clases.obtenerPara(idClase, solicitante);
    if (clase.estado === "CANCELADA") throw new ConflictError("La clase está cancelada");
    if (clase.estado === "DICTADA") return clase;

    const ahora = new Date();
    return this.unidadDeTrabajo.ejecutar(async () => {
      const cerrada = await this.clases.cerrar(idClase, ahora);
      if (!cerrada) return this.clases.obtenerPara(idClase, solicitante);
      const conMarcas = await this.asistencias.tieneMarcasManuales(idClase);
      if (conMarcas) {
        await this.asistencias.completarAusentes(cerrada, ahora);
      } else {
        await this.asistencias.completarPresentes(cerrada, ahora);
      }
      return cerrada;
    });
  }

  // Cierra las clases cuya ventana terminó (fin de la clase + MINUTOS_CIERRE_ASISTENCIA) y siguen
  // abiertas. Devuelve cuántas cerró.
  async procesarCierresAutomaticos(ahora: Date = new Date()): Promise<number> {
    const minutosDeGracia = await this.parametros.obtener("MINUTOS_CIERRE_ASISTENCIA");
    const abiertas = await this.clases.listarAbiertasHasta(fechaActualArgentina(ahora));
    const vencidas = abiertas.filter(
      (clase) => finDeVentana(clase, minutosDeGracia).getTime() <= ahora.getTime(),
    );

    let cerradas = 0;
    for (const clase of vencidas) {
      if (await this.cerrarAutomaticamente(clase, ahora)) cerradas += 1;
    }
    return cerradas;
  }

  // RN: Si una clase no tiene marcada ninguna asistencia debe pasarse a todos los alumnos como presentes.
  private cerrarAutomaticamente(clase: ClaseConDatos, ahora: Date): Promise<boolean> {
    return this.unidadDeTrabajo.ejecutar(async () => {
      const cerrada = await this.clases.cerrar(clase.id_clase, ahora);
      if (!cerrada) return false;
      const conMarcas = await this.asistencias.tieneMarcasManuales(clase.id_clase);
      if (conMarcas) {
        await this.asistencias.completarAusentes(cerrada, ahora);
      } else {
        await this.asistencias.completarPresentes(cerrada, ahora);
      }
      return true;
    });
  }
}

function finDeVentana(clase: ClaseConDatos, minutosDeGracia: number): Date {
  const finDeClase = instanteArgentino(clase.fecha_clase, clase.horario.hora_fin);
  return new Date(finDeClase.getTime() + minutosDeGracia * MILISEGUNDOS_POR_MINUTO);
}
