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
};
