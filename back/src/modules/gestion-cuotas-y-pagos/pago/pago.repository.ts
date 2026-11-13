import type { pagos, Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaSql } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type {
  CobroEnEfectivo,
  CuotaAGuardar,
  DatosDePago,
  EstadoPago,
  FiltroCobranzaRepositorio,
  FiltroEfectivoEnInstantes,
  FiltroTransferenciasEnInstantes,
  MotivoSinRendir,
  OrdenTransferencias,
  Pago,
  PagoConCuota,
  PagoParaComprobante,
  ResultadoCobranza,
  TotalDeProfesora,
  TransferenciaConAlumno,
  TransferenciaParaRevisar,
} from "./pago.types.js";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";

type Transaccion = Prisma.TransactionClient;

const CON_ALUMNO = {
  cuota: {
    select: {
      inscripcion: {
        select: {
          alumno: { select: { id_alumno: true, usuario: { select: { nombre: true, apellido: true } } } },
        },
      },
    },
  },
} satisfies Prisma.pagosInclude;

type FilaConAlumno = Prisma.pagosGetPayload<{ include: typeof CON_ALUMNO }>;

// US-17: lo que necesita la propietaria para revisar una transferencia. Propio del listado, para no
// sumarle el plan y la cuota a mis-transferencias (seguridad.md, regla 9).
const PARA_REVISAR = {
  cuota: {
    select: {
      id_inscripcion: true,
      numero_cuota: true,
      monto: true,
      inscripcion: {
        select: {
          plan: { select: { nombre: true, tipo: true } },
          alumno: { select: { id_alumno: true, usuario: { select: { nombre: true, apellido: true } } } },
        },
      },
    },
  },
} satisfies Prisma.pagosInclude;

function transferenciasDelFiltro(filtro: FiltroTransferenciasEnInstantes): Prisma.pagosWhereInput {
  return {
    forma_pago: "TRANSFERENCIA",
    ...(filtro.estado === undefined ? {} : { estado: filtro.estado }),
    ...(filtro.id_alumno === undefined ? {} : { cuota: { inscripcion: { id_alumno: filtro.id_alumno } } }),
    ...(filtro.inicio || filtro.fin
      ? {
          fecha_pago: { ...(filtro.inicio && { gte: filtro.inicio }), ...(filtro.fin && { lt: filtro.fin }) },
        }
      : {}),
  };
}

// US-19: lo único que se rinde es el efectivo confirmado que cobró una profesora. Lo que cobra la
// propietaria nace rendido.
const EFECTIVO_DE_PROFESORA = {
  forma_pago: "EFECTIVO",
  estado: "CONFIRMADO",
  id_profesora_cobra: { not: null },
} satisfies Prisma.pagosWhereInput;

const DATOS_DEL_COBRO = {
  cuota: {
    select: {
      numero_cuota: true,
      fecha_vencimiento: true,
      inscripcion: {
        select: {
          plan: { select: { nombre: true } },
          alumno: { select: { id_alumno: true, usuario: { select: { nombre: true, apellido: true } } } },
        },
      },
    },
  },
  profesora_cobra: { select: { id_profesora: true, usuario: { select: { nombre: true, apellido: true } } } },
} satisfies Prisma.pagosInclude;

type FilaDeCobro = Prisma.pagosGetPayload<{ include: typeof DATOS_DEL_COBRO }>;

function aCobro({ cuota, profesora_cobra, ...fila }: FilaDeCobro): CobroEnEfectivo {
  const { alumno, plan } = cuota.inscripcion;
  // EFECTIVO_DE_PROFESORA garantiza que la profesora está.
  const profesora = profesora_cobra as NonNullable<FilaDeCobro["profesora_cobra"]>;
  return {
    id_pago: fila.id_pago,
    monto: fila.monto.toNumber(),
    fecha_pago: fila.fecha_pago,
    fecha_rendicion: fila.fecha_rendicion,
    alumno: { id_alumno: alumno.id_alumno, ...alumno.usuario },
    plan: plan.nombre,
    cuota: { numero: cuota.numero_cuota, vencimiento: cuota.fecha_vencimiento },
    profesora: { id_profesora: profesora.id_profesora, ...profesora.usuario },
  };
}

