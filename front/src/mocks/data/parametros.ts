// Copia de GET /parametros de la base local (docker mifr-db) al 20/10/2026, con el mismo orden y
// las mismas descripciones (parametros-sistema.catalogo.ts del back). fecha_actualizacion en null:
// todavía rige el valor inicial.

export interface ParametroMock {
  clave: string;
  tipo_dato: "TEXTO" | "ENTERO" | "DECIMAL" | "BOOLEANO";
  valor: string | number | boolean;
  descripcion: string;
  fecha_actualizacion: string | null;
}

const CARGA_INICIAL = "2026-10-13T23:54:36.929Z";

export function parametrosSemilla(): ParametroMock[] {
  return [
    { clave: "DATOS_BANCARIOS_CBU", tipo_dato: "TEXTO", valor: "", descripcion: "CBU de la cuenta a la que transfieren los alumnos", fecha_actualizacion: CARGA_INICIAL },
    { clave: "DATOS_BANCARIOS_ALIAS", tipo_dato: "TEXTO", valor: "", descripcion: "Alias de la cuenta a la que transfieren los alumnos", fecha_actualizacion: CARGA_INICIAL },
    { clave: "DATOS_BANCARIOS_TITULAR", tipo_dato: "TEXTO", valor: "", descripcion: "Titular de la cuenta a la que transfieren los alumnos", fecha_actualizacion: CARGA_INICIAL },
    {
      clave: "VENCIDOS_PUEDEN_ASISTIR",
      tipo_dato: "BOOLEANO",
      valor: true,
      descripcion: "Si un alumno con la cuota vencida puede asistir a clase (aparece con advertencia)",
      fecha_actualizacion: CARGA_INICIAL,
    },
    {
      clave: "MINUTOS_CIERRE_ASISTENCIA",
      tipo_dato: "ENTERO",
      valor: 0,
      descripcion: "Minutos después del fin de la clase en los que la asistencia se sigue pudiendo marcar",
      fecha_actualizacion: CARGA_INICIAL,
    },
    {
      clave: "DIAS_RESERVA_PREINSCRIPCION",
      tipo_dato: "ENTERO",
      valor: 3,
      descripcion: "Días después del inicio en los que una pre-inscripción sin pagar guarda su lugar; después, el cupo se libera",
      fecha_actualizacion: CARGA_INICIAL,
    },
    {
      clave: "DIAS_AVISO_VENCIMIENTO",
      tipo_dato: "ENTERO",
      valor: 3,
      descripcion: "Días antes del vencimiento de la cuota en los que el alumno o su tutor reciben el aviso",
      fecha_actualizacion: null,
    },
    {
      clave: "INASISTENCIAS_CONSECUTIVAS_INACTIVO",
      tipo_dato: "ENTERO",
      valor: 3,
      descripcion: "Inasistencias seguidas desde las que un alumno con la cuota al día figura como inactivo",
      fecha_actualizacion: null,
    },
    {
      clave: "HORA_RESUMEN_DIARIO",
      tipo_dato: "TEXTO",
      valor: "20:00",
      descripcion: "Hora a partir de la cual se genera la notificación del resumen diario a la propietaria (HH:MM)",
      fecha_actualizacion: null,
    },
    {
      clave: "DIA_CIERRE_HONORARIOS",
      tipo_dato: "ENTERO",
      valor: 5,
      descripcion: "Día del mes desde el que se cierran solos los honorarios del mes anterior (1 a 28)",
      fecha_actualizacion: null,
    },
  ];
}
