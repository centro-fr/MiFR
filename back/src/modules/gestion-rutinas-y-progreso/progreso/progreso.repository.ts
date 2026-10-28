import type { Prisma, PrismaClient } from "@prisma/client";
import { clienteEnCurso, enTransaccion } from "../../../shared/db/transaccion.js";
import type {
  CambiosDeProgreso,
  MedidaDeRegistro,
  NuevoRegistroDeProgreso,
  RegistroDeProgreso,
} from "./progreso.types.js";

const CON_MEDIDAS = {
  medidas: { include: { tipo_medida: true }, orderBy: { id_tipo_medida: "asc" } },
} satisfies Prisma.registros_progresoInclude;

type FilaConMedidas = Prisma.registros_progresoGetPayload<{ include: typeof CON_MEDIDAS }>;

function aRegistro(fila: FilaConMedidas): RegistroDeProgreso {
  return {
    id_registro: fila.id_registro,
    id_alumno: fila.id_alumno,
    id_profesora: fila.id_profesora,
    fecha: fila.fecha,
    observaciones: fila.observaciones,
    fecha_modificacion: fila.fecha_modificacion,
    id_usuario_modifica: fila.id_usuario_modifica,
    medidas: fila.medidas.map(({ tipo_medida, valor }) => ({
      codigo: tipo_medida.codigo,
      unidad: tipo_medida.unidad,
      valor: valor.toNumber(),
    })),
  };
}

// El tipo de medida se crea la primera vez que se usa, así no depende de que alguien cargue antes el catálogo.
function medidasACrear(medidas: MedidaDeRegistro[]) {
  return medidas.map(({ codigo, unidad, valor }) => ({
    valor,
    tipo_medida: { connectOrCreate: { where: { codigo }, create: { codigo, unidad } } },
  }));
}

export class ProgresoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // El registro y todas sus medidas se escriben juntos: si una falla, no queda ninguna.
  async crear(nuevo: NuevoRegistroDeProgreso): Promise<RegistroDeProgreso> {
    const fila = await clienteEnCurso(this.prisma).registros_progreso.create({
      data: {
        id_alumno: nuevo.id_alumno,
        id_profesora: nuevo.id_profesora,
        fecha: nuevo.fecha,
        observaciones: nuevo.observaciones,
        medidas: { create: medidasACrear(nuevo.medidas) },
      },
      include: CON_MEDIDAS,
    });
    return aRegistro(fila);
  }

  // Un registro dado de baja no existe para quien consulta.
  async buscarPorId(idRegistro: number): Promise<RegistroDeProgreso | null> {
    const fila = await this.prisma.registros_progreso.findFirst({
      where: { id_registro: idRegistro, fecha_baja: null },
      include: CON_MEDIDAS,
    });
    return fila ? aRegistro(fila) : null;
  }

  // De la medición más reciente a la más antigua (spec 09, RF-03), sin las dadas de baja.
  async listarDeAlumno(idAlumno: number): Promise<RegistroDeProgreso[]> {
    const filas = await this.prisma.registros_progreso.findMany({
      where: { id_alumno: idAlumno, fecha_baja: null },
      orderBy: [{ fecha: "desc" }, { id_registro: "desc" }],
      include: CON_MEDIDAS,
    });
    return filas.map(aRegistro);
  }

  // Corrige el registro y deja quién y cuándo. Si hay medidas nuevas, borra las anteriores y escribe las nuevas
  // en la misma transacción: no queda un registro a medio corregir.
  actualizar(idRegistro: number, cambios: CambiosDeProgreso, idUsuario: number): Promise<RegistroDeProgreso> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const datos: Prisma.registros_progresoUpdateInput = {
        fecha_modificacion: new Date(),
        usuario_modifica: { connect: { id_usuario: idUsuario } },
      };
      if (cambios.fecha !== undefined) datos.fecha = cambios.fecha;
      if (cambios.observaciones !== undefined) datos.observaciones = cambios.observaciones;
      if (cambios.medidas !== undefined) {
        await transaccion.medidas_corporales.deleteMany({ where: { id_registro: idRegistro } });
        datos.medidas = { create: medidasACrear(cambios.medidas) };
      }

      const fila = await transaccion.registros_progreso.update({
        where: { id_registro: idRegistro },
        data: datos,
        include: CON_MEDIDAS,
      });
      return aRegistro(fila);
    });
  }

  // Baja lógica: el registro y sus medidas quedan en la base, con quién y cuándo, y dejan de mostrarse.
  async darDeBaja(idRegistro: number, idUsuario: number): Promise<void> {
    await this.prisma.registros_progreso.update({
      where: { id_registro: idRegistro },
      data: { fecha_baja: new Date(), usuario_baja: { connect: { id_usuario: idUsuario } } },
    });
  }
}
