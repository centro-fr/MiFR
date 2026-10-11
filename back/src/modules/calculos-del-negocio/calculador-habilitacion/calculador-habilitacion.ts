import type { DatosHabilitacion, EstadoHabilitacion, Habilitacion } from "./calculador-habilitacion.types.js";
import type { ICalculoHabilitacion } from "./interface/i-calculo-habilitacion.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// AL_DIA hasta el vencimiento inclusive; POR_VENCER durante los días de gracia que siguen; VENCIDA
// después. Con 0 días de gracia no hay POR_VENCER: pasa de AL_DIA a VENCIDA.
function estadoMensual(diasRestantes: number, diasGracia: number): EstadoHabilitacion {
  if (diasRestantes >= 0) return "AL_DIA";
  if (diasRestantes >= -diasGracia) return "POR_VENCER";
  return "VENCIDA";
}

// Vigente el día de la clase; vencida desde el siguiente. No tiene días de gracia.
function estadoClaseSuelta(diasRestantes: number): EstadoHabilitacion {
  return diasRestantes >= 0 ? "CLASE_SUELTA_VIGENTE" : "CLASE_SUELTA_VENCIDA";
}

// Cálculo puro: recibe todo lo que necesita, también el "hoy", y no lee la base ni la hora del
// servidor. La habilitación no se guarda: se calcula cada vez que se consulta.
export class CalculadorHabilitacion implements ICalculoHabilitacion {
  calcular(datos: DatosHabilitacion): Habilitacion {
    const { tipoPlan, vencimiento, diasGracia, tienePagoPendiente, vencidosPuedenAsistir, hoy } = datos;

    // Sin una cuota paga no hay vencimiento: una transferencia pendiente no cambia eso (US-16).
    if (vencimiento === null) {
      return {
        estado: "PENDIENTE_DE_PAGO",
        fechaVencimiento: null,
        diasRestantes: null,
        puedeAsistir: false,
      };
    }

    // Las dos fechas son DATE a las 00:00 UTC, así que la diferencia es siempre de días enteros.
    const diasRestantes = Math.round((vencimiento.getTime() - hoy.getTime()) / MS_POR_DIA);
    const estado =
      tipoPlan === "MENSUAL" ? estadoMensual(diasRestantes, diasGracia) : estadoClaseSuelta(diasRestantes);

    // En AL_DIA, POR_VENCER y CLASE_SUELTA_VIGENTE siempre puede asistir. En los vencidos lo decide
    // la política del centro, salvo que haya un pago pendiente, que nunca bloquea (US-16).
    const estaVencido = estado === "VENCIDA" || estado === "CLASE_SUELTA_VENCIDA";
    const puedeAsistir = !estaVencido || tienePagoPendiente || vencidosPuedenAsistir;

    return { estado, fechaVencimiento: new Date(vencimiento.getTime()), diasRestantes, puedeAsistir };
  }
}
