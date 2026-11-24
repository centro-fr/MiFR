import type { motivo_baja } from "@prisma/client";
import { ALUMNOS, type AlumnoDelElenco, type InscripcionDelElenco } from "./elenco.js";
import { diasEntre, sumarDias } from "./historia.js";

// Los alumnos que llegaron al centro en los dos años anteriores al de la carga y en los primeros meses
// del actual, antes de la historia del elenco. Dan las altas y las bajas que compara año contra año el
// reporte de inscripciones (US-35). La mayoría ya se fue; los que siguen entrenan en las franjas de la
// tarde, que así aparecen moderadas, casi llenas y completas en el mapa de ocupación (US-37).

const ANIOS_DE_HISTORIA = 2;

// Altas por mes, de enero a diciembre, según cuántos años antes de la carga. Picos en marzo (la vuelta
// del verano) y en septiembre (la previa del verano); diciembre y enero, flojos.
const ALTAS_POR_MES: Record<number, number[]> = {
  2: [2, 4, 9, 7, 5, 4, 3, 5, 6, 6, 4, 2],
  1: [3, 6, 11, 9, 6, 5, 4, 6, 8, 7, 5, 3],
  0: [3, 5, 8, 6, 4, 4, 3, 5, 4, 3, 3, 2],
};

// Lo histórico termina antes de la primera alta del elenco, con margen por el corrimiento que hace
// planearPagos para que cada perfil de pago termine hoy en su estado.
const MARGEN_ANTES_DEL_ELENCO = 45;

interface FranjaOcupada {
  plan: string;
  actividad: string;
  hora: string;
  dias?: number[];
  cuantos: number;
}

// Con el elenco, cada franja queda en un nivel distinto del mapa de ocupación:
// - Funcional 18:00 (lun, mié y vie): 11 de 12, casi lleno. Queda el lugar de la pre-inscripta Sofía
//   Medina (lun y mié), que se puede dar de alta en la demo y completar la franja.
// - Training 19:00: 12 de 12 el lunes y el miércoles; el viernes, con el cupo propio de 15, moderado.
// - HIIT 20:00: moderado; el cambio de plan programado de Valentina López le suma el viernes.
// - Bootyband 18:00 (mar y jue): moderado. GAP 19:00: completo. Combat 20:00: casi lleno.
// - Personalizado 09:00 (mar y jue): 4 de 4, completo.
const FRANJAS_DE_LOS_QUE_SIGUEN: FranjaOcupada[] = [
  { plan: "Intermedio", actividad: "FUNCIONAL", hora: "18:00", cuantos: 8 },
  { plan: "Intermedio", actividad: "TRAINING", hora: "19:00", cuantos: 9 },
  { plan: "Intermedio", actividad: "HIIT", hora: "20:00", cuantos: 6 },
  { plan: "Básico", actividad: "BOOTYBAND", hora: "18:00", dias: [2, 4], cuantos: 5 },
  { plan: "Básico", actividad: "GAP", hora: "19:00", dias: [2, 4], cuantos: 10 },
  { plan: "Básico", actividad: "COMBAT", hora: "20:00", dias: [2, 4], cuantos: 9 },
  { plan: "Personalizado 2 días", actividad: "PERSONALIZADO", hora: "09:00", dias: [2, 4], cuantos: 2 },
];

type PlanDeInscripcion = Pick<InscripcionDelElenco, "plan" | "actividad" | "hora" | "dias">;

// Los que se fueron cursaban repartidos en toda la grilla: ya no ocupan lugar.
const PLANES_DE_LOS_QUE_SE_FUERON: PlanDeInscripcion[] = [
  { plan: "Intermedio", actividad: "FUNCIONAL", hora: "07:00" },
  { plan: "Básico", actividad: "ACONDICIONAMIENTO", hora: "08:00", dias: [2, 4] },
  { plan: "Intermedio", actividad: "HIIT", hora: "10:00" },
  { plan: "Full", actividad: "FUNCIONAL", hora: "21:00" },
  { plan: "Básico", actividad: "POWER", hora: "17:00", dias: [1, 3] },
  { plan: "Básico", actividad: "BOOTYBAND", hora: "18:00", dias: [2, 4] },
  { plan: "Intermedio", actividad: "FUNCIONAL", hora: "18:00" },
  { plan: "Básico", actividad: "COMBAT", hora: "20:00", dias: [2, 4] },
  { plan: "Intermedio", actividad: "TRAINING", hora: "19:00" },
];

