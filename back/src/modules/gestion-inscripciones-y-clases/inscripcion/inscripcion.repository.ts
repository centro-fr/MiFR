import { Prisma, type PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
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
  type FiltroInscripcionesParaInactividad,
  type InscripcionACargo,
  type InscripcionGuardada,
  type InscripcionParaInactividad,
  type InscriptoDeHorario,
  type ResumenInscripcionAlumno,
} from "./inscripcion.types.js";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";
import { rangoDeDiasArgentinos } from "../../../shared/utils/fecha-argentina.js";

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
> & {
  fecha_inicio: Date;
  id_plan_precio: number;
  id_promocion: number | null;
  estado: "PREINSCRIPTA" | "ACTIVA";
};
type ResultadoOperacion =
  | { resultado: "ok"; inscripcion: InscripcionGuardada }
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

// Quién está en una clase (US-20, US-21): el horario vigente ese día, la inscripción activa y el
// alumno no dado de baja. Un pre-inscripto no figura: todavía no pagó y no habilita a asistir (US-07),
// así que tampoco se le marca asistencia ni se le registra una falta (decidido el 12/10/2026).
function inscriptosVigentesEl(fecha: Date) {
  return {
    fecha_desde: { lte: fecha },
    OR: [{ fecha_hasta: null }, { fecha_hasta: { gte: fecha } }],
    inscripcion: { estado: "ACTIVA" as const, alumno: { estado: { not: "BAJA" as const } } },
  } satisfies Prisma.inscripcion_horariosWhereInput;
}

function inscriptosDeHorarioEl(idHorario: number, fecha: Date) {
  return { id_horario: idHorario, ...inscriptosVigentesEl(fecha) };
}

