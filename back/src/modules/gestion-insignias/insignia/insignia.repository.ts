import type { PrismaClient } from "@prisma/client";
import type { Insignia, InsigniaAOtorgar, InsigniaObtenida } from "./insignia.types.js";

export class InsigniaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listarCatalogo(): Promise<Insignia[]> {
    return this.prisma.insignias.findMany({ orderBy: [{ tipo: "asc" }, { valor_umbral: "asc" }] });
  }

  listarObtenidas(idsAlumnos: number[]): Promise<InsigniaObtenida[]> {
    if (idsAlumnos.length === 0) return Promise.resolve([]);
    return this.prisma.alumno_insignias.findMany({
      where: { id_alumno: { in: idsAlumnos } },
      include: { insignia: true },
      orderBy: { fecha_obtencion: "asc" },
    });
  }

  // La clave primaria (alumno, insignia, periodo) ignora las ya otorgadas: recalcular es inofensivo,
  // también si dos pedidos llegan a la vez. Devuelve cuántas eran nuevas.
  async otorgar(insignias: InsigniaAOtorgar[]): Promise<number> {
    if (insignias.length === 0) return 0;
    const { count } = await this.prisma.alumno_insignias.createMany({
      data: insignias,
      skipDuplicates: true,
    });
    return count;
  }

  async fueOtorgadaEnPeriodo(idInsignia: number, periodo: string): Promise<boolean> {
    const cantidad = await this.prisma.alumno_insignias.count({
      where: { id_insignia: idInsignia, periodo },
    });
    return cantidad > 0;
  }
}