const BAJAS: { motivo: motivo_baja; detalle: string }[] = [
  { motivo: "ECONOMICO", detalle: "No le alcanza para la cuota este mes" },
  { motivo: "ABANDONO", detalle: "Dejó de venir y no respondió los mensajes" },
  { motivo: "MUDANZA", detalle: "Se mudó a San Salvador de Jujuy" },
  { motivo: "SALUD", detalle: "Lesión de rodilla: el traumatólogo le indicó reposo" },
  { motivo: "ABANDONO", detalle: "Dejó de venir después de las vacaciones" },
  { motivo: "OTRO", detalle: "Le cambiaron el horario de trabajo y no llega a ninguna clase" },
  { motivo: "ECONOMICO", detalle: "Se quedó sin trabajo" },
  { motivo: "MUDANZA", detalle: "Se fue a estudiar a Salta" },
];

// Cuántos meses entrenaron los que se fueron: muchos en los primeros tres, algunos más de un año.
const MESES_DE_PERMANENCIA = [1, 3, 7, 2, 12, 5, 9, 2, 15, 4, 6, 1, 10, 3, 8, 2, 18, 5];

const NOMBRES = [
  "Agustina",
  "Alejandro",
  "Andrea",
  "Ariel",
  "Carla",
  "César",
  "Daniela",
  "Diego",
  "Elena",
  "Emanuel",
  "Fabiana",
  "Fernando",
  "Gabriel",
  "Guadalupe",
  "Hugo",
  "Inés",
  "Javier",
  "Josefina",
  "Leonardo",
  "Liliana",
  "Lorenzo",
  "Luciana",
  "Marcelo",
  "María José",
  "Mariano",
  "Mónica",
  "Néstor",
  "Oscar",
  "Paola",
  "Raúl",
  "Rocío",
  "Sandra",
  "Sergio",
  "Silvina",
  "Teresa",
  "Ulises",
  "Vanesa",
  "Walter",
  "Ximena",
  "Zoe",
];

const APELLIDOS = [
  "Abán",
  "Alancay",
  "Benavídez",
  "Bejarano",
  "Cabana",
  "Choque",
  "Colque",
  "Cruz",
  "Chauque",
  "Díaz",
  "Erazo",
  "Flores",
  "Guerrero",
  "Guzmán",
  "Huanca",
  "Jerez",
  "Lamas",
  "Liquín",
  "Maidana",
  "Mamaní",
  "Mendoza",
  "Molina",
  "Ontiveros",
  "Ortiz",
  "Puca",
  "Quispe",
  "Ramos",
  "Rivero",
  "Sajama",
  "Sánchez",
  "Soria",
  "Tolaba",
  "Torres",
  "Valdiviezo",
  "Vargas",
  "Villa",
  "Yapura",
  "Zerpa",
  "Gutiérrez",
  "Aguirre",
];

function normalizarParaEmail(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
}

/** El primer día que el centro usó el sistema: el 1 de enero de hace dos años. */
export function inicioDeLaHistoria(hoy: Date): Date {
  return new Date(Date.UTC(hoy.getUTCFullYear() - ANIOS_DE_HISTORIA, 0, 1));
}

function fechasDeAlta(hoy: Date): Date[] {
  const primeraDelElenco = Math.max(...ALUMNOS.flatMap((a) => a.inscripciones.map((i) => i.inicioHaceDias)));
  const tope = sumarDias(hoy, -(primeraDelElenco + MARGEN_ANTES_DEL_ELENCO));
  const anioActual = hoy.getUTCFullYear();
  const fechas: Date[] = [];
  for (let aniosAtras = ANIOS_DE_HISTORIA; aniosAtras >= 0; aniosAtras--) {
    ALTAS_POR_MES[aniosAtras].forEach((cuantas, mes) => {
      // Entre el 2 y el 21: el corrimiento al primer día de cursada no la pasa al mes siguiente.
      for (let orden = 0; orden < cuantas; orden++) {
        const dia = new Date(Date.UTC(anioActual - aniosAtras, mes, 2 + Math.floor((orden * 20) / cuantas)));
        if (dia < tope) fechas.push(dia);
      }
    });
  }
  return fechas;
}

