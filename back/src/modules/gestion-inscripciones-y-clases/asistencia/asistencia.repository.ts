import { Prisma, type PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import { instanteArgentino } from "../../../shared/utils/fecha-argentina.js";
import type { MarcaDeHistorial } from "../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.types.js";
import type { InscriptoDeHorario } from "../inscripcion/inscripcion.types.js";
import type {
  Asistencia,
  AsistenciaDeAlumno,
  AsistenciaDeProfesora,
  ConsultaHistorialAlumno,
  EstadoSeguimientoInactividad,
  FiltroAsistenciasDictadas,
  HistorialDelAlumno,
  MarcaDelAlumno,
  MarcaDeSeguimiento,
  MarcarAsistenciaInput,
  RachaDeInasistencia,
  SeguimientoInactividad,
} from "./asistencia.types.js";

export interface MarcaDeAsistencia {
  idClase: number;
  idUsuario: number;
  fechaRegistro: Date;
}

const MARCA_DEL_HISTORIAL = {
  id_inscripcion: true,
  asistio: true,
  observaciones: true,
  clase: {
    select: {
      id_clase: true,
      fecha_clase: true,
      horario: { select: { hora_inicio: true, hora_fin: true, actividad: { select: { nombre: true } } } },
      profesora: { select: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  },
} satisfies Prisma.asistenciasSelect;

function aMarcaDelAlumno({
  id_inscripcion,
  asistio,
  observaciones,
  clase,
}: Prisma.asistenciasGetPayload<{ select: typeof MARCA_DEL_HISTORIAL }>): MarcaDelAlumno {
  return {
    id_clase: clase.id_clase,
    id_inscripcion,
    fecha_clase: clase.fecha_clase,
    hora_inicio: clase.horario.hora_inicio,
    hora_fin: clase.horario.hora_fin,
    actividad: clase.horario.actividad.nombre,
    profesora: clase.profesora.usuario,
    asistio,
    observaciones,
  };
}

// El FROM y el WHERE comunes a los resúmenes de asistencia, con las uniones que agregue cada uno.
// Los valores van como parámetros.
function desdeAsistenciasDictadas(filtro: FiltroAsistenciasDictadas, uniones: Prisma.Sql): Prisma.Sql {
  const condiciones = [
    Prisma.sql`c.estado = 'DICTADA'`,
    Prisma.sql`c.fecha_clase BETWEEN ${filtro.desde}::date AND ${filtro.hasta}::date`,
  ];
  if (!filtro.incluir_bajas) condiciones.push(Prisma.sql`al.estado <> 'BAJA'`);
  if (filtro.id_alumno !== undefined) condiciones.push(Prisma.sql`a.id_alumno = ${filtro.id_alumno}`);
  if (filtro.id_profesora !== undefined) {
    condiciones.push(Prisma.sql`c.id_prof_dictante = ${filtro.id_profesora}`);
  }
  if (filtro.id_actividad !== undefined)
    condiciones.push(Prisma.sql`h.id_actividad = ${filtro.id_actividad}`);
  return Prisma.sql`
    FROM asistencias a
    JOIN clases c ON c.id_clase = a.id_clase
    JOIN horarios h ON h.id_horario = c.id_horario
    JOIN alumnos al ON al.id_alumno = a.id_alumno
    ${uniones}
    WHERE ${Prisma.join(condiciones, " AND ")}`;
}

export class AsistenciaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listarDeClase(idClase: number): Promise<Asistencia[]> {
    return this.prisma.asistencias.findMany({ where: { id_clase: idClase }, orderBy: { id_alumno: "asc" } });
  }

  async marcar(
    inscripto: InscriptoDeHorario,
    { asistio, observaciones }: MarcarAsistenciaInput,
    marca: MarcaDeAsistencia,
  ): Promise<void> {
    const registro = {
      id_inscripcion: inscripto.id_inscripcion,
      asistio,
      id_usuario_registra: marca.idUsuario,
      fecha_registro: marca.fechaRegistro,
      ...(observaciones === undefined ? {} : { observaciones }),
    };
    await clienteEnCurso(this.prisma).asistencias.upsert({
      where: { id_clase_id_alumno: { id_clase: marca.idClase, id_alumno: inscripto.id_alumno } },
      create: { id_clase: marca.idClase, id_alumno: inscripto.id_alumno, ...registro },
      update: registro,
    });
  }

  // Dos sentencias en lugar de una por alumno: pisa a los ya marcados y crea a los que faltan.
  async marcarPresentes(inscriptos: InscriptoDeHorario[], marca: MarcaDeAsistencia): Promise<void> {
    if (inscriptos.length === 0) return;
    const cliente = clienteEnCurso(this.prisma);
    const registro = {
      asistio: true,
      id_usuario_registra: marca.idUsuario,
      fecha_registro: marca.fechaRegistro,
    };
    await cliente.asistencias.updateMany({
      where: { id_clase: marca.idClase, id_alumno: { in: inscriptos.map(({ id_alumno }) => id_alumno) } },
      data: registro,
    });
    await cliente.asistencias.createMany({
      data: inscriptos.map(({ id_alumno, id_inscripcion }) => ({
        id_clase: marca.idClase,
        id_alumno,
        id_inscripcion,
        ...registro,
      })),
      skipDuplicates: true,
    });
  }

  async tieneMarcasManuales(idClase: number): Promise<boolean> {
    const cantidad = await clienteEnCurso(this.prisma).asistencias.count({
      where: { id_clase: idClase, id_usuario_registra: { not: null } },
    });
    return cantidad > 0;
  }

  // US-21: la PK (id_clase, id_alumno) deja intactos a los ya marcados y hace que cerrar dos veces
  // no duplique nada. id_usuario_registra queda NULL: lo registró el cierre, no una persona.
  async completarAusentes(
    idClase: number,
    inscriptos: InscriptoDeHorario[],
    fechaRegistro: Date,
  ): Promise<number> {
    if (inscriptos.length === 0) return 0;
    const { count } = await clienteEnCurso(this.prisma).asistencias.createMany({
      data: inscriptos.map(({ id_alumno, id_inscripcion }) => ({
        id_clase: idClase,
        id_alumno,
        id_inscripcion,
        asistio: false,
        id_usuario_registra: null,
        fecha_registro: fechaRegistro,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  // RN: Si una clase no tiene marcada ninguna asistencia debe pasarse a todos los alumnos como presentes.
  async completarPresentes(
    idClase: number,
    inscriptos: InscriptoDeHorario[],
    fechaRegistro: Date,
  ): Promise<number> {
    if (inscriptos.length === 0) return 0;
    const { count } = await clienteEnCurso(this.prisma).asistencias.createMany({
      data: inscriptos.map(({ id_alumno, id_inscripcion }) => ({
        id_clase: idClase,
        id_alumno,
        id_inscripcion,
        asistio: true,
        id_usuario_registra: null,
        fecha_registro: fechaRegistro,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  // Las clases se ordenan por su inicio (día y hora del horario): dos del mismo día no empatan. Las
  // ausencias que cuentan son las posteriores a la última clase a la que asistió, o todas si nunca asistió.
  async rachasDeInasistencia(idsInscripciones: number[]): Promise<Map<number, RachaDeInasistencia>> {
    if (idsInscripciones.length === 0) return new Map();
    const filas = await this.prisma.$queryRaw<({ id_inscripcion: number } & RachaDeInasistencia)[]>`
      WITH marcas AS (
        SELECT a.id_inscripcion, a.asistio, c.fecha_clase, c.fecha_clase + h.hora_inicio AS inicio
        FROM asistencias a
        JOIN clases c ON c.id_clase = a.id_clase
        JOIN horarios h ON h.id_horario = c.id_horario
        WHERE a.id_inscripcion IN (${Prisma.join(idsInscripciones)}) AND c.estado = 'DICTADA'
      ),
      ultima_asistencia AS (
        SELECT id_inscripcion, MAX(inicio) AS inicio, MAX(fecha_clase) AS fecha
        FROM marcas
        WHERE asistio
        GROUP BY id_inscripcion
      )
      SELECT m.id_inscripcion,
             (COUNT(*) FILTER (WHERE NOT m.asistio AND (u.inicio IS NULL OR m.inicio > u.inicio)))::int
               AS inasistencias_consecutivas,
             u.fecha AS fecha_ultima_asistencia
      FROM marcas m
      LEFT JOIN ultima_asistencia u ON u.id_inscripcion = m.id_inscripcion
      GROUP BY m.id_inscripcion, u.fecha`;
    return new Map(filas.map(({ id_inscripcion, ...racha }) => [id_inscripcion, racha]));
  }

  async buscarSeguimientos(idsInscripciones: number[]): Promise<Map<number, MarcaDeSeguimiento>> {
    const filas = await this.prisma.seguimientos_inactividad.findMany({
      where: { id_inscripcion: { in: idsInscripciones } },
      select: { id_inscripcion: true, estado: true, fecha_registro: true },
    });
    return new Map(filas.map(({ id_inscripcion, ...marca }) => [id_inscripcion, marca]));
  }

  // Cuándo se registró la última presencia de cada inscripción, en cualquier clase.
  async ultimasPresenciasRegistradas(idsInscripciones: number[]): Promise<Map<number, Date>> {
    const filas = await this.prisma.asistencias.groupBy({
      by: ["id_inscripcion"],
      where: { id_inscripcion: { in: idsInscripciones }, asistio: true },
      _max: { fecha_registro: true },
    });
    return new Map(
      filas.flatMap(({ id_inscripcion, _max }) =>
        _max.fecha_registro ? [[id_inscripcion, _max.fecha_registro] as const] : [],
      ),
    );
  }

  registrarSeguimiento(
    idInscripcion: number,
    estado: EstadoSeguimientoInactividad,
    idUsuario: number,
    fechaRegistro: Date,
  ): Promise<SeguimientoInactividad> {
    const marca = { estado, id_usuario_registra: idUsuario, fecha_registro: fechaRegistro };
    return this.prisma.seguimientos_inactividad.upsert({
      where: { id_inscripcion: idInscripcion },
      create: { id_inscripcion: idInscripcion, ...marca },
      update: marca,
    });
  }

  async quitarSeguimiento(idInscripcion: number): Promise<boolean> {
    const { count } = await this.prisma.seguimientos_inactividad.deleteMany({
      where: { id_inscripcion: idInscripcion },
    });
    return count > 0;
  }

  resumirPorAlumno(filtro: FiltroAsistenciasDictadas): Promise<AsistenciaDeAlumno[]> {
    return this.prisma.$queryRaw<AsistenciaDeAlumno[]>`
      SELECT al.id_alumno, al.id_usuario, al.id_usuario_responsable, al.estado, u.nombre, u.apellido,
             COUNT(*)::int AS clases_previstas,
             (COUNT(*) FILTER (WHERE a.asistio))::int AS clases_asistidas
      ${desdeAsistenciasDictadas(filtro, Prisma.sql`JOIN usuarios u ON u.id_usuario = al.id_usuario`)}
      GROUP BY al.id_alumno, u.id_usuario
      ORDER BY u.apellido, u.nombre, al.id_alumno`;
  }

  resumirPorProfesora(filtro: FiltroAsistenciasDictadas): Promise<AsistenciaDeProfesora[]> {
    return this.prisma.$queryRaw<AsistenciaDeProfesora[]>`
      SELECT p.id_profesora, u.nombre, u.apellido,
             COUNT(DISTINCT c.id_clase)::int AS clases_dictadas,
             COUNT(DISTINCT a.id_alumno)::int AS alumnos,
             COUNT(*)::int AS clases_previstas,
             (COUNT(*) FILTER (WHERE a.asistio))::int AS clases_asistidas
      ${desdeAsistenciasDictadas(
        filtro,
        Prisma.sql`JOIN profesoras p ON p.id_profesora = c.id_prof_dictante
                   JOIN usuarios u ON u.id_usuario = p.id_usuario`,
      )}
      GROUP BY p.id_profesora, u.id_usuario
      ORDER BY u.apellido, u.nombre, p.id_profesora`;
  }

  async historialDeAlumnos(idsAlumnos: number[]): Promise<Map<number, MarcaDeHistorial[]>> {
    if (idsAlumnos.length === 0) return new Map();
    const marcas = await this.prisma.asistencias.findMany({
      where: { id_alumno: { in: idsAlumnos }, clase: { estado: "DICTADA" } },
      select: {
        id_alumno: true,
        asistio: true,
        clase: { select: { fecha_clase: true, horario: { select: { hora_inicio: true } } } },
      },
      orderBy: [{ clase: { fecha_clase: "asc" } }, { clase: { horario: { hora_inicio: "asc" } } }],
    });
    return new Map(
      idsAlumnos.map((idAlumno) => [
        idAlumno,
        marcas
          .filter(({ id_alumno }) => id_alumno === idAlumno)
          .map(({ asistio, clase }) => ({
            asistio,
            inicio: instanteArgentino(clase.fecha_clase, clase.horario.hora_inicio),
          })),
      ]),
    );
  }

  // La profesora es la que dictó la clase, que con una suplencia no es la del horario.
  async historialDelAlumno(
    idAlumno: number,
    { asistio, limit, offset }: ConsultaHistorialAlumno,
  ): Promise<HistorialDelAlumno> {
    const deClasesDictadas = { id_alumno: idAlumno, clase: { estado: "DICTADA" as const } };
    const [marcas, conteos] = await Promise.all([
      this.prisma.asistencias.findMany({
        where: asistio === undefined ? deClasesDictadas : { ...deClasesDictadas, asistio },
        select: MARCA_DEL_HISTORIAL,
        orderBy: [{ clase: { fecha_clase: "desc" } }, { clase: { horario: { hora_inicio: "desc" } } }],
        skip: offset,
        take: limit,
      }),
      this.prisma.asistencias.groupBy({ by: ["asistio"], where: deClasesDictadas, _count: { _all: true } }),
    ]);
    const cuantas = (valor: boolean) => conteos.find((conteo) => conteo.asistio === valor)?._count._all ?? 0;
    const presentes = cuantas(true);
    const ausentes = cuantas(false);
    return {
      datos: marcas.map(aMarcaDelAlumno),
      total: asistio === undefined ? presentes + ausentes : asistio ? presentes : ausentes,
      presentes,
      ausentes,
    };
  }
}
