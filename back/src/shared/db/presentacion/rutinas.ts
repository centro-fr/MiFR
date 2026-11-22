import type { PrismaClient } from "@prisma/client";
import {
  MEDIDAS,
  type CodigoMedida,
} from "../../../modules/gestion-rutinas-y-progreso/progreso/medida.catalogo.js";
import type { InscripcionCargada } from "./cargar.js";
import { CARLA, LUCIA, SOFIA } from "./elenco.js";
import { crearAzar, diasEntre, enteroAlAzar, sumarDias, type Azar } from "./historia.js";

// Rutinas y mediciones de progreso (US-27): los personalizados tienen rutina y una medición por mes
// desde la pre-inscripción, que pide peso y talla (US-05). Algunos grupales tienen una rutina de
// complemento, y los menores de Mariana López las de Kid Fit (el selector de menores, US-28).

// Alias y no interfaces: el JSON de Prisma pide tipos con firma de índice, que las interfaces no tienen.
type Ejercicio = {
  nombre: string;
  series: number;
  repeticiones: string;
  notas: string | null;
};

type Dia = {
  nombre: string;
  ejercicios: Ejercicio[];
};

function ejercicio(
  nombre: string,
  series: number,
  repeticiones: string,
  notas: string | null = null,
): Ejercicio {
  return { nombre, series, repeticiones, notas };
}

const TREN_INFERIOR: Dia = {
  nombre: "Tren inferior",
  ejercicios: [
    ejercicio("Sentadilla goblet", 4, "12"),
    ejercicio("Peso muerto rumano", 4, "10", "Espalda neutra, bajar hasta media tibia"),
    ejercicio("Estocadas alternadas", 3, "12 por pierna"),
    ejercicio("Hip thrust", 4, "12"),
    ejercicio("Plancha frontal", 3, "40 s"),
  ],
};

const TREN_SUPERIOR: Dia = {
  nombre: "Tren superior y core",
  ejercicios: [
    ejercicio("Press de banca con mancuernas", 4, "10"),
    ejercicio("Remo con mancuerna a una mano", 4, "12"),
    ejercicio("Press militar sentado", 3, "10"),
    ejercicio("Jalón al pecho", 3, "12"),
    ejercicio("Dead bug", 3, "12"),
  ],
};

const METABOLICO: Dia = {
  nombre: "Full body metabólico",
  ejercicios: [
    ejercicio("Kettlebell swing", 4, "15"),
    ejercicio("Burpees", 4, "10"),
    ejercicio("Remo en máquina", 4, "250 m"),
    ejercicio("Farmer walk", 3, "30 m"),
    ejercicio("Mountain climbers", 3, "30 s"),
  ],
};

const COMPLEMENTO_DE_FUERZA: Dia[] = [
  {
    nombre: "Lunes y miércoles",
    ejercicios: [
      ejercicio("Sentadilla con barra", 5, "5"),
      ejercicio("Dominadas asistidas", 4, "8"),
      ejercicio("Press inclinado con mancuernas", 4, "10"),
    ],
  },
  {
    nombre: "Viernes",
    ejercicios: [
      ejercicio("Peso muerto convencional", 5, "5", "Subir la carga solo si la técnica se mantiene"),
      ejercicio("Fondos en paralelas", 3, "10"),
      ejercicio("Remo invertido", 3, "12"),
    ],
  },
];

const CIRCUITO_MOTRIZ: Dia[] = [
  {
    nombre: "Circuito motriz",
    ejercicios: [
      ejercicio("Escalera de coordinación", 3, "4 pasadas"),
      ejercicio("Lanzamiento de pelota medicinal", 3, "10"),
      ejercicio("Carrera con cambios de dirección", 4, "20 m"),
      ejercicio("Plancha frontal", 3, "20 s"),
    ],
  },
];

const DNI_CON_COMPLEMENTO = ["39777888", "38456789"];
const DNI_MENORES_DE_MARIANA = ["53234567", "55321987"];
// Benjamín López tiene además dos mediciones (front/src/mocks/data/rutinas.ts).
const DNI_CON_MEDICIONES_DE_KID_FIT = ["55321987"];

interface Ids {
  idProfesora: Map<string, number>;
}

export async function cargarRutinasYProgreso(
  prisma: PrismaClient,
  hoy: Date,
  inscripciones: InscripcionCargada[],
  idProfesora: Map<string, number>,
): Promise<void> {
  const ids = { idProfesora };
  const tipos = await cargarTiposDeMedida(prisma);
  const cursando = inscripciones.filter(({ preinscripta, hasta }) => !preinscripta && hasta === null);

  for (const inscripcion of cursando) {
    const azar = crearAzar(`progreso-${inscripcion.alumno.dni}-${inscripcion.id_inscripcion}`);
    const { dni } = inscripcion.alumno;
    if (inscripcion.definicion.actividad === "PERSONALIZADO") {
      const dias =
        inscripcion.definicion.plan === "Personalizado 3 días"
          ? [TREN_INFERIOR, TREN_SUPERIOR, METABOLICO]
          : [TREN_INFERIOR, TREN_SUPERIOR];
      await cargarRutinas(prisma, hoy, inscripcion, CARLA, dias, ids);
      await cargarMediciones(prisma, hoy, inscripcion, CARLA, tipos, azar, ids, false);
    } else if (DNI_CON_COMPLEMENTO.includes(dni)) {
      await cargarRutinas(prisma, hoy, inscripcion, LUCIA, COMPLEMENTO_DE_FUERZA, ids);
    } else if (DNI_MENORES_DE_MARIANA.includes(dni)) {
      await cargarRutinas(prisma, hoy, inscripcion, SOFIA, CIRCUITO_MOTRIZ, ids);
      if (DNI_CON_MEDICIONES_DE_KID_FIT.includes(dni)) {
        await cargarMediciones(prisma, hoy, inscripcion, SOFIA, tipos, azar, ids, true);
      }
    }
  }
}

