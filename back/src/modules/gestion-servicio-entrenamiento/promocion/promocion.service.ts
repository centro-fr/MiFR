import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoPromociones } from "./interface/i-info-promociones.js";
import type { PromocionRepository } from "./promocion.repository.js";
import type { ActualizarPromocionInput, CrearPromocionInput } from "./promocion.schemas.js";
import type {
  DatosPromocion,
  DescuentoAplicado,
  EstadoPromocion,
  FiltroPromociones,
  Promocion,
  PromocionAplicable,
  PromocionGuardada,
  ResultadoGuardado,
} from "./promocion.types.js";

const MAXIMO_PORCENTAJE = 100;

export function estadoDePromocion(
  { activo, fecha_desde, fecha_hasta }: Pick<PromocionGuardada, "activo" | "fecha_desde" | "fecha_hasta">,
  hoy: Date,
): EstadoPromocion {
  if (!activo) return "DESACTIVADA";
  if (fecha_hasta < hoy) return "VENCIDA";
  return fecha_desde > hoy ? "PROGRAMADA" : "ACTIVA";
}

// Los montos son NUMERIC(10,2): se redondea a centavos y el descuento nunca supera el precio.
function descuentoSobre(precio: number, { tipo_descuento, valor }: PromocionAplicable): number {
  const descuento = tipo_descuento === "PORCENTAJE" ? (precio * valor) / MAXIMO_PORCENTAJE : valor;
  return Math.round(Math.min(descuento, precio) * 100) / 100;
}

function conEstado(promocion: PromocionGuardada): Promocion {
  return { ...promocion, estado: estadoDePromocion(promocion, fechaActualArgentina()) };
}

// Componente "Promocion" de la vista arquitectónica (US-13): descuentos temporales sobre uno o varios
// planes. La promoción queda en la inscripción al pre-inscribirse y cada cobro la aplica si ese día
// sigue vigente (decisión de SPRINT-4.md): nunca cambia lo ya cobrado. Que los planes existan y que
// un monto fijo no supere su precio lo comprueba la fachada, que ve a Plan.
export class PromocionService implements IInfoPromociones {
  constructor(private readonly repositorio: PromocionRepository) {}

  async listar(filtro: FiltroPromociones): Promise<Promocion[]> {
    const promociones = await this.repositorio.listar(filtro, fechaActualArgentina());
    return promociones.map(conEstado);
  }

  async obtenerPorId(id: number): Promise<Promocion> {
    const promocion = await this.repositorio.buscarPorId(id);
    if (!promocion) throw new NotFoundError("Promoción no encontrada");
    return conEstado(promocion);
  }

  async crear(input: CrearPromocionInput): Promise<Promocion> {
    if (input.fecha_hasta < fechaActualArgentina()) {
      throw new ValidationError("La promoción ya terminó: la fecha hasta no puede ser anterior a hoy");
    }
    return conEstado(this.resolver(await this.repositorio.guardar(input)));
  }

  // US-13: una vencida o desactivada solo se consulta. Las reglas se revisan con los datos resultantes.
  async actualizar(id: number, input: ActualizarPromocionInput): Promise<Promocion> {
    const actual = await this.obtenerEditable(id);
    const resultante: DatosPromocion = {
      codigo: input.codigo ?? actual.codigo,
      nombre: input.nombre ?? actual.nombre,
      tipo_descuento: input.tipo_descuento ?? actual.tipo_descuento,
      valor: input.valor ?? actual.valor,
      fecha_desde: input.fecha_desde ?? actual.fecha_desde,
      fecha_hasta: input.fecha_hasta ?? actual.fecha_hasta,
      ids_planes: input.ids_planes ?? actual.planes.map(({ id_plan }) => id_plan),
    };
    validarDatos(resultante);
    return conEstado(this.resolver(await this.repositorio.guardar(resultante, id)));
  }

  // Una desactivada deja de aplicar en el momento: los cobros siguientes ya no la encuentran vigente.
  async desactivar(id: number): Promise<Promocion> {
    await this.obtenerPorId(id);
    const desactivada = await this.repositorio.desactivar(id);
    if (!desactivada) throw new ConflictError("La promoción ya está desactivada");
    return conEstado(desactivada);
  }

  vigenteParaPlan(idPlan: number, fecha: Date): Promise<PromocionAplicable | null> {
    return this.repositorio.vigenteParaPlan(idPlan, fecha);
  }

  async descuentoAplicable(
    idPromocion: number,
    idPlan: number,
    fecha: Date,
    precio: number,
  ): Promise<DescuentoAplicado | null> {
    const promocion = await this.repositorio.buscarAplicable(idPromocion, idPlan, fecha);
    return promocion ? { ...promocion, descuento: descuentoSobre(precio, promocion) } : null;
  }

  private async obtenerEditable(id: number): Promise<Promocion> {
    const promocion = await this.obtenerPorId(id);
    if (promocion.estado === "VENCIDA") throw new ConflictError("Una promoción vencida no se edita");
    if (promocion.estado === "DESACTIVADA") throw new ConflictError("Una promoción desactivada no se edita");
    return promocion;
  }

  private resolver(resultado: ResultadoGuardado): PromocionGuardada {
    if (resultado.resultado === "superpuesta") {
      throw new ConflictError(
        `El plan ${resultado.id_plan} ya tiene otra promoción activa en esas fechas: no se superponen`,
      );
    }
    if (resultado.resultado === "codigo-repetido") {
      throw new ConflictError("Ya existe una promoción con ese código");
    }
    return resultado.promocion;
  }
}

// Las mismas reglas que el schema del alta, para los datos que resultan de una edición parcial.
function validarDatos({ tipo_descuento, valor, fecha_desde, fecha_hasta }: DatosPromocion): void {
  if (tipo_descuento === "PORCENTAJE" && valor > MAXIMO_PORCENTAJE) {
    throw new ValidationError("Un descuento en porcentaje no puede superar el 100 %");
  }
  if (fecha_hasta < fecha_desde) {
    throw new ValidationError("La fecha hasta no puede ser anterior a la fecha desde");
  }
}
