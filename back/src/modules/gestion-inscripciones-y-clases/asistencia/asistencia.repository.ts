import type { PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import type { InscriptoDeHorario } from "../inscripcion/inscripcion.types.js";
import type { Asistencia } from "./asistencia.types.js";

export interface MarcaDeAsistencia {
  idClase: number;
  idUsuario: number;
  fechaRegistro: Date;
}

export class AsistenciaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listarDeClase(idClase: number): Promise<Asistencia[]> {
    return this.prisma.asistencias.findMany({ where: { id_clase: idClase }, orderBy: { id_alumno: "asc" } });
  }

  async marcar(inscripto: InscriptoDeHorario, asistio: boolean, marca: MarcaDeAsistencia): Promise<void> {
    const registro = {
      id_inscripcion: inscripto.id_inscripcion,
      asistio,
      id_usuario_registra: marca.idUsuario,
      fecha_registro: marca.fechaRegistro,
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
}
