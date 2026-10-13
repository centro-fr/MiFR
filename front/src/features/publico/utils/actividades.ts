import { Activity, Dumbbell, Flame, HeartPulse, Smile, Swords, Target, Zap, type LucideIcon } from "lucide-react";

// El centro abre de lunes a sábado: el back numera los días de 1 (lunes) a 6 (sábado).
const DIAS_ABREVIADOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function diasAbreviados(dias: number[]): string {
  return dias.map((dia) => DIAS_ABREVIADOS[dia - 1] ?? "").join(" · ");
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
