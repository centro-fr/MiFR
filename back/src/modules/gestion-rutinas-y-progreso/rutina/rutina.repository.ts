import type { Prisma, PrismaClient, rutinas } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import type { ContenidoRutina } from "./rutina.schemas.js";
import type { NuevaRutina, Rutina } from "./rutina.types.js";

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

// El contenido lo validó el schema al cargarla; en la base es JSONB.
function aRutina(fila: rutinas): Rutina {
  return { ...fila, contenido: fila.contenido as unknown as ContenidoRutina };
}

// Serializa dos altas del mismo alumno, que si no podían dejar dos rutinas activas a la vez
// (UK_rutinas_alumno_activa las rechaza, pero con un error en vez de reemplazar la anterior).
async function bloquearAlumno(transaccion: Prisma.TransactionClient, idAlumno: number): Promise<void> {
  const clave = `rutinas:${idAlumno}`;
  await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
}

export class RutinaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Historial completo, de la más reciente a la más antigua.
  async listarDeAlumno(idAlumno: number): Promise<Rutina[]> {
    const filas = await this.prisma.rutinas.findMany({
      where: { id_alumno: idAlumno },
      orderBy: [{ fecha_desde: "desc" }, { id_rutina: "desc" }],
    });
    return filas.map(aRutina);
  }

  async buscarVigenteDeAlumno(idAlumno: number): Promise<Rutina | null> {
    const fila = await this.prisma.rutinas.findFirst({ where: { id_alumno: idAlumno, activa: true } });
    return fila ? aRutina(fila) : null;
  }

  // Una profesora tiene a su cargo al alumno que tiene en una inscripción que no está dada de baja (US-10).
  async profesoraTieneAlumno(idProfesora: number, idAlumno: number): Promise<boolean> {
    const inscripcion = await this.prisma.inscripciones.findFirst({
      where: { id_alumno: idAlumno, id_profesora: idProfesora, estado: { not: "BAJA" } },
      select: { id_inscripcion: true },
    });
    return inscripcion !== null;
  }

  // La nueva queda vigente y la anterior pasa al historial en la misma transacción. A la anterior sin
  // fecha de fin se le pone el día previo al inicio de la nueva, sin quedar antes de su propio inicio
  // (ck_rutinas_fechas).
  crear(nueva: NuevaRutina): Promise<Rutina> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearAlumno(transaccion, nueva.id_alumno);

      const anteriores = await transaccion.rutinas.findMany({
        where: { id_alumno: nueva.id_alumno, activa: true },
      });
      const diaPrevio = new Date(nueva.fecha_desde.getTime() - UN_DIA_EN_MS);
      for (const anterior of anteriores) {
        const fin = anterior.fecha_hasta ?? (diaPrevio >= anterior.fecha_desde ? diaPrevio : anterior.fecha_desde);
        await transaccion.rutinas.update({
          where: { id_rutina: anterior.id_rutina },
          data: { activa: false, fecha_hasta: fin },
        });
      }

      const fila = await transaccion.rutinas.create({
        data: { ...nueva, contenido: nueva.contenido as unknown as Prisma.InputJsonValue, activa: true },
      });
      return aRutina(fila);
    });
  }
}