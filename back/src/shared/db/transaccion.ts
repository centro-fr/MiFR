import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma, PrismaClient } from "@prisma/client";

type Transaccion = Prisma.TransactionClient;

// La transacción que abrió la operación en curso. AsyncLocalStorage la acompaña por todas las
// llamadas asíncronas de esa operación: así los repositorios de varios componentes se suman a ella
// sin que la transacción pase por los services ni por las interfaces entre componentes.
const transaccionEnCurso = new AsyncLocalStorage<Transaccion>();

// Ejecuta la operación dentro de la transacción que ya está abierta o, si no hay ninguna, en una
// nueva. Una operación atómica por sí sola (activar una inscripción) queda así incluida en otra más
// grande (el cobro) cuando se la llama desde ahí.
export function enTransaccion<T>(
  prisma: PrismaClient,
  operacion: (transaccion: Transaccion) => Promise<T>,
  opciones?: { maxWait: number; timeout: number },
): Promise<T> {
  const abierta = transaccionEnCurso.getStore();
  if (abierta) return operacion(abierta);
  return prisma.$transaction(
    (transaccion) => transaccionEnCurso.run(transaccion, () => operacion(transaccion)),
    opciones,
  );
}

// Para las escrituras de una sola sentencia: si hay una transacción abierta, van en ella.
export function clienteEnCurso(prisma: PrismaClient): Transaccion {
  return transaccionEnCurso.getStore() ?? prisma;
}

// Agrupa en una sola transacción escrituras de varios componentes que tienen que confirmarse
// juntas, como el alta definitiva y el pago que la dispara. Los services dependen de esta interfaz,
// no de Prisma.
export interface IUnidadDeTrabajo {
  ejecutar<T>(operacion: () => Promise<T>): Promise<T>;
}

// El cobro toma los bloqueos de la inscripción y del cobro y escribe en cinco tablas: los 5 s que
// Prisma da por defecto quedan cortos si la base responde lento.
const LIMITES_DE_LA_UNIDAD = { maxWait: 5_000, timeout: 15_000 };

export class UnidadDeTrabajoPrisma implements IUnidadDeTrabajo {
  constructor(private readonly prisma: PrismaClient) {}

  ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    return enTransaccion(this.prisma, () => operacion(), LIMITES_DE_LA_UNIDAD);
  }
}
