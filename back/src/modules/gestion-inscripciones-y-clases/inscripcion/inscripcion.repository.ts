import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
} from "./inscripcion.schemas.js";
import {
  INCLUIR_DATOS_COBRO,
  INCLUIR_DATOS_INSCRIPCION,
  type InscripcionACobrar,
  type FechasDeBaja,
  type FiltroAlumnosPorInscripcion,
  type FiltroInscripciones,
  type InscripcionConDatos,
  type ResumenInscripcionAlumno,
} from "./inscripcion.types.js";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";

const ESTADOS_VIGENTES = ["PREINSCRIPTA", "ACTIVA"] as const;

type Transaccion = Prisma.TransactionClient;
type DatosNuevaInscripcion = Pick<
  CrearInscripcionInput,
  | "id_alumno"
  | "id_plan"
  | "id_profesora"
  | "sin_cargo"
  | "fecha_inicio"
  | "fecha_fin_estimado"
  | "observaciones"
> & { fecha_inicio: Date; id_plan_precio: number; estado: "PREINSCRIPTA" | "ACTIVA" };
type ResultadoOperacion =
  | { resultado: "ok"; inscripcion: InscripcionConDatos }
  | { resultado: "plan-duplicado" }
  | { resultado: "sin-cupo" }
  | { resultado: "no-vigente" };

async function bloquearRecursos(transaccion: Transaccion, claves: string[]): Promise<void> {
  for (const clave of [...new Set(claves)].sort()) {
    await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
  }
}

function clavesDeInscripcion(idAlumno: number, idsHorarios: number[], idPlan?: number): string[] {
  return [
    ...(idPlan === undefined ? [] : [`inscripcion-plan:${idAlumno}:${idPlan}`]),
    ...idsHorarios.map((idHorario) => `inscripcion-horario:${idHorario}`),
  ];
}

async function obtenerCupos(
  transaccion: Transaccion,
  idsHorarios: number[],
): Promise<Map<number, number | null> | null> {
  const horarios = await transaccion.horarios.findMany({
    where: { id_horario: { in: idsHorarios }, fecha_baja: null },
    select: {
      id_horario: true,
      cupo_maximo: true,
      actividad: { select: { cupo_maximo: true, activo: true } },
    },
  });
  if (horarios.length !== idsHorarios.length || horarios.some(({ actividad }) => !actividad.activo)) {
    return null;
  }

  return new Map(
    horarios.map(({ id_horario, cupo_maximo, actividad }) => [
      id_horario,
      cupo_maximo ?? actividad.cupo_maximo,
    ]),
  );
}

async function hayCupo(
  transaccion: Transaccion,
  idsHorarios: number[],
  excluirInscripcion?: number,
): Promise<boolean> {
  const cupos = await obtenerCupos(transaccion, idsHorarios);
  if (!cupos) return false;
  const ocupacion = await transaccion.inscripcion_horarios.groupBy({
    by: ["id_horario"],
    where: {
      id_horario: { in: idsHorarios },
      fecha_hasta: null,
      inscripcion: {
        estado: { in: [...ESTADOS_VIGENTES] },
        ...(excluirInscripcion === undefined ? {} : { id_inscripcion: { not: excluirInscripcion } }),
      },
    },
    _count: { id_horario: true },
  });
  const cantidadPorHorario = new Map(
    ocupacion.map(({ id_horario, _count }) => [id_horario, _count.id_horario]),
  );

  return idsHorarios.every((idHorario) => {
    const cupo = cupos.get(idHorario);
    return cupo !== undefined && (cupo === null || (cantidadPorHorario.get(idHorario) ?? 0) < cupo);
  });
}

function mapearDatosDeCreacion(
  input: DatosNuevaInscripcion,
  estado: "PREINSCRIPTA" | "ACTIVA",
): Prisma.inscripcionesUncheckedCreateInput {
  return {
    id_alumno: input.id_alumno,
    id_plan: input.id_plan,
    id_plan_precio: input.id_plan_precio,
    id_profesora: input.id_profesora,
    sin_cargo: input.sin_cargo,
    fecha_inicio: input.fecha_inicio,
    fecha_fin_estimado: input.fecha_fin_estimado,
    observaciones: input.observaciones,
    estado,
  };
}

