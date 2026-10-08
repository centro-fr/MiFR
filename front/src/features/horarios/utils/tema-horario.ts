import type { ModalidadActividad } from "@/types/actividad";
import type { TemaHorario } from "@/types/horarios";

// Colores de actividad definidos en front/AGENTS.md: grupal azul, personalizada violeta.
// Salen de la modalidad, que viene del back; el front no inventa datos de presentación propios.
const TEMAS: Record<ModalidadActividad, TemaHorario> = {
  GRUPAL: { primary: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD", badgeBg: "#3B82F6", badgeText: "#FFFFFF" },
  PERSONALIZADA: { primary: "#6D28D9", bg: "#EDE9FE", border: "#C4B5FD", badgeBg: "#8B5CF6", badgeText: "#FFFFFF" },
};

export function temaDeModalidad(modalidad: ModalidadActividad): TemaHorario {
  return TEMAS[modalidad];
}