const SELECCION_INSCRIPTO = {
  inscripcion: {
    select: {
      id_inscripcion: true,
      id_alumno: true,
      alumno: { select: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  },
} satisfies Prisma.inscripcion_horariosSelect;

// Mismo bloqueo que toman el alta, la baja y el cambio de horarios: lo que la asistencia lee para
// escribir no cambia hasta que termine.
async function bloquearHorario(transaccion: Transaccion, idHorario: number): Promise<void> {
  await bloquearRecursos(transaccion, [`inscripcion-horario:${idHorario}`]);
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

// Una pre-inscripción guarda su lugar hasta DIAS_RESERVA_PREINSCRIPCION días después de su inicio. Pasado
// ese plazo sin el primer pago, sigue vigente pero deja de ocupar cupo: el lugar queda para otro alumno y,
// si paga después, el alta vuelve a pedir cupo. inicioReservas es el inicio más viejo que todavía reserva.
function ocupanLugar(inicioReservas: Date): Prisma.inscripcionesWhereInput {
  return {
    OR: [{ estado: "ACTIVA" }, { estado: "PREINSCRIPTA", fecha_inicio: { gte: inicioReservas } }],
  };
}

async function contarLugaresOcupados(
  cliente: Transaccion,
  idsHorarios: number[],
  inicioReservas: Date,
  excluirInscripcion?: number,
): Promise<Map<number, number>> {
  const ocupacion = await cliente.inscripcion_horarios.groupBy({
    by: ["id_horario"],
    where: {
      id_horario: { in: idsHorarios },
      fecha_hasta: null,
      inscripcion: {
        ...ocupanLugar(inicioReservas),
        ...(excluirInscripcion === undefined ? {} : { id_inscripcion: { not: excluirInscripcion } }),
      },
    },
    _count: { id_horario: true },
  });
  return new Map(ocupacion.map(({ id_horario, _count }) => [id_horario, _count.id_horario]));
}

async function hayCupo(
  transaccion: Transaccion,
  idsHorarios: number[],
  inicioReservas: Date,
  excluirInscripcion?: number,
): Promise<boolean> {
  const cupos = await obtenerCupos(transaccion, idsHorarios);
  if (!cupos) return false;
  const cantidadPorHorario = await contarLugaresOcupados(
    transaccion,
    idsHorarios,
    inicioReservas,
    excluirInscripcion,
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
    id_promocion: input.id_promocion,
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

  buscarPorId(id: number): Promise<InscripcionGuardada | null> {
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

  listar(filtro: FiltroInscripciones): Promise<InscripcionGuardada[]> {
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

  async crear(
    input: DatosNuevaInscripcion,
    idsHorarios: number[],
    fecha: Date,
    inicioReservas: Date,
  ): Promise<ResultadoOperacion> {
    return enTransaccion(this.prisma, async (transaccion) => {
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
      if (!(await hayCupo(transaccion, idsHorarios, inicioReservas))) return { resultado: "sin-cupo" };

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

  listarVigentesPorAlumno(idAlumno: number): Promise<InscripcionGuardada[]> {
    return this.prisma.inscripciones.findMany({
      where: { id_alumno: idAlumno, estado: { in: [...ESTADOS_VIGENTES] } },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
    });
  }

  // La baja del alumno cierra todas sus inscripciones vigentes en el mismo instante: las de la última
  // baja son las que comparten su fecha_baja.
  async listarDeLaUltimaBaja(idAlumno: number): Promise<InscripcionGuardada[]> {
    const deBaja = {
      id_alumno: idAlumno,
      estado: "BAJA" as const,
      motivo_baja: { not: "CAMBIO_PLAN" as const },
    };
    const ultima = await this.prisma.inscripciones.findFirst({
      where: deBaja,
      orderBy: { fecha_baja: "desc" },
      select: { fecha_baja: true },
    });
    if (!ultima?.fecha_baja) return [];
    return this.prisma.inscripciones.findMany({
      where: { ...deBaja, fecha_baja: ultima.fecha_baja },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: { id_inscripcion: "asc" },
    });
  }

  listarParaAsistencia(idHorario: number, fecha: Date): Promise<InscriptoDeHorario[]> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearHorario(transaccion, idHorario);
      const filas = await transaccion.inscripcion_horarios.findMany({
        where: inscriptosDeHorarioEl(idHorario, fecha),
        select: SELECCION_INSCRIPTO,
        orderBy: [
          { inscripcion: { alumno: { usuario: { apellido: "asc" } } } },
          { inscripcion: { alumno: { usuario: { nombre: "asc" } } } },
        ],
      });
      return filas.map(({ inscripcion }) => inscripcion);
    });
  }

  buscarParaAsistencia(idHorario: number, idAlumno: number, fecha: Date): Promise<InscriptoDeHorario | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearHorario(transaccion, idHorario);
      const base = inscriptosDeHorarioEl(idHorario, fecha);
      const fila = await transaccion.inscripcion_horarios.findFirst({
        where: { ...base, inscripcion: { ...base.inscripcion, id_alumno: idAlumno } },
        select: SELECCION_INSCRIPTO,
      });
      return fila?.inscripcion ?? null;
    });
  }

  async buscarVigentePorAlumno(idAlumno: number): Promise<InscripcionGuardada | null> {
    return this.prisma.inscripciones.findFirst({
      where: { id_alumno: idAlumno, estado: { in: [...ESTADOS_VIGENTES] } },
      include: INCLUIR_DATOS_INSCRIPCION,
      orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
    });
  }

  async activar(id: number, inicioReservas: Date): Promise<ResultadoOperacion> {
    const actual = await this.buscarPorId(id);
    if (!actual) return { resultado: "no-vigente" };

    return enTransaccion(this.prisma, async (transaccion) => {
      const idsHorarios = actual.horarios
        .filter(({ fecha_hasta }) => fecha_hasta === null)
        .map(({ id_horario }) => id_horario);
      await bloquearRecursos(transaccion, clavesDeInscripcion(actual.id_alumno, idsHorarios, actual.id_plan));
      const vigente = await transaccion.inscripciones.findUnique({
        where: { id_inscripcion: id },
        select: { estado: true },
      });
      if (!vigente || vigente.estado === "BAJA") return { resultado: "no-vigente" };
      if (!(await hayCupo(transaccion, idsHorarios, inicioReservas, id))) return { resultado: "sin-cupo" };

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
    return enTransaccion(this.prisma, async (transaccion) => {
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
        data: {
          estado: "BAJA",
          motivo_baja: input.motivo_baja,
          detalle_baja: input.detalle_baja ?? null,
          fecha_baja: fechas.instante,
        },
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
    inicioReservas: Date,
  ): Promise<ResultadoOperacion> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearRecursos(transaccion, clavesDeInscripcion(input.id_alumno, idsHorarios, input.id_plan));
      // Dos reactivaciones a la vez: la segunda devuelve la inscripción que dejó la primera.
      const existente = await transaccion.inscripciones.findFirst({
        where: {
          id_alumno: input.id_alumno,
          estado: { in: [...ESTADOS_VIGENTES] },
        },
        orderBy: [{ fecha_inicio: "desc" }, { id_inscripcion: "desc" }],
        include: INCLUIR_DATOS_INSCRIPCION,
      });
      if (existente) return { resultado: "ok", inscripcion: existente };
      if (!(await hayCupo(transaccion, idsHorarios, inicioReservas))) return { resultado: "sin-cupo" };
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

  async cambiarPlan(
    actual: InscripcionGuardada,
    nuevoPlan: Omit<CambiarPlanInput, "fecha_inicio">,
    precio: { id_plan_precio: number; id_promocion: number | null },
    fechas: FechasDeBaja,
    inicioReservas: Date,
  ): Promise<ResultadoOperacion> {
    const { dia } = fechas;
    const idsHorarios = nuevoPlan.ids_horarios;
    const horariosAnteriores = actual.horarios
      .filter(({ fecha_hasta }) => fecha_hasta === null)
      .map(({ id_horario }) => id_horario);
    return enTransaccion(this.prisma, async (transaccion) => {
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
      if (!(await hayCupo(transaccion, idsHorarios, inicioReservas, actual.id_inscripcion))) {
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
      // Una pre-inscripción conserva su inicio: si empezara hoy, cambiar de plan renovaría la reserva de cupo.
      const fechaInicio = vigente.estado === "PREINSCRIPTA" ? actual.fecha_inicio : dia;
      const nueva = await transaccion.inscripciones.create({
        data: {
          id_alumno: actual.id_alumno,
          id_plan: nuevoPlan.id_plan,
          id_plan_precio: precio.id_plan_precio,
          id_promocion: precio.id_promocion,
          id_profesora: nuevoPlan.id_profesora,
          sin_cargo: nuevoPlan.sin_cargo,
          fecha_inicio: fechaInicio,
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
    actual: InscripcionGuardada,
    input: ActualizarHorariosInput,
    fecha: Date,
    inicioReservas: Date,
  ): Promise<ResultadoOperacion> {
    const horariosAnteriores = actual.horarios
      .filter(({ fecha_hasta }) => fecha_hasta === null)
      .map(({ id_horario }) => id_horario);
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearRecursos(
        transaccion,
        clavesDeInscripcion(actual.id_alumno, [...horariosAnteriores, ...input.ids_horarios]),
      );
      const vigente = await transaccion.inscripciones.findUnique({
        where: { id_inscripcion: actual.id_inscripcion },
        select: { estado: true },
      });
      if (!vigente || vigente.estado === "BAJA") return { resultado: "no-vigente" };
      if (!(await hayCupo(transaccion, input.ids_horarios, inicioReservas, actual.id_inscripcion))) {
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

  async contarInscriptosParaAsistencia(idsHorarios: number[], fecha: Date): Promise<Map<number, number>> {
    if (idsHorarios.length === 0) return new Map();
    const filas = await this.prisma.inscripcion_horarios.groupBy({
      by: ["id_horario"],
      where: { id_horario: { in: idsHorarios }, ...inscriptosVigentesEl(fecha) },
      _count: { id_horario: true },
    });
    return new Map(filas.map(({ id_horario, _count }) => [id_horario, _count.id_horario]));
  }

  // Lugares ocupados por horario con la misma regla que el alta: es lo que muestra la ocupación (US-04).
  async contarLugaresOcupados(idsHorarios: number[], inicioReservas: Date): Promise<Map<number, number>> {
    if (idsHorarios.length === 0) return new Map();
    return contarLugaresOcupados(this.prisma, idsHorarios, inicioReservas);
  }

  // Sin tope: crece con las inscripciones de un mes, no con el historial.
  aCargoEnPeriodo(desde: Date, hasta: Date): Promise<InscripcionACargo[]> {
    return this.prisma.inscripciones.findMany({
      where: {
        estado: { in: ["ACTIVA", "BAJA"] },
        fecha_inicio: { lte: hasta },
        OR: [{ fecha_baja: null }, { fecha_baja: { gte: rangoDeDiasArgentinos(desde).inicio } }],
      },
      select: {
        id_inscripcion: true,
        id_alumno: true,
        id_profesora: true,
        id_plan: true,
        sin_cargo: true,
        estado: true,
        fecha_inicio: true,
        fecha_baja: true,
      },
      orderBy: [{ id_profesora: "asc" }, { id_inscripcion: "asc" }],
    });
  }

  // Sin tope: crece con los alumnos activos, no con el historial. Quien lista pagina después de calcular
  // las rachas, que no están en la base.
  async listarParaInactividad(
    filtro: FiltroInscripcionesParaInactividad,
  ): Promise<InscripcionParaInactividad[]> {
    const nombre = { select: { nombre: true, apellido: true } } as const;
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        estado: "ACTIVA",
        plan: { tipo: "MENSUAL" },
        alumno: { estado: { not: "BAJA" } },
        ...(filtro.id_inscripcion === undefined ? {} : { id_inscripcion: filtro.id_inscripcion }),
        ...(filtro.id_profesora === undefined ? {} : { id_profesora: filtro.id_profesora }),
        ...(filtro.id_plan === undefined ? {} : { id_plan: filtro.id_plan }),
      },
      select: {
        id_inscripcion: true,
        id_alumno: true,
        plan: { select: { id_plan: true, nombre: true } },
        profesora: { select: { id_profesora: true, usuario: nombre } },
      },
      orderBy: { id_inscripcion: "asc" },
    });
    return filas.map(({ profesora, ...inscripcion }) => ({
      ...inscripcion,
      profesora: { id_profesora: profesora.id_profesora, ...profesora.usuario },
    }));
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

  // US-36: cantidad de inscripciones activas agrupadas por plan de alumnos no dados de baja.
  async contarActivasPorPlan(filtro?: {
    id_profesora?: number;
    id_actividad?: number;
  }): Promise<Map<number, number>> {
    const agrupados = await this.prisma.inscripciones.groupBy({
      by: ["id_plan"],
      where: {
        estado: "ACTIVA",
        alumno: { estado: { not: "BAJA" } },
        ...(filtro?.id_profesora !== undefined ? { id_profesora: filtro.id_profesora } : {}),
        ...(filtro?.id_actividad !== undefined
          ? { plan: { id_actividad_exclusiva: filtro.id_actividad } }
          : {}),
      },
      _count: { id_inscripcion: true },
    });
    return new Map(agrupados.map((g) => [g.id_plan, g._count.id_inscripcion]));
  }
}