export class InscripcionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorId(id: number): Promise<InscripcionConDatos | null> {
    return this.prisma.inscripciones.findUnique({
      where: { id_inscripcion: id },
      include: INCLUIR_DATOS_INSCRIPCION,
    });
  }

  buscarParaCobro(id: number): Promise<InscripcionACobrar | null> {
    return this.prisma.inscripciones.findUnique({
      where: { id_inscripcion: id },
      include: INCLUIR_DATOS_COBRO,
    });
  }

  listar(filtro: FiltroInscripciones): Promise<InscripcionConDatos[]> {
    return this.prisma.inscripciones.findMany({
      where: {
        ...(filtro.id_alumno === undefined ? {} : { id_alumno: filtro.id_alumno }),
        ...(filtro.id_plan === undefined ? {} : { id_plan: filtro.id_plan }),
        ...(filtro.id_profesora === undefined ? {} : { id_profesora: filtro.id_profesora }),
        ...(filtro.estado === undefined ? {} : { estado: filtro.estado }),
        ...(filtro.id_actividad === undefined
          ? {}
          : {
              horarios: {
                some: { fecha_hasta: null, horario: { id_actividad: filtro.id_actividad } },
              },
            }),
      },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: [{ fecha_alta: "desc" }, { id_inscripcion: "desc" }],
      take: filtro.limit ?? LIMITE_MAXIMO,
      skip: filtro.offset ?? 0,
    });
  }

  async crear(input: DatosNuevaInscripcion, idsHorarios: number[], fecha: Date): Promise<ResultadoOperacion> {
    return this.prisma.$transaction(async (transaccion) => {
      await bloquearRecursos(transaccion, clavesDeInscripcion(input.id_alumno, idsHorarios, input.id_plan));
      const duplicada = await transaccion.inscripciones.findFirst({
        where: {
          id_alumno: input.id_alumno,
          id_plan: input.id_plan,
          estado: { in: [...ESTADOS_VIGENTES] },
        },
        select: { id_inscripcion: true },
      });
      if (duplicada) return { resultado: "plan-duplicado" };
      if (!(await hayCupo(transaccion, idsHorarios))) return { resultado: "sin-cupo" };

      const inscripcion = await transaccion.inscripciones.create({
        data: {
          ...mapearDatosDeCreacion(input, input.estado),
          fecha_inicio: input.fecha_inicio,
          horarios: {
            create: idsHorarios.map((id_horario) => ({ id_horario, fecha_desde: fecha })),
          },
        },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      return { resultado: "ok", inscripcion };
    });
  }

  listarVigentesPorAlumno(idAlumno: number): Promise<InscripcionConDatos[]> {
    return this.prisma.inscripciones.findMany({
      where: { id_alumno: idAlumno, estado: { in: [...ESTADOS_VIGENTES] } },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
    });
  }

  async buscarVigentePorAlumno(idAlumno: number): Promise<InscripcionConDatos | null> {
    return this.prisma.inscripciones.findFirst({
      where: { id_alumno: idAlumno, estado: { in: [...ESTADOS_VIGENTES] } },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
    });
  }

  async activar(id: number): Promise<ResultadoOperacion> {
    const actual = await this.buscarPorId(id);
    if (!actual) return { resultado: "no-vigente" };

    return this.prisma.$transaction(async (transaccion) => {
      const idsHorarios = actual.horarios
        .filter(({ fecha_hasta }) => fecha_hasta === null)
        .map(({ id_horario }) => id_horario);
      await bloquearRecursos(transaccion, clavesDeInscripcion(actual.id_alumno, idsHorarios, actual.id_plan));
      const vigente = await transaccion.inscripciones.findUnique({
        where: { id_inscripcion: id },
        select: { estado: true },
      });
      if (!vigente || vigente.estado === "BAJA") return { resultado: "no-vigente" };
      if (!(await hayCupo(transaccion, idsHorarios, id))) return { resultado: "sin-cupo" };

      const inscripcion = await transaccion.inscripciones.update({
        where: { id_inscripcion: id },
        data: { estado: "ACTIVA" },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      return { resultado: "ok", inscripcion };
    });
  }

  async darDeBajaAlumno(
    idAlumno: number,
    input: DarDeBajaAlumnoInput,
    fechas: FechasDeBaja,
  ): Promise<number[]> {
    return this.prisma.$transaction(async (transaccion) => {
      const vigentes = await transaccion.inscripciones.findMany({
        where: { id_alumno: idAlumno, estado: { in: [...ESTADOS_VIGENTES] } },
        select: {
          id_inscripcion: true,
          horarios: {
            where: { fecha_hasta: null },
            select: { id_horario: true },
          },
        },
      });
      const idsHorarios = vigentes.flatMap((inscripcion) =>
        inscripcion.horarios.map(({ id_horario }) => id_horario),
      );
      await bloquearRecursos(transaccion, clavesDeInscripcion(idAlumno, idsHorarios));
      const idsInscripciones = vigentes.map(({ id_inscripcion }) => id_inscripcion);
      if (idsInscripciones.length === 0) return [];

      await transaccion.inscripciones.updateMany({
        where: { id_inscripcion: { in: idsInscripciones } },
        data: { estado: "BAJA", motivo_baja: input.motivo_baja, fecha_baja: fechas.instante },
      });
      await transaccion.inscripcion_horarios.updateMany({
        where: { id_inscripcion: { in: idsInscripciones }, fecha_hasta: null },
        data: { fecha_hasta: fechas.dia },
      });
      return idsInscripciones;
    });
  }

  async reactivar(
    input: DatosNuevaInscripcion,
    idsHorarios: number[],
    fecha: Date,
  ): Promise<ResultadoOperacion> {
    return this.prisma.$transaction(async (transaccion) => {
      await bloquearRecursos(transaccion, clavesDeInscripcion(input.id_alumno, idsHorarios, input.id_plan));
      const existente = await transaccion.inscripciones.findFirst({
        where: {
          id_alumno: input.id_alumno,
          estado: "ACTIVA",
        },
        orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      if (existente) return { resultado: "ok", inscripcion: existente };
      if (!(await hayCupo(transaccion, idsHorarios))) return { resultado: "sin-cupo" };
      const inscripcion = await transaccion.inscripciones.create({
        data: {
          ...mapearDatosDeCreacion(input, "ACTIVA"),
          fecha_inicio: input.fecha_inicio,
          horarios: {
            create: idsHorarios.map((id_horario) => ({ id_horario, fecha_desde: fecha })),
          },
        },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      return { resultado: "ok", inscripcion };
    });
  }

  async cambiarPlan(
    actual: InscripcionConDatos,
    nuevoPlan: Omit<CambiarPlanInput, "fecha_inicio">,
    idPlanPrecio: number,
    fechas: FechasDeBaja,
  ): Promise<ResultadoOperacion> {
    const { dia } = fechas;
    const idsHorarios = nuevoPlan.ids_horarios;
    const horariosAnteriores = actual.horarios
      .filter(({ fecha_hasta }) => fecha_hasta === null)
      .map(({ id_horario }) => id_horario);
    return this.prisma.$transaction(async (transaccion) => {
      await bloquearRecursos(
        transaccion,
        clavesDeInscripcion(actual.id_alumno, [...horariosAnteriores, ...idsHorarios], actual.id_plan).concat(
          `inscripcion-plan:${actual.id_alumno}:${nuevoPlan.id_plan}`,
        ),
      );
      const vigente = await transaccion.inscripciones.findUnique({
        where: { id_inscripcion: actual.id_inscripcion },
        select: { estado: true },
      });
      if (!vigente || vigente.estado === "BAJA") return { resultado: "no-vigente" };
      const duplicada = await transaccion.inscripciones.findFirst({
        where: {
          id_alumno: actual.id_alumno,
          id_plan: nuevoPlan.id_plan,
          estado: { in: [...ESTADOS_VIGENTES] },
          id_inscripcion: { not: actual.id_inscripcion },
        },
        select: { id_inscripcion: true },
      });
      if (duplicada) return { resultado: "plan-duplicado" };
      if (!(await hayCupo(transaccion, idsHorarios, actual.id_inscripcion))) {
        return { resultado: "sin-cupo" };
      }

      await transaccion.inscripciones.update({
        where: { id_inscripcion: actual.id_inscripcion },
        data: { estado: "BAJA", motivo_baja: "CAMBIO_PLAN", fecha_baja: fechas.instante },
      });
      await transaccion.inscripcion_horarios.updateMany({
        where: { id_inscripcion: actual.id_inscripcion, fecha_hasta: null },
        data: { fecha_hasta: dia },
      });
      const nueva = await transaccion.inscripciones.create({
        data: {
          id_alumno: actual.id_alumno,
          id_plan: nuevoPlan.id_plan,
          id_plan_precio: idPlanPrecio,
          id_profesora: nuevoPlan.id_profesora,
          sin_cargo: nuevoPlan.sin_cargo,
          fecha_inicio: dia,
          fecha_fin_estimado: nuevoPlan.fecha_fin_estimado,
          observaciones: nuevoPlan.observaciones,
          estado: vigente.estado,
          horarios: { create: idsHorarios.map((id_horario) => ({ id_horario, fecha_desde: dia })) },
        },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      return { resultado: "ok", inscripcion: nueva };
    });
  }

  async actualizarHorarios(
    actual: InscripcionConDatos,
    input: ActualizarHorariosInput,
    fecha: Date,
  ): Promise<ResultadoOperacion> {
    const horariosAnteriores = actual.horarios
      .filter(({ fecha_hasta }) => fecha_hasta === null)
      .map(({ id_horario }) => id_horario);
    return this.prisma.$transaction(async (transaccion) => {
      await bloquearRecursos(
        transaccion,
        clavesDeInscripcion(actual.id_alumno, [...horariosAnteriores, ...input.ids_horarios]),
      );
      const vigente = await transaccion.inscripciones.findUnique({
        where: { id_inscripcion: actual.id_inscripcion },
        select: { estado: true },
      });
      if (!vigente || vigente.estado === "BAJA") return { resultado: "no-vigente" };
      if (!(await hayCupo(transaccion, input.ids_horarios, actual.id_inscripcion))) {
        return { resultado: "sin-cupo" };
      }

      const salen = horariosAnteriores.filter((idHorario) => !input.ids_horarios.includes(idHorario));
      const entran = input.ids_horarios.filter((idHorario) => !horariosAnteriores.includes(idHorario));
      await transaccion.inscripcion_horarios.updateMany({
        where: { id_inscripcion: actual.id_inscripcion, id_horario: { in: salen }, fecha_hasta: null },
        data: { fecha_hasta: fecha },
      });
      await this.agregarHorarios(transaccion, actual.id_inscripcion, entran, fecha);

      const inscripcion = await transaccion.inscripciones.findUniqueOrThrow({
        where: { id_inscripcion: actual.id_inscripcion },
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      return { resultado: "ok", inscripcion };
    });
  }

  async obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]> {
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        estado: { in: [...ESTADOS_VIGENTES] },
        alumno: { estado: { not: "BAJA" } },
        ...(filtro.id_plan === undefined ? {} : { id_plan: filtro.id_plan }),
        ...(filtro.id_profesora === undefined ? {} : { id_profesora: filtro.id_profesora }),
        ...(filtro.id_actividad === undefined
          ? {}
          : {
              horarios: {
                some: { fecha_hasta: null, horario: { id_actividad: filtro.id_actividad } },
              },
            }),
      },
      select: { id_alumno: true },
      distinct: ["id_alumno"],
    });
    return filas.map(({ id_alumno }) => id_alumno);
  }

  async resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]> {
    if (idsAlumnos.length === 0) return [];
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        id_alumno: { in: idsAlumnos },
        estado: { in: [...ESTADOS_VIGENTES] },
        alumno: { estado: { not: "BAJA" } },
        horarios: { some: { fecha_hasta: null } },
      },
      select: {
        id_alumno: true,
        id_inscripcion: true,
        estado: true,
        id_plan: true,
        plan: { select: { nombre: true } },
        id_profesora: true,
        profesora: { select: { usuario: { select: { nombre: true, apellido: true } } } },
        horarios: { where: { fecha_hasta: null }, select: { id_horario: true } },
      },
      orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
    });
    const resumenPorAlumno = new Map<number, ResumenInscripcionAlumno>();
    for (const fila of filas) {
      if (resumenPorAlumno.has(fila.id_alumno)) continue;
      resumenPorAlumno.set(fila.id_alumno, {
        id_alumno: fila.id_alumno,
        id_inscripcion: fila.id_inscripcion,
        estado: fila.estado,
        id_plan: fila.id_plan,
        nombre_plan: fila.plan.nombre,
        id_profesora: fila.id_profesora,
        nombre_profesora: `${fila.profesora.usuario.nombre} ${fila.profesora.usuario.apellido}`,
        ids_horarios: fila.horarios.map(({ id_horario }) => id_horario),
      });
    }
    return [...resumenPorAlumno.values()];
  }

  async contarInscriptosVigentes(idsHorarios: number[]): Promise<Map<number, number>> {
    if (idsHorarios.length === 0) return new Map();
    const filas = await this.prisma.inscripcion_horarios.groupBy({
      by: ["id_horario"],
      where: {
        id_horario: { in: idsHorarios },
        fecha_hasta: null,
        inscripcion: { estado: { in: [...ESTADOS_VIGENTES] }, alumno: { estado: { not: "BAJA" } } },
      },
      _count: { id_horario: true },
    });
    return new Map(filas.map(({ id_horario, _count }) => [id_horario, _count.id_horario]));
  }

  private async agregarHorarios(
    transaccion: Transaccion,
    idInscripcion: number,
    idsHorarios: number[],
    fecha: Date,
  ): Promise<void> {
    for (const idHorario of idsHorarios) {
      const existente = await transaccion.inscripcion_horarios.findUnique({
        where: { id_inscripcion_id_horario: { id_inscripcion: idInscripcion, id_horario: idHorario } },
        select: { fecha_hasta: true },
      });
      if (existente) {
        await transaccion.inscripcion_horarios.update({
          where: { id_inscripcion_id_horario: { id_inscripcion: idInscripcion, id_horario: idHorario } },
          data: { fecha_desde: fecha, fecha_hasta: null },
        });
      } else {
        await transaccion.inscripcion_horarios.create({
          data: { id_inscripcion: idInscripcion, id_horario: idHorario, fecha_desde: fecha },
        });
      }
    }
  }
}
