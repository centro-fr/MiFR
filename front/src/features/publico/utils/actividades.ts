import { Activity, Dumbbell, Flame, HeartPulse, Smile, Swords, Target, Zap, type LucideIcon } from "lucide-react";

// El centro abre de lunes a sábado: el back numera los días de 1 (lunes) a 6 (sábado).
const DIAS_ABREVIADOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function diasAbreviados(dias: number[]): string {
  return dias.map((dia) => DIAS_ABREVIADOS[dia - 1] ?? "").join(" · ");
}

// Tres días o más seguidos se resumen como rango ("Lun a Vie"); si no, se listan ("Mar · Jue").
export function diasResumidos(dias: number[]): string {
  const ordenados = [...dias].sort((a, b) => a - b);
  const primero = ordenados[0];
  const ultimo = ordenados.at(-1);
  const sonSeguidos = primero !== undefined && ultimo !== undefined && ultimo - primero === ordenados.length - 1;
  if (ordenados.length >= 3 && sonSeguidos) {
    return `${DIAS_ABREVIADOS[primero - 1]} a ${DIAS_ABREVIADOS[ultimo - 1]}`;
  }
  return diasAbreviados(ordenados);
}

const NOMBRES_DE_DIAS =["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const INICIALES_DE_DIAS = ["L", "M", "M", "J", "V", "S"];

export interface DiaDeLaSemana {
  dia: number;
  inicial: string;
  conClase: boolean;
}

// La semana entera, de lunes a sábado, marcando los días en que se da la actividad.
export function semanaDeLaActividad(dias: number[]): DiaDeLaSemana[] {
  return INICIALES_DE_DIAS.map((inicial, indice) => ({
    dia: indice + 1,
    inicial,
    conClase: dias.includes(indice + 1),
  }));
}

// "lunes, miércoles y viernes": lo que lee un lector de pantalla en lugar de las iniciales.
export function diasEnPalabras(dias: number[]): string {
  const nombres = dias.map((dia) => NOMBRES_DE_DIAS[dia - 1]).filter(Boolean);
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

// El ícono de cada actividad sale de su nombre, que es lo que carga la propietaria. Es solo
// decoración: una actividad nueva que no coincide con ninguna palabra lleva la pesa.
const ICONOS: [RegExp, LucideIcon][] = [
  [/hiit|intervalo/i, Flame],
  [/combat|box|kick/i, Swords],
  [/kid|niñ|chic/i, Smile],
  [/personaliz/i, Target],
  [/gap|gl[uú]te|abdom/i, Activity],
  [/training|cross/i, Zap],
  [/\+\s*\d+|mayores|adult/i, HeartPulse],
];

export function iconoDeActividad(nombre: string): LucideIcon {
  return ICONOS.find(([patron]) => patron.test(nombre))?.[1] ?? Dumbbell;
}