// registro-progreso crea los tipos al usarlos; acá se cargan todos los del catálogo de una vez.
async function cargarTiposDeMedida(prisma: PrismaClient): Promise<Map<CodigoMedida, number>> {
  const tipos = new Map<CodigoMedida, number>();
  for (const [codigo, { unidad }] of Object.entries(MEDIDAS) as [CodigoMedida, { unidad: string }][]) {
    const tipo = await prisma.tipos_medida.upsert({
      where: { codigo },
      update: {},
      create: { codigo, unidad },
    });
    tipos.set(codigo, tipo.id_tipo_medida);
  }
  return tipos;
}

// Quien lleva más de tres meses ya cambió una vez de rutina: la anterior queda cerrada (solo una
// vigente por alumno).
async function cargarRutinas(
  prisma: PrismaClient,
  hoy: Date,
  inscripcion: InscripcionCargada,
  emailProfesora: string,
  dias: Dia[],
  ids: Ids,
): Promise<void> {
  const id_profesora = ids.idProfesora.get(emailProfesora) as number;
  const base = { id_alumno: inscripcion.id_alumno, id_profesora };
  let desde = inscripcion.desde;
  if (diasEntre(inscripcion.desde, hoy) > 90) {
    const cambio = sumarDias(inscripcion.desde, 60);
    await prisma.rutinas.create({
      data: {
        ...base,
        nombre: "Adaptación",
        fecha_desde: inscripcion.desde,
        fecha_hasta: sumarDias(cambio, -1),
        contenido: { dias: dias.map((dia) => ({ ...dia, ejercicios: dia.ejercicios.slice(0, 3) })) },
        observaciones: "Primer mes: técnica y volumen bajo",
        activa: false,
      },
    });
    desde = cambio;
  }
  await prisma.rutinas.create({
    data: {
      ...base,
      nombre: dias.length > 1 ? `Fuerza ${dias.length} días` : dias[0].nombre,
      fecha_desde: desde,
      contenido: { dias },
      observaciones: inscripcion.alumno.observaciones ?? null,
      activa: true,
    },
  });
}

interface MedidasBase {
  PESO: number;
  TALLA: number;
  CINTURA: number;
  CADERA: number;
  GRASA_CORPORAL: number;
}

function medidasIniciales(azar: Azar, esMenor: boolean): MedidasBase {
  if (esMenor) {
    return {
      PESO: enteroAlAzar(azar, 28, 38),
      TALLA: enteroAlAzar(azar, 128, 145),
      CINTURA: 58,
      CADERA: 66,
      GRASA_CORPORAL: 18,
    };
  }
  return {
    PESO: enteroAlAzar(azar, 60, 90),
    TALLA: enteroAlAzar(azar, 158, 184),
    CINTURA: enteroAlAzar(azar, 74, 96),
    CADERA: enteroAlAzar(azar, 92, 108),
    GRASA_CORPORAL: enteroAlAzar(azar, 20, 31),
  };
}

// Una medición por mes. Los adultos bajan de a poco peso, cintura y grasa; un menor crece.
async function cargarMediciones(
  prisma: PrismaClient,
  hoy: Date,
  inscripcion: InscripcionCargada,
  emailProfesora: string,
  tipos: Map<CodigoMedida, number>,
  azar: Azar,
  ids: Ids,
  esMenor: boolean,
): Promise<void> {
  const base = medidasIniciales(azar, esMenor);
  const id_profesora = ids.idProfesora.get(emailProfesora) as number;
  for (let mes = 0, dia = inscripcion.desde; dia <= hoy; mes++, dia = sumarDias(dia, 30)) {
    // La primera es la de la pre-inscripción: solo peso y talla (US-05).
    const valores: Partial<Record<CodigoMedida, number>> =
      mes === 0
        ? { PESO: base.PESO, TALLA: base.TALLA }
        : esMenor
          ? { PESO: base.PESO + mes * 0.6, TALLA: base.TALLA + mes * 0.8 }
          : {
              PESO: base.PESO - mes * (0.4 + azar() * 0.5),
              TALLA: base.TALLA,
              CINTURA: base.CINTURA - mes * (0.6 + azar() * 0.6),
              CADERA: base.CADERA - mes * (0.3 + azar() * 0.4),
              GRASA_CORPORAL: base.GRASA_CORPORAL - mes * (0.3 + azar() * 0.4),
            };
    await prisma.registros_progreso.create({
      data: {
        id_alumno: inscripcion.id_alumno,
        id_profesora,
        fecha: dia,
        observaciones: mes === 0 ? "Medidas de la pre-inscripción" : null,
        medidas: {
          create: Object.entries(valores).map(([codigo, valor]) => ({
            id_tipo_medida: tipos.get(codigo as CodigoMedida) as number,
            valor: Math.round(valor * 10) / 10,
          })),
        },
      },
    });
  }
}
