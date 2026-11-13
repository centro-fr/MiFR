import type { CatalogoParametros } from "./parametros-sistema.types.js";

// Valores con los que arranca el centro: los carga el seed sin pisar los que la propietaria ya
// cambió. Largos del DER: valor VARCHAR(100), descripcion VARCHAR(150).
export const CATALOGO_PARAMETROS: CatalogoParametros = {
  DATOS_BANCARIOS_CBU: {
    tipo_dato: "TEXTO",
    valor_inicial: "",
    descripcion: "CBU de la cuenta a la que transfieren los alumnos",
  },
  DATOS_BANCARIOS_ALIAS: {
    tipo_dato: "TEXTO",
    valor_inicial: "",
    descripcion: "Alias de la cuenta a la que transfieren los alumnos",
  },
  DATOS_BANCARIOS_TITULAR: {
    tipo_dato: "TEXTO",
    valor_inicial: "",
    descripcion: "Titular de la cuenta a la que transfieren los alumnos",
  },
  VENCIDOS_PUEDEN_ASISTIR: {
    tipo_dato: "BOOLEANO",
    valor_inicial: "true",
    descripcion: "Si un alumno con la cuota vencida puede asistir a clase (aparece con advertencia)",
  },
  MINUTOS_CIERRE_ASISTENCIA: {
    tipo_dato: "ENTERO",
    valor_inicial: "0",
    descripcion: "Minutos después del fin de la clase en los que la asistencia se sigue pudiendo marcar",
  },
  DIAS_RESERVA_PREINSCRIPCION: {
    tipo_dato: "ENTERO",
    valor_inicial: "3",
    descripcion:
      "Días después del inicio en los que una pre-inscripción sin pagar guarda su lugar; después, el cupo se libera",
  },
  DIAS_AVISO_VENCIMIENTO: {
    tipo_dato: "ENTERO",
    valor_inicial: "3",
    descripcion: "Días antes del vencimiento de la cuota en los que el alumno o su tutor reciben el aviso",
  },
  INASISTENCIAS_CONSECUTIVAS_INACTIVO: {
    tipo_dato: "ENTERO",
    valor_inicial: "3",
    descripcion: "Inasistencias seguidas desde las que un alumno con la cuota al día figura como inactivo",
  },
  HORA_RESUMEN_DIARIO: {
    tipo_dato: "TEXTO",
    valor_inicial: "20:00",
    descripcion:
      "Hora a partir de la cual se genera la notificación del resumen diario a la propietaria (HH:MM)",
  },
  RANKING_MINIMO_CLASES: {
    tipo_dato: "ENTERO",
    valor_inicial: "4",
    descripcion: "Cantidad mínima de clases en el período para figurar en el ranking de asistencia",
  },
  DIA_CIERRE_HONORARIOS: {
    tipo_dato: "ENTERO",
    valor_inicial: "5",
    descripcion: "Día del mes desde el que se cierran solos los honorarios del mes anterior (1 a 28)",
  },
};
