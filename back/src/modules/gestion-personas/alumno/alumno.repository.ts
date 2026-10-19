import { Prisma, type PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import type {
  Alumno,
  ConteoAltasMes,
  EstadoAlReactivar,
  FiltroAltasPorMes,
  FiltroAlumno,
  TutorResuelto,
} from "./alumno.types.js";

const DATOS_PERSONALES = {
  id_usuario: true,
  nombre: true,
  apellido: true,
  dni: true,
  email: true,
  telefono: true,
  fecha_nacimiento: true,
  direccion: true,
  estado: true,
} satisfies Prisma.usuariosSelect;

const CON_DATOS = {
  usuario: { select: DATOS_PERSONALES },
  responsable: { select: DATOS_PERSONALES },
} satisfies Prisma.alumnosInclude;

export interface DatosUsuarioAlumno {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  telefono?: string | null;
  fecha_nacimiento?: Date;
  direccion?: string | null;
}

export interface DatosFichaAlumno {
  cont_emerg_nombre?: string;
  cont_emerg_telefono?: string;
  apto_medico?: boolean;
  fecha_apto_medico?: Date | null;
  observaciones?: string | null;
}

// "Sin cambios" se distingue de "sin tutor" (null): el PATCH puede no tocar el tutor.
export type CambioDeTutor = TutorResuelto | null | undefined;

// En ILIKE el % y el _ son comodines: se escapan para que la búsqueda los tome literales.
function patronDeBusqueda(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}

function condicionesDelListado(filtro: Omit<FiltroAlumno, "limit" | "offset">): Prisma.Sql {
  const condiciones: Prisma.Sql[] = [];
  if (filtro.estado) {
    condiciones.push(Prisma.sql`a.estado = ${filtro.estado}::estado_alumno`);
  } else if (!filtro.incluirBajas) {
    condiciones.push(Prisma.sql`a.estado <> 'BAJA'`);
  }
  if (filtro.dni) condiciones.push(Prisma.sql`u.dni = ${filtro.dni}`);
  if (filtro.ids) condiciones.push(Prisma.sql`a.id_alumno = ANY(${filtro.ids})`);
  if (filtro.busqueda) {
    // Se busca también por el nombre del tutor: es quien suele consultar por un menor.
    condiciones.push(
      Prisma.sql`unaccent(concat_ws(' ', u.nombre, u.apellido, r.nombre, r.apellido)) ILIKE unaccent(${patronDeBusqueda(filtro.busqueda)})`,
    );
  }
  return condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
}

function desdeElListado(filtro: Omit<FiltroAlumno, "limit" | "offset">): Prisma.Sql {
  return Prisma.sql`FROM alumnos a
    JOIN usuarios u ON u.id_usuario = a.id_usuario
    LEFT JOIN usuarios r ON r.id_usuario = a.id_usuario_responsable
    ${condicionesDelListado(filtro)}`;
}

async function idDelTutor(transaccion: Prisma.TransactionClient, tutor: TutorResuelto): Promise<number> {
  if ("id_usuario" in tutor) return tutor.id_usuario;
  const creado = await transaccion.usuarios.create({ data: { ...tutor.nuevo, estado: "INACTIVO" } });
  return creado.id_usuario;
}

// Alumno y tutor son filas de usuarios (DER: alumnos.id_usuario NOT NULL). Se crean en la misma
// transacción que el alumno: separados, un fallo dejaría un usuario huérfano con el email o el
// DNI tomados, y el reintento del alta chocaría con él.
export class AlumnoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  crear(
    usuario: DatosUsuarioAlumno & { nombre: string; apellido: string; fecha_nacimiento: Date },
    ficha: DatosFichaAlumno & { cont_emerg_nombre: string; cont_emerg_telefono: string },
    tutor: TutorResuelto | null,
  ): Promise<Alumno> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const idResponsable = tutor ? await idDelTutor(transaccion, tutor) : null;
      return transaccion.alumnos.create({
        data: {
          ...ficha,
          estado: "INACTIVO",
          responsable: idResponsable ? { connect: { id_usuario: idResponsable } } : undefined,
          usuario: { create: { ...usuario, estado: "INACTIVO" } },
        },
        include: CON_DATOS,
      });
    });
  }

  buscarPorId(id: number): Promise<Alumno | null> {
    return this.prisma.alumnos.findUnique({ where: { id_alumno: id }, include: CON_DATOS });
  }

  buscarPorIdUsuario(idUsuario: number): Promise<Alumno | null> {
    return this.prisma.alumnos.findUnique({ where: { id_usuario: idUsuario }, include: CON_DATOS });
  }

  buscarPorIds(ids: number[]): Promise<Alumno[]> {
    return this.prisma.alumnos.findMany({ where: { id_alumno: { in: ids } }, include: CON_DATOS });
  }

  // La búsqueda sin acentos necesita unaccent, que Prisma no expone: los ids de la página y el
  // total salen de SQL y las filas completas, de una sola consulta más.
  async listar(filtro: FiltroAlumno): Promise<{ datos: Alumno[]; total: number }> {
    const desde = desdeElListado(filtro);
    const [pagina, [{ total }]] = await Promise.all([
      this.idsEnOrden(desde, filtro.limit, filtro.offset),
      this.prisma.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total ${desde}`,
    ]);

    const alumnos = pagina.length > 0 ? await this.buscarPorIds(pagina) : [];
    const porId = new Map(alumnos.map((alumno) => [alumno.id_alumno, alumno]));
    // Un alumno cuya cuenta se borró entre las dos consultas no sale: una fila sin sus datos rompe al cliente.
    return { datos: pagina.flatMap((id) => porId.get(id) ?? []), total: Number(total) };
  }

  // Los ids del listado, en el mismo orden y sin paginar, hasta el tope: para filtrar por algo que
  // no está en la base, como el estado de cuota (US-10).
  listarIds(filtro: Omit<FiltroAlumno, "limit" | "offset">, tope: number): Promise<number[]> {
    return this.idsEnOrden(desdeElListado(filtro), tope, 0);
  }

  private async idsEnOrden(desde: Prisma.Sql, limite: number, desplazamiento: number): Promise<number[]> {
    const filas = await this.prisma.$queryRaw<{ id_alumno: number }[]>`
      SELECT a.id_alumno ${desde}
      ORDER BY u.apellido, u.nombre, a.id_alumno
      LIMIT ${limite} OFFSET ${desplazamiento}`;
    return filas.map((fila) => fila.id_alumno);
  }

  actualizar(
    id: number,
    usuario: DatosUsuarioAlumno,
    ficha: DatosFichaAlumno,
    tutor: CambioDeTutor,
  ): Promise<Alumno> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const responsable =
        tutor === undefined
          ? undefined
          : tutor === null
            ? { disconnect: true }
            : { connect: { id_usuario: await idDelTutor(transaccion, tutor) } };
      return transaccion.alumnos.update({
        where: { id_alumno: id },
        data: { ...ficha, responsable, usuario: { update: usuario } },
        include: CON_DATOS,
      });
    });
  }

  // Quien entra al sistema es el tutor si lo hay: su usuario también pasa a ACTIVO.
  activar(alumno: Alumno): Promise<Alumno> {
    const ids = [
      alumno.id_usuario,
      ...(alumno.id_usuario_responsable ? [alumno.id_usuario_responsable] : []),
    ];
    return enTransaccion(this.prisma, async (transaccion) => {
      await transaccion.usuarios.updateMany({
        where: { id_usuario: { in: ids } },
        data: { estado: "ACTIVO" },
      });
      return transaccion.alumnos.update({
        where: { id_alumno: alumno.id_alumno },
        data: { estado: "ACTIVO" },
        include: CON_DATOS,
      });
    });
  }

  // El tutor no se toca: puede tener otros alumnos a cargo.
  darDeBaja(alumno: Alumno): Promise<Alumno> {
    return this.cambiarEstado(alumno, "BAJA", "INACTIVO", new Date());
  }

  reactivar(alumno: Alumno, estado: EstadoAlReactivar): Promise<Alumno> {
    return this.cambiarEstado(alumno, estado, estado, null);
  }

  private cambiarEstado(
    alumno: Alumno,
    estado: Alumno["estado"],
    estadoUsuario: "ACTIVO" | "INACTIVO",
    fechaBaja: Date | null,
  ): Promise<Alumno> {
    return this.prisma.alumnos.update({
      where: { id_alumno: alumno.id_alumno },
      data: { estado, fecha_baja: fechaBaja, usuario: { update: { estado: estadoUsuario } } },
      include: CON_DATOS,
    });
  }

  // US-35: cuenta altas definitivas (alumnos que pasaron a ACTIVO/BAJA) agrupadas por año y mes.
  async contarAltasPorMes(filtro: FiltroAltasPorMes): Promise<ConteoAltasMes[]> {
    const condicionesInscripcion: Prisma.Sql[] = [];
    if (filtro.id_plan !== undefined) {
      condicionesInscripcion.push(Prisma.sql`i.id_plan = ${filtro.id_plan}`);
    }
    if (filtro.id_profesora !== undefined) {
      condicionesInscripcion.push(Prisma.sql`i.id_profesora = ${filtro.id_profesora}`);
    }

    const filtroInscripcion =
      condicionesInscripcion.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM inscripciones i
            WHERE i.id_alumno = a.id_alumno
              AND ${Prisma.join(condicionesInscripcion, " AND ")}
          )`
        : Prisma.empty;

    const filas = await this.prisma.$queryRaw<{ anio: number; mes: number; total: bigint | number }[]>`
      SELECT
        EXTRACT(YEAR FROM a.fecha_alta AT TIME ZONE 'America/Argentina/Buenos_Aires')::int AS anio,
        EXTRACT(MONTH FROM a.fecha_alta AT TIME ZONE 'America/Argentina/Buenos_Aires')::int AS mes,
        COUNT(a.id_alumno)::int AS total
      FROM alumnos a
      WHERE a.estado != 'INACTIVO'
        AND a.fecha_alta >= ${filtro.inicio}
        AND a.fecha_alta < ${filtro.fin}
        ${filtroInscripcion}
      GROUP BY anio, mes
      ORDER BY anio ASC, mes ASC`;

    return filas.map((f) => ({
      anio: f.anio,
      mes: f.mes,
      total: Number(f.total),
    }));
  }
}
