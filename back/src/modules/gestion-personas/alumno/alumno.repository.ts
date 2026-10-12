import { Prisma, type PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import type { Alumno, EstadoAlReactivar, FiltroAlumno, TutorResuelto } from "./alumno.types.js";

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
  cont_emerg_nombre?: string | null;
  cont_emerg_telefono?: string | null;
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

function condicionesDelListado(filtro: FiltroAlumno): Prisma.Sql {
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
    ficha: DatosFichaAlumno,
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
    const desde = Prisma.sql`FROM alumnos a
      JOIN usuarios u ON u.id_usuario = a.id_usuario
      LEFT JOIN usuarios r ON r.id_usuario = a.id_usuario_responsable
      ${condicionesDelListado(filtro)}`;
    const [pagina, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id_alumno: number }[]>`
        SELECT a.id_alumno ${desde}
        ORDER BY u.apellido, u.nombre, a.id_alumno
        LIMIT ${filtro.limit} OFFSET ${filtro.offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total ${desde}`,
    ]);

    const ids = pagina.map((fila) => fila.id_alumno);
    const alumnos = ids.length > 0 ? await this.buscarPorIds(ids) : [];
    const porId = new Map(alumnos.map((alumno) => [alumno.id_alumno, alumno]));
    return { datos: ids.map((id) => porId.get(id) as Alumno), total: Number(total) };
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
}
