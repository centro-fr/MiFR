import { ForbiddenError, NotFoundError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type {
  CriterioDeLogro,
  MarcaDeHistorial,
  ResumenRacha,
} from "../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.types.js";
import type { ICalculoRachaRanking } from "../../calculos-del-negocio/calculador-racha-ranking/interface/i-calculo-racha-ranking.js";
import type { AsistenciaDeAlumno } from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { IInfoAsistencia } from "../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { InsigniaRepository } from "./insignia.repository.js";
import type {
  FichaInsignias,
  FilaRanking,
  FiltroRanking,
  Insignia,
  InsigniaDeFicha,
  InsigniaObtenida,
  InsigniaResumida,
  ProgresoInsignia,
  RankingAsistencia,
  ResumenCierreMensual,
} from "./insignia.types.js";
import type { IOtorgamientoInsignias } from "./interface/i-otorgamiento-insignias.js";

const SIN_PERIODO = "";

type FilaConPorcentaje = AsistenciaDeAlumno & { porcentaje_asistencia: number };
type FilaOrdenada = FilaConPorcentaje & { posicion: number };
type InsigniaDeHistorial = Insignia & { tipo: CriterioDeLogro };

// Racha y total de clases salen del historial de asistencia; las mensuales, del cierre de cada mes.
function esDeHistorial(insignia: Insignia): insignia is InsigniaDeHistorial {
  return insignia.tipo === "RACHA" || insignia.tipo === "TOTAL_CLASES";
}

// El alumno mismo o el tutor de un menor (US-31).
function esDeQuienPide(
  alumno: { id_usuario: number; id_usuario_responsable: number | null },
  solicitante: Solicitante,
): boolean {
  return (
    alumno.id_usuario === solicitante.idUsuario || alumno.id_usuario_responsable === solicitante.idUsuario
  );
}

function primerDiaDelMes(dia: Date): Date {
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
}

// AAAA-MM a su primer y su último día, como columnas DATE.
function rangoDelPeriodo(periodo: string): { desde: Date; hasta: Date } {
  const [anio, mes] = periodo.split("-").map(Number);
  return { desde: new Date(Date.UTC(anio, mes - 1, 1)), hasta: new Date(Date.UTC(anio, mes, 0)) };
}

function progresoDe(insignia: Insignia, obtenida: boolean, racha: ResumenRacha): ProgresoInsignia | null {
  if (!esDeHistorial(insignia)) return null;
  const actual = insignia.tipo === "RACHA" ? racha.actual : racha.clases_asistidas;
  const umbral = insignia.valor_umbral;
  return { actual: obtenida ? umbral : Math.min(actual, umbral), umbral };
}

function insigniaDeFicha(
  insignia: Insignia,
  obtenidas: InsigniaObtenida[],
  racha: ResumenRacha,
): InsigniaDeFicha {
  const deEsta = obtenidas.filter(({ id_insignia }) => id_insignia === insignia.id_insignia);
  const { codigo, nombre, descripcion, tipo, valor_umbral } = insignia;
  return {
    codigo,
    nombre,
    descripcion,
    tipo,
    valor_umbral,
    obtenida: deEsta.length > 0,
    fecha_obtencion: deEsta[0]?.fecha_obtencion ?? null,
    periodos: deEsta.map(({ periodo }) => periodo).filter((periodo) => periodo !== SIN_PERIODO),
    progreso: progresoDe(insignia, deEsta.length > 0, racha),
  };
}

// Una mensual obtenida varios meses se muestra una vez en el ranking.
function resumirObtenidas(obtenidas: InsigniaObtenida[]): InsigniaResumida[] {
  const porCodigo = new Map(
    obtenidas.map(({ insignia: { codigo, nombre, descripcion, tipo } }) => [
      codigo,
      { codigo, nombre, descripcion, tipo },
    ]),
  );
  return [...porCodigo.values()];
}

// Componente Insignia de GestionInsignias (vista arquitectónica): la racha y las insignias del alumno
// (US-31) y el ranking de asistencia (US-30), que el Podio del mes también usa. Solo cuentan las clases
// dictadas: una cancelada no tiene marcas y no corta la racha, y una suplencia es una clase más.
export class InsigniaService implements IOtorgamientoInsignias {
  constructor(
    private readonly repositorio: InsigniaRepository,
    private readonly asistencias: IInfoAsistencia,
    private readonly alumnos: IInfoAlumnos,
    private readonly parametros: IInfoParametros,
    private readonly calculador: ICalculoRachaRanking,
  ) {}

  // A quien no puede verla, un alumno que no existe se le responde igual que uno ajeno (seguridad.md, 3).
  async obtenerFicha(idAlumno: number, solicitante: Solicitante): Promise<FichaInsignias> {
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    if (!solicitante.esPropietaria && !(alumno && esDeQuienPide(alumno, solicitante))) {
      throw new ForbiddenError("Solo podés ver tus insignias o las de un menor a tu cargo");
    }
    if (!alumno) throw new NotFoundError("Alumno no encontrado");

    const [catalogo, historial] = await Promise.all([
      this.repositorio.listarCatalogo(),
      this.asistencias.historialDeAlumnos([idAlumno]),
    ]);
    await this.otorgarLogros(historial, catalogo);
    const obtenidas = await this.repositorio.listarObtenidas([idAlumno]);
    return this.armarFicha(idAlumno, historial.get(idAlumno) ?? [], catalogo, obtenidas);
  }

  // Por defecto, el mes en curso hasta hoy (US-30).
  async consultarRanking(filtro: FiltroRanking, solicitante: Solicitante): Promise<RankingAsistencia> {
    const hasta = filtro.hasta ?? fechaActualArgentina();
    const desde = filtro.desde ?? primerDiaDelMes(hasta);
    const [filas, minimo] = await Promise.all([
      this.asistencias.resumirPorAlumno({ desde, hasta, id_actividad: filtro.actividad }),
      this.parametros.obtener("RANKING_MINIMO_CLASES"),
    ]);
    const ranking = this.calculador.ordenarRanking(this.elegibles(filas, minimo));
    const pagina = ranking.slice(filtro.offset, filtro.offset + filtro.limit);
    const propias = ranking.filter((fila) => esDeQuienPide(fila, solicitante));
    const detallar = await this.detallarFilas([...pagina, ...propias], solicitante);
    return {
      periodo: { desde, hasta },
      actividad: filtro.actividad ?? null,
      minimo_clases: minimo,
      datos: pagina.map(detallar),
      propias: propias.map(detallar),
      total: ranking.length,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  async cerrarMes(periodo: string, ahora: Date): Promise<ResumenCierreMensual> {
    const { desde, hasta } = rangoDelPeriodo(periodo);
    const [filas, minimo, catalogo] = await Promise.all([
      this.asistencias.resumirPorAlumno({ desde, hasta }),
      this.parametros.obtener("RANKING_MINIMO_CLASES"),
      this.repositorio.listarCatalogo(),
    ]);
    const elegibles = this.elegibles(filas, minimo);
    const resumen: ResumenCierreMensual = { periodo, mes_perfecto: 0, podio: 0 };
    for (const insignia of catalogo) {
      if (insignia.tipo === "MES_PERFECTO") {
        const perfectos = elegibles.filter((fila) => fila.porcentaje_asistencia >= insignia.valor_umbral);
        resumen.mes_perfecto += await this.otorgarDelMes(insignia, perfectos, periodo, ahora);
      } else if (insignia.tipo === "PODIO_MES") {
        resumen.podio += await this.otorgarPodio(insignia, elegibles, periodo, ahora);
      }
    }
    return resumen;
  }

  // Menos clases que RANKING_MINIMO_CLASES distorsionan el porcentaje: no entran al ranking ni a las
  // mensuales (US-30, SPRINT-5.md).
  private elegibles(filas: AsistenciaDeAlumno[], minimo: number): FilaConPorcentaje[] {
    return filas
      .filter(({ clases_previstas }) => clases_previstas >= minimo)
      .map((fila) => ({
        ...fila,
        porcentaje_asistencia: this.calculador.porcentaje(fila.clases_asistidas, fila.clases_previstas),
      }));
  }

  // Se guardan al consultarlas, con la fecha de la clase en que se alcanzó el umbral: no importa
  // cuándo se calculen, y la clave primaria evita duplicarlas.
  private otorgarLogros(historial: Map<number, MarcaDeHistorial[]>, catalogo: Insignia[]): Promise<number> {
    const deHistorial = catalogo.filter(esDeHistorial);
    const logros = [...historial].flatMap(([id_alumno, marcas]) =>
      deHistorial.flatMap((insignia) => {
        const fecha = this.calculador.cuandoSeAlcanzo(marcas, insignia.tipo, insignia.valor_umbral);
        if (!fecha) return [];
        return [
          { id_alumno, id_insignia: insignia.id_insignia, periodo: SIN_PERIODO, fecha_obtencion: fecha },
        ];
      }),
    );
    return this.repositorio.otorgar(logros);
  }

  // El podio es uno por mes: si una corrección posterior cambiara el orden, volver a cerrar el mes
  // le daría el podio a un cuarto alumno. Quien no asistió a ninguna clase no sube al podio.
  private async otorgarPodio(
    insignia: Insignia,
    elegibles: FilaConPorcentaje[],
    periodo: string,
    ahora: Date,
  ): Promise<number> {
    if (await this.repositorio.fueOtorgadaEnPeriodo(insignia.id_insignia, periodo)) return 0;
    const conAsistencias = elegibles.filter(({ clases_asistidas }) => clases_asistidas > 0);
    const podio = this.calculador.ordenarRanking(conAsistencias).slice(0, insignia.valor_umbral);
    return this.otorgarDelMes(insignia, podio, periodo, ahora);
  }

  private otorgarDelMes(
    insignia: Insignia,
    alumnos: { id_alumno: number }[],
    periodo: string,
    ahora: Date,
  ): Promise<number> {
    return this.repositorio.otorgar(
      alumnos.map(({ id_alumno }) => ({
        id_alumno,
        id_insignia: insignia.id_insignia,
        periodo,
        fecha_obtencion: ahora,
      })),
    );
  }

  private armarFicha(
    idAlumno: number,
    marcas: MarcaDeHistorial[],
    catalogo: Insignia[],
    obtenidas: InsigniaObtenida[],
  ): FichaInsignias {
    const racha = this.calculador.resumirRacha(marcas);
    const umbrales = (tipo: CriterioDeLogro) =>
      catalogo.filter((insignia) => insignia.tipo === tipo).map(({ valor_umbral }) => valor_umbral);
    return {
      id_alumno: idAlumno,
      racha: {
        actual: racha.actual,
        mejor: racha.mejor,
        fecha_inicio: racha.inicio_actual,
        proximo_hito: this.calculador.proximoHito(racha.actual, umbrales("RACHA")),
      },
      clases_asistidas: racha.clases_asistidas,
      proximo_hito_clases: this.calculador.proximoHito(racha.clases_asistidas, umbrales("TOTAL_CLASES")),
      insignias: catalogo.map((insignia) => insigniaDeFicha(insignia, obtenidas, racha)),
    };
  }

  // La racha y las insignias de las filas que se muestran. La fila sale campo por campo: el usuario
  // y el tutor de cada alumno no llegan a la respuesta.
  private async detallarFilas(
    filas: FilaOrdenada[],
    solicitante: Solicitante,
  ): Promise<(fila: FilaOrdenada) => FilaRanking> {
    const ids = [...new Set(filas.map(({ id_alumno }) => id_alumno))];
    const [catalogo, historial] = await Promise.all([
      this.repositorio.listarCatalogo(),
      this.asistencias.historialDeAlumnos(ids),
    ]);
    await this.otorgarLogros(historial, catalogo);
    const obtenidas = await this.repositorio.listarObtenidas(ids);
    return (fila) => ({
      posicion: fila.posicion,
      id_alumno: fila.id_alumno,
      nombre: fila.nombre,
      apellido: fila.apellido,
      clases_previstas: fila.clases_previstas,
      clases_asistidas: fila.clases_asistidas,
      porcentaje_asistencia: fila.porcentaje_asistencia,
      racha_actual: this.calculador.resumirRacha(historial.get(fila.id_alumno) ?? []).actual,
      insignias: resumirObtenidas(obtenidas.filter(({ id_alumno }) => id_alumno === fila.id_alumno)),
      es_propia: esDeQuienPide(fila, solicitante),
    });
  }
}