// Una lista con un lugar por alumno que sigue, alternando las franjas para que cada una reciba alumnos de
// distintas épocas.
function lugaresDeLosQueSiguen(): PlanDeInscripcion[] {
  const lugares: PlanDeInscripcion[] = [];
  const mayor = Math.max(...FRANJAS_DE_LOS_QUE_SIGUEN.map(({ cuantos }) => cuantos));
  for (let vuelta = 0; vuelta < mayor; vuelta++) {
    for (const { cuantos, ...plan } of FRANJAS_DE_LOS_QUE_SIGUEN) if (vuelta < cuantos) lugares.push(plan);
  }
  return lugares;
}

// Cuánto se quedó: si los meses de la lista lo dejarían todavía en el centro, se acortan.
function fechaDeBaja(alta: Date, indice: number, hoy: Date): Date {
  const tope = sumarDias(hoy, -(10 + (indice % 20)));
  const mesesPosibles = Math.max(1, Math.floor(diasEntre(alta, tope) / 30));
  const meses = 1 + ((MESES_DE_PERMANENCIA[indice % MESES_DE_PERMANENCIA.length] - 1) % mesesPosibles);
  return sumarDias(alta, meses * 30 + (indice % 11));
}

function datosPersonales(indice: number): Omit<AlumnoDelElenco, "asistencia" | "inscripciones"> {
  const nombre = NOMBRES[indice % NOMBRES.length];
  // El corrimiento por vuelta evita repetir la combinación de nombre y apellido.
  const apellido = APELLIDOS[(indice + 7 * Math.floor(indice / NOMBRES.length)) % APELLIDOS.length];
  const anioNacimiento = 1976 + ((indice * 7) % 28);
  const numero = String(indice + 1).padStart(3, "0");
  return {
    nombre,
    apellido,
    dni: String(35_000_000 + (anioNacimiento - 1990) * 900_000 + indice * 997),
    email: `${normalizarParaEmail(nombre)}.${normalizarParaEmail(apellido)}@example.com`,
    telefono: `388 47${numero.slice(0, 1)}-2${numero}`,
    fecha_nacimiento: `${anioNacimiento}-${String((indice % 12) + 1).padStart(2, "0")}-${String((indice % 27) + 1).padStart(2, "0")}`,
    direccion: `Güemes ${100 + indice * 9}`,
    contacto: [`Familiar ${apellido}`, `388 48${numero.slice(0, 1)}-3${numero}`],
    aptoMedico: true,
  };
}

/**
 * Los alumnos históricos para una carga hecha `hoy`. Los que siguen se reparten parejo entre todas las
 * altas, así cada año tiene alumnos que se quedaron.
 */
export function alumnosHistoricos(hoy: Date): AlumnoDelElenco[] {
  const altas = fechasDeAlta(hoy);
  const lugares = lugaresDeLosQueSiguen();
  if (altas.length < lugares.length) {
    throw new Error(`Hay ${altas.length} altas históricas y hacen falta ${lugares.length} que sigan`);
  }
  return altas.map((alta, indice) => {
    const sigue =
      Math.floor(((indice + 1) * lugares.length) / altas.length) >
      Math.floor((indice * lugares.length) / altas.length);
    const forma = indice % 2 === 0 ? "efectivo" : "transferencia";
    const inicioHaceDias = diasEntre(alta, hoy);
    const inscripcion: InscripcionDelElenco = sigue
      ? {
          ...lugares[Math.floor((indice * lugares.length) / altas.length)],
          inicioHaceDias,
          pago: "puntual",
          forma,
        }
      : {
          ...PLANES_DE_LOS_QUE_SE_FUERON[indice % PLANES_DE_LOS_QUE_SE_FUERON.length],
          inicioHaceDias,
          pago: indice % 6 === 5 ? "tarde" : "puntual",
          forma,
          baja: { haceDias: diasEntre(fechaDeBaja(alta, indice, hoy), hoy), ...BAJAS[indice % BAJAS.length] },
        };
    return {
      ...datosPersonales(indice),
      // Constantes pero sin rachas perfectas: no le disputan el ranking al elenco.
      asistencia: 0.8 + (indice % 9) / 100,
      inscripciones: [inscripcion],
    };
  });
}