function conFiltro(
  filtro: FiltroEfectivoEnInstantes,
  fecha: "fecha_pago" | "fecha_rendicion",
): Prisma.pagosWhereInput {
  return {
    ...(filtro.id_profesora === undefined ? {} : { id_profesora_cobra: filtro.id_profesora }),
    ...(filtro.inicio || filtro.fin
      ? { [fecha]: { ...(filtro.inicio && { gte: filtro.inicio }), ...(filtro.fin && { lt: filtro.fin }) } }
      : {}),
  };
}

function aPago(fila: pagos): Pago {
  return { ...fila, monto: fila.monto.toNumber() };
}

function conAlumno({ cuota, ...fila }: FilaConAlumno): TransferenciaConAlumno {
  const { id_alumno, usuario } = cuota.inscripcion.alumno;
  return { ...aPago(fila), alumno: { id_alumno, ...usuario } };
}

export class PagoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Cuota y pago en una transacción, con un bloqueo por inscripción: dos cobros simultáneos no
  // pueden generar la misma cuota. Devuelve null si mientras tanto otro cobro ya la tomó.
  guardar(cuota: CuotaAGuardar, datos: DatosDePago): Promise<Pago | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const clave = `cobro-inscripcion:${cuota.idInscripcion}`;
      await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
      const idCuota = await this.cuotaParaElPago(transaccion, cuota, datos.fecha_pago);
      if (idCuota === null) return null;
      return aPago(await transaccion.pagos.create({ data: { ...datos, id_cuota: idCuota } }));
    });
  }

  // Las fechas de las transferencias de ese alumno por ese monto que no se rechazaron: con ellas el
  // service detecta la misma transferencia informada dos veces.
  async fechasDeTransferenciasIguales(idAlumno: number, monto: number): Promise<Date[]> {
    const filas = await this.prisma.pagos.findMany({
      where: {
        forma_pago: "TRANSFERENCIA",
        estado: { not: "RECHAZADO" },
        monto,
        cuota: { inscripcion: { id_alumno: idAlumno } },
      },
      select: { fecha_hora_transferencia: true },
    });
    return filas.flatMap(({ fecha_hora_transferencia }) =>
      fecha_hora_transferencia ? [fecha_hora_transferencia] : [],
    );
  }

  async buscarConCuota(id: number): Promise<PagoConCuota | null> {
    const fila = await this.prisma.pagos.findUnique({
      where: { id_pago: id },
      include: { cuota: { select: { id_inscripcion: true, monto: true } } },
    });
    if (!fila) return null;
    const { cuota, ...pago } = fila;
    return { ...aPago(pago), cuota: { id_inscripcion: cuota.id_inscripcion, monto: cuota.monto.toNumber() } };
  }

  // Solo cambia un pago que sigue PENDIENTE: si otra operación ya lo resolvió devuelve null, así dos
  // aprobaciones seguidas no hacen nada dos veces.
  resolver(
    id: number,
    resolucion: {
      estado: EstadoPago;
      id_usuario_confirma: number;
      fecha_confirmacion: Date;
      motivo_rechazo: string | null;
    },
  ): Promise<Pago | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const { count } = await transaccion.pagos.updateMany({
        where: { id_pago: id, estado: "PENDIENTE" },
        data: resolucion,
      });
      if (count === 0) return null;
      return aPago(await transaccion.pagos.findUniqueOrThrow({ where: { id_pago: id } }));
    });
  }

  // US-17: una página de las transferencias, con el plan y la cuota que pagan y el vencimiento de la
  // cuota anterior de la misma inscripción, en dos consultas.
  async listarParaRevisar(
    filtro: FiltroTransferenciasEnInstantes,
    orden: OrdenTransferencias,
    pagina: { limit: number; offset: number },
  ): Promise<TransferenciaParaRevisar[]> {
    const filas = await this.prisma.pagos.findMany({
      where: transferenciasDelFiltro(filtro),
      include: PARA_REVISAR,
      orderBy: [{ fecha_pago: orden }, { id_pago: orden }],
      take: pagina.limit,
      skip: pagina.offset,
    });
    const anteriores = filas.flatMap(({ cuota }) =>
      cuota.numero_cuota > 1
        ? [{ id_inscripcion: cuota.id_inscripcion, numero_cuota: cuota.numero_cuota - 1 }]
        : [],
    );
    const vencimientos =
      anteriores.length === 0
        ? []
        : await this.prisma.cuotas.findMany({
            where: { OR: anteriores },
            select: { id_inscripcion: true, numero_cuota: true, fecha_vencimiento: true },
          });
    const vencimientoDe = new Map(
      vencimientos.map((cuota) => [`${cuota.id_inscripcion}:${cuota.numero_cuota}`, cuota.fecha_vencimiento]),
    );
    return filas.map(({ cuota, ...fila }) => ({
      ...aPago(fila),
      alumno: { id_alumno: cuota.inscripcion.alumno.id_alumno, ...cuota.inscripcion.alumno.usuario },
      id_inscripcion: cuota.id_inscripcion,
      plan: cuota.inscripcion.plan.nombre,
      tipo_plan: cuota.inscripcion.plan.tipo,
      numero_cuota: cuota.numero_cuota,
      monto_esperado: cuota.monto.toNumber(),
      vencimiento_anterior: vencimientoDe.get(`${cuota.id_inscripcion}:${cuota.numero_cuota - 1}`) ?? null,
    }));
  }

  // US-26: cuántas esperan revisión, por cuánto, y cuántas se cargaron antes de cada instante.
  async totalesPendientes(
    hace24Horas: Date,
    hace12Horas: Date,
  ): Promise<{ cantidad: number; total: number; antesDe24: number; antesDe12: number }> {
    const pendientes = transferenciasDelFiltro({ estado: "PENDIENTE" });
    const [totales, antesDe24, antesDe12] = await Promise.all([
      this.prisma.pagos.aggregate({ where: pendientes, _count: true, _sum: { monto: true } }),
      this.prisma.pagos.count({ where: { ...pendientes, fecha_pago: { lte: hace24Horas } } }),
      this.prisma.pagos.count({ where: { ...pendientes, fecha_pago: { lte: hace12Horas } } }),
    ]);
    return {
      cantidad: totales._count,
      total: totales._sum.monto?.toNumber() ?? 0,
      antesDe24,
      antesDe12,
    };
  }

  contarTransferencias(filtro: FiltroTransferenciasEnInstantes): Promise<number> {
    return this.prisma.pagos.count({ where: transferenciasDelFiltro(filtro) });
  }

  // Las del alumno que tiene ese usuario y las de los menores a cargo de ese usuario como tutor.
  async listarTransferenciasDeUsuario(idUsuario: number): Promise<TransferenciaConAlumno[]> {
    const filas = await this.prisma.pagos.findMany({
      where: {
        forma_pago: "TRANSFERENCIA",
        cuota: {
          inscripcion: { alumno: { OR: [{ id_usuario: idUsuario }, { id_usuario_responsable: idUsuario }] } },
        },
      },
      include: CON_ALUMNO,
      orderBy: [{ fecha_pago: "desc" }, { id_pago: "desc" }],
      take: LIMITE_MAXIMO,
    });
    return filas.map(conAlumno);
  }

  async buscarParaComprobante(id: number): Promise<PagoParaComprobante | null> {
    const nombre = { select: { nombre: true, apellido: true } } as const;
    const fila = await this.prisma.pagos.findUnique({
      where: { id_pago: id },
      include: {
        cuota: {
          select: {
            numero_cuota: true,
            fecha_vencimiento: true,
            fecha_generacion: true,
            monto: true,
            inscripcion: {
              select: {
                id_plan: true,
                plan: { select: { nombre: true } },
                promocion: { select: { nombre: true, tipo_descuento: true, valor: true } },
                alumno: {
                  select: {
                    id_usuario: true,
                    id_usuario_responsable: true,
                    usuario: { select: { nombre: true, apellido: true, dni: true } },
                  },
                },
              },
            },
          },
        },
        usuario_registra: nombre,
        profesora_cobra: { select: { usuario: nombre } },
      },
    });
    if (!fila) return null;
    const { fecha_generacion, monto, inscripcion } = fila.cuota;
    const { id_plan, ...datosDeInscripcion } = inscripcion;
    const dia = fechaActualArgentina(fecha_generacion);
    const precio = await this.prisma.plan_precios.findFirst({
      where: {
        id_plan,
        fecha_vigencia_desde: { lte: dia },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: dia } }],
      },
      select: { precio: true },
    });
    return {
      ...fila,
      monto: fila.monto.toNumber(),
      cuota: {
        numero_cuota: fila.cuota.numero_cuota,
        fecha_vencimiento: fila.cuota.fecha_vencimiento,
        monto: monto.toNumber(),
        inscripcion: datosDeInscripcion,
      },
      precio_lista: precio ? precio.precio.toNumber() : null,
    };
  }

  // Los totales por profesora salen de la base, completos aunque el detalle tenga tope. Incluye a
  // las profesoras dadas de baja: lo que cobraron se rinde igual.
  async totalesSinRendir(filtro: FiltroEfectivoEnInstantes): Promise<TotalDeProfesora[]> {
    const grupos = await this.prisma.pagos.groupBy({
      by: ["id_profesora_cobra"],
      where: { ...EFECTIVO_DE_PROFESORA, rendido: false, ...conFiltro(filtro, "fecha_pago") },
      _count: { id_pago: true },
      _sum: { monto: true },
    });
    if (grupos.length === 0) return [];
    const profesoras = await this.prisma.profesoras.findMany({
      where: { id_profesora: { in: grupos.map(({ id_profesora_cobra }) => id_profesora_cobra as number) } },
      select: { id_profesora: true, usuario: { select: { nombre: true, apellido: true } } },
    });
    const porId = new Map(profesoras.map(({ id_profesora, usuario }) => [id_profesora, usuario]));
    return grupos
      .map(({ id_profesora_cobra, _count, _sum }) => ({
        id_profesora: id_profesora_cobra as number,
        ...(porId.get(id_profesora_cobra as number) as { nombre: string; apellido: string }),
        cantidad: _count.id_pago,
        total: (_sum.monto as PrismaSql.Decimal).toNumber(),
      }))
      .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
  }

  async listarSinRendir(
    filtro: FiltroEfectivoEnInstantes,
    pagina: { limit: number; offset: number },
  ): Promise<CobroEnEfectivo[]> {
    const filas = await this.prisma.pagos.findMany({
      where: { ...EFECTIVO_DE_PROFESORA, rendido: false, ...conFiltro(filtro, "fecha_pago") },
      include: DATOS_DEL_COBRO,
      orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
      take: pagina.limit,
      skip: pagina.offset,
    });
    return filas.map(aCobro);
  }

  async listarRendidos(
    filtro: FiltroEfectivoEnInstantes,
    pagina: { limit: number; offset: number },
  ): Promise<{ datos: CobroEnEfectivo[]; total: number }> {
    const where = { ...EFECTIVO_DE_PROFESORA, rendido: true, ...conFiltro(filtro, "fecha_rendicion") };
    const [filas, total] = await Promise.all([
      this.prisma.pagos.findMany({
        where,
        include: DATOS_DEL_COBRO,
        orderBy: [{ fecha_rendicion: "desc" }, { id_pago: "desc" }],
        take: pagina.limit,
        skip: pagina.offset,
      }),
      this.prisma.pagos.count({ where }),
    ]);
    return { datos: filas.map(aCobro), total };
  }

  async idsSinRendirDeProfesora(idProfesora: number): Promise<number[]> {
    const filas = await this.prisma.pagos.findMany({
      where: { ...EFECTIVO_DE_PROFESORA, rendido: false, id_profesora_cobra: idProfesora },
      select: { id_pago: true },
      orderBy: { id_pago: "asc" },
    });
    return filas.map(({ id_pago }) => id_pago);
  }

  // Una sola sentencia: verificar y marcar no pueden separarse, y dos rendiciones a la vez no rinden
  // dos veces el mismo cobro. Devuelve los que rindió con su monto.
  rendir(ids: number[], fecha: Date): Promise<{ id_pago: number; monto: number }[]> {
    return this.prisma.$queryRaw<{ id_pago: number; monto: PrismaSql.Decimal }[]>`
      UPDATE pagos SET rendido = true, fecha_rendicion = ${fecha}
      WHERE id_pago = ANY(${ids})
        AND forma_pago = 'EFECTIVO'
        AND estado = 'CONFIRMADO'
        AND id_profesora_cobra IS NOT NULL
        AND rendido = false
      RETURNING id_pago, monto`.then((filas) =>
      filas.map(({ id_pago, monto }) => ({ id_pago, monto: Number(monto) })),
    );
  }

  // Por qué no se rindió cada uno de esos cobros.
  async motivosSinRendir(ids: number[]): Promise<Map<number, MotivoSinRendir>> {
    const filas = await this.prisma.pagos.findMany({
      where: { id_pago: { in: ids } },
      select: { id_pago: true, rendido: true, forma_pago: true, estado: true, id_profesora_cobra: true },
    });
    const porId = new Map(filas.map((fila) => [fila.id_pago, fila]));
    return new Map(
      ids.map((id) => {
        const fila = porId.get(id);
        if (!fila) return [id, "NO_EXISTE"];
        const esDeProfesora =
          fila.forma_pago === "EFECTIVO" && fila.estado === "CONFIRMADO" && fila.id_profesora_cobra !== null;
        return [id, esDeProfesora && fila.rendido ? "YA_RENDIDO" : "NO_ES_EFECTIVO_DE_PROFESORA"];
      }),
    );
  }

  // Reusa la última cuota si sigue sin pagos confirmados ni pendientes y la pone al día; si no,
  // crea la siguiente. null: otro cobro ya la tomó.
  private async cuotaParaElPago(
    transaccion: Transaccion,
    cuota: CuotaAGuardar,
    generadaEn: Date,
  ): Promise<number | null> {
    const datos = {
      fecha_vencimiento: cuota.fechaVencimiento,
      monto: cuota.monto,
      fecha_generacion: generadaEn,
    };
    if (cuota.idCuotaExistente !== null) {
      const tomada = await transaccion.pagos.count({
        where: { id_cuota: cuota.idCuotaExistente, estado: { not: "RECHAZADO" } },
      });
      if (tomada > 0) return null;
      await transaccion.cuotas.update({ where: { id_cuota: cuota.idCuotaExistente }, data: datos });
      return cuota.idCuotaExistente;
    }

    const clave = { id_inscripcion: cuota.idInscripcion, numero_cuota: cuota.numeroCuota };
    if (await transaccion.cuotas.findUnique({ where: { id_inscripcion_numero_cuota: clave } })) return null;
    return (await transaccion.cuotas.create({ data: { ...clave, ...datos } })).id_cuota;
  }

  async obtenerCobranza(
    filtro: FiltroCobranzaRepositorio,
    paginacion: { limit: number; offset: number },
  ): Promise<ResultadoCobranza> {
    const where: Prisma.pagosWhereInput = {
      estado: "CONFIRMADO",
      fecha_pago: { gte: filtro.inicio, lt: filtro.fin },
      ...(filtro.forma_pago ? { forma_pago: filtro.forma_pago } : {}),
      ...(filtro.id_profesora ? { id_profesora_cobra: filtro.id_profesora } : {}),
    };

    const [filas, total, agrupados] = await Promise.all([
      this.prisma.pagos.findMany({
        where,
        select: {
          id_pago: true,
          id_cuota: true,
          monto: true,
          forma_pago: true,
          fecha_pago: true,
          profesora_cobra: {
            select: {
              id_profesora: true,
              usuario: { select: { nombre: true, apellido: true } },
            },
          },
          cuota: {
            select: {
              inscripcion: {
                select: {
                  plan: { select: { id_plan: true, nombre: true } },
                  alumno: {
                    select: {
                      id_alumno: true,
                      usuario: { select: { nombre: true, apellido: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ fecha_pago: "desc" }, { id_pago: "desc" }],
        take: paginacion.limit,
        skip: paginacion.offset,
      }),
      this.prisma.pagos.count({ where }),
      this.prisma.pagos.groupBy({
        by: ["forma_pago"],
        where,
        _sum: { monto: true },
        _count: { id_pago: true },
      }),
    ]);

    const pagos = filas.map((f) => ({
      id_pago: f.id_pago,
      id_cuota: f.id_cuota,
      monto: Number(f.monto),
      forma_pago: f.forma_pago,
      fecha_pago: f.fecha_pago,
      alumno: {
        id_alumno: f.cuota.inscripcion.alumno.id_alumno,
        ...f.cuota.inscripcion.alumno.usuario,
      },
      plan: f.cuota.inscripcion.plan,
      profesora_cobra: f.profesora_cobra
        ? {
            id_profesora: f.profesora_cobra.id_profesora,
            ...f.profesora_cobra.usuario,
          }
        : null,
    }));

    const totalesPorForma = agrupados.map((g) => ({
      forma_pago: g.forma_pago,
      total: Number(g._sum.monto ?? 0),
      cantidad: g._count.id_pago,
    }));

    return { pagos, total, totalesPorForma };
  }
}
