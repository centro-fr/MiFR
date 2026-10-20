// El centro opera en Argentina, pero el servidor (Render) y la base (Neon) corren en UTC. Prisma
// guarda las columnas DATE con el día UTC del Date recibido, así que una baja hecha después de las
// 21:00 quedaría con la fecha del día siguiente. Se calcula el día argentino de forma explícita,
// sin depender de la variable TZ del proceso.
const ZONA_HORARIA_ARGENTINA = "America/Argentina/Buenos_Aires";

const formateadorDiaArgentino = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_ARGENTINA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Devuelve el día calendario de Argentina a las 00:00 UTC, que es como Prisma espera un DATE.
// El locale en-CA se elige porque formatea como AAAA-MM-DD, el formato ISO.
export function fechaActualArgentina(ahora: Date = new Date()): Date {
  return new Date(`${formateadorDiaArgentino.format(ahora)}T00:00:00Z`);
}

const formateadorHoraArgentina = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA_HORARIA_ARGENTINA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Devuelve la hora argentina actual en formato HH:MM (24 hs).
export function horaActualArgentina(ahora: Date = new Date()): string {
  return formateadorHoraArgentina.format(ahora);
}

// Argentina está en UTC-3 todo el año: no tiene horario de verano desde 2009.
const HORAS_DETRAS_DE_UTC = 3;

export function rangoDeDiasArgentinos(desde: Date, hasta: Date): { inicio: Date; fin: Date };
export function rangoDeDiasArgentinos(desde?: Date, hasta?: Date): { inicio?: Date; fin?: Date };
export function rangoDeDiasArgentinos(desde?: Date, hasta?: Date): { inicio?: Date; fin?: Date } {
  const medianoche = new Date(0);
  return {
    inicio: desde && instanteArgentino(desde, medianoche),
    fin: hasta && instanteArgentino(new Date(hasta.getTime() + 24 * 60 * 60 * 1000), medianoche),
  };
}

// Junta un día (columna DATE) y una hora del centro (columna TIME, que Prisma entrega el
// 1970-01-01 en UTC) en el instante real. Una clase que termina a las 23:00 del 12/10 termina
// a las 02:00 UTC del 13/10.
export function instanteArgentino(dia: Date, hora: Date): Date {
  return new Date(
    Date.UTC(
      dia.getUTCFullYear(),
      dia.getUTCMonth(),
      dia.getUTCDate(),
      hora.getUTCHours() + HORAS_DETRAS_DE_UTC,
      hora.getUTCMinutes(),
      hora.getUTCSeconds(),
    ),
  );
}
