import { z } from "zod";
import { EJERCICIOS_DATASET_ES } from "@/features/rutinas/data/ejercicios-es";

const ejercicioDatasetSchema = z.object({
  id: z.string().min(1).max(10),
  nombre: z.string().min(1).max(80),
  categoria: z.string().min(1).max(100),
  equipamiento: z.string().min(1).max(100),
  instrucciones: z.array(z.string().min(1)).min(1).max(20),
  gif_url: z.string().optional(),
});

const catalogoDatasetSchema = z.array(ejercicioDatasetSchema).min(1).max(2_000);

const CATEGORIAS_ES: Record<string, string> = {
  back: "Espalda",
  cardio: "Cardio",
  chest: "Pecho",
  "lower arms": "Antebrazos",
  "lower legs": "Pantorrillas",
  neck: "Cuello",
  shoulders: "Hombros",
  "upper arms": "Brazos",
  "upper legs": "Piernas",
  waist: "Abdomen",
};

const EQUIPAMIENTOS_ES: Record<string, string> = {
  assisted: "Asistido",
  band: "Banda",
  barbell: "Barra",
  "body weight": "Peso corporal",
  "bosu ball": "Bosu",
  cable: "Polea",
  dumbbell: "Mancuerna",
  "elliptical machine": "Elíptica",
  "ez barbell": "Barra Z",
  hammer: "Martillo",
  kettlebell: "Pesa rusa",
  "leverage machine": "Máquina de palanca",
  "medicine ball": "Balón medicinal",
  "olympic barbell": "Barra olímpica",
  "resistance band": "Banda de resistencia",
  roller: "Rodillo",
  rope: "Cuerda",
  "skierg machine": "SkiErg",
  "sled machine": "Trineo",
  "smith machine": "Máquina Smith",
  "stability ball": "Pelota de estabilidad",
  "stationary bike": "Bicicleta fija",
  "stepmill machine": "Escaladora",
  tire: "Neumático",
  "trap bar": "Barra hexagonal",
  "upper body ergometer": "Ergómetro de tren superior",
  weighted: "Con peso",
  "wheel roller": "Rueda abdominal",
};

export type EjercicioDataset = z.infer<typeof ejercicioDatasetSchema>;

export interface EjercicioSugerido {
  id: string;
  nombre: string;
  grupo_muscular: string;
  equipamiento: string;
  instrucciones?: string[];
  gif_url?: string;
}

let cargaCatalogo: Promise<EjercicioSugerido[]> | null = null;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function traducir(valor: string, traducciones: Record<string, string>): string {
  return traducciones[normalizar(valor)] ?? valor;
}

function aEjercicioSugerido(ejercicio: EjercicioDataset): EjercicioSugerido {
  return {
    id: `dataset-${ejercicio.id}`,
    nombre: ejercicio.nombre,
    grupo_muscular: traducir(ejercicio.categoria, CATEGORIAS_ES),
    equipamiento: traducir(ejercicio.equipamiento, EQUIPAMIENTOS_ES),
    instrucciones: ejercicio.instrucciones,
    ...(ejercicio.gif_url ? { gif_url: ejercicio.gif_url } : {}),
  };
}

export function transformarEjerciciosDataset(
  datos: unknown,
): EjercicioSugerido[] {
  return catalogoDatasetSchema.parse(datos).map(aEjercicioSugerido);
}

export async function cargarEjerciciosDataset(): Promise<EjercicioSugerido[]> {
  if (!cargaCatalogo) {
    cargaCatalogo = fetch(`${import.meta.env.BASE_URL}ejercicios-es.json`)
      .then((respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudo cargar el catálogo de ejercicios");
        return respuesta.json();
      })
      .then(transformarEjerciciosDataset)
      .catch((error: unknown) => {
        cargaCatalogo = null;
        throw error;
      });
  }

  return cargaCatalogo;
}

export function buscarEjerciciosDelCatalogo(
  termino: string,
  catalogo: EjercicioSugerido[],
): EjercicioSugerido[] {
  const busqueda = normalizar(termino.trim());
  if (!busqueda) return [];

  const ejerciciosLocales: EjercicioSugerido[] = EJERCICIOS_DATASET_ES.filter((ejercicio) =>
    normalizar(
      `${ejercicio.nombre} ${ejercicio.grupo_muscular} ${ejercicio.equipamiento}`,
    ).includes(busqueda),
  ).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    grupo_muscular: e.grupo_muscular,
    equipamiento: e.equipamiento,
    ...(e.gif_url ? { gif_url: e.gif_url } : {}),
  }));
  const ejerciciosDataset = catalogo.filter((ejercicio) =>
    normalizar(
      `${ejercicio.nombre} ${ejercicio.grupo_muscular} ${ejercicio.equipamiento} ${(ejercicio.instrucciones ?? []).join(" ")}`,
    ).includes(busqueda),
  );
  const nombresIncluidos = new Set<string>();

  return [...ejerciciosLocales, ...ejerciciosDataset]
    .filter((ejercicio) => {
      const nombreNormalizado = normalizar(ejercicio.nombre);
      if (nombresIncluidos.has(nombreNormalizado)) return false;
      nombresIncluidos.add(nombreNormalizado);
      return true;
    })
    .slice(0, 15);
}

export function resolverGifUrl(
  nombre: string,
  gifDirecto?: string,
  catalogo?: EjercicioSugerido[],
): string | undefined {
  if (gifDirecto) return gifDirecto;
  if (!nombre) return undefined;
  const norm = normalizar(nombre);
  const local = EJERCICIOS_DATASET_ES.find((e) => normalizar(e.nombre) === norm);
  if (local?.gif_url) return local.gif_url;
  const sugerido = catalogo?.find((e) => normalizar(e.nombre) === norm);
  if (sugerido?.gif_url) return sugerido.gif_url;
  const localParcial = EJERCICIOS_DATASET_ES.find(
    (e) => normalizar(e.nombre).includes(norm) || norm.includes(normalizar(e.nombre)),
  );
  return localParcial?.gif_url;
}
