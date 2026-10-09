import type { pagos, Prisma, PrismaClient } from "@prisma/client";
import type {
  CuotaAGuardar,
  DatosDePago,
  EstadoPago,
  FiltroTransferencias,
  Pago,
  PagoConCuota,
  PagoParaComprobante,
  TransferenciaConAlumno,
} from "./pago.types.js";

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
    return this.prisma.$transaction(async (transaccion) => {
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
    return this.prisma.$transaction(async (transaccion) => {
      const { count } = await transaccion.pagos.updateMany({
        where: { id_pago: id, estado: "PENDIENTE" },
        data: resolucion,
      });
      if (count === 0) return null;
      return aPago(await transaccion.pagos.findUniqueOrThrow({ where: { id_pago: id } }));
    });
  }

  async listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaConAlumno[]> {
    const filas = await this.prisma.pagos.findMany({
      where: {
        forma_pago: "TRANSFERENCIA",
        ...(filtro.estado === undefined ? {} : { estado: filtro.estado }),
        ...(filtro.id_alumno === undefined
          ? {}
          : { cuota: { inscripcion: { id_alumno: filtro.id_alumno } } }),
      },
      include: CON_ALUMNO,
      orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
    });
    return filas.map(conAlumno);
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
            inscripcion: {
              select: {
                plan: { select: { nombre: true } },
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
    return fila ? { ...fila, monto: fila.monto.toNumber() } : null;
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
}
