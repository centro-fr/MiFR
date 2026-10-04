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
