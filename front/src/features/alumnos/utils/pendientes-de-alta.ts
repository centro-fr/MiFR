import type { HorarioPreInscripcion } from "@/types/alta-definitiva";
import type { DiaSemana } from "@/types/horarios";

// Cómo se muestra una pre-inscripción (US-07). Funciones puras: se testean sin render.

const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: "Lun",
  MARTES: "Mar",
  MIERCOLES: "Mié",
  JUEVES: "Jue",
  VIERNES: "Vie",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

// Se sigue exportando desde acá: la usan el modal de US-07 y el de plan y horarios.
export { formatearPrecio } from "@/utils/moneda";

function enumerar(partes: string[]): string {
  return partes.length < 2 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

export function textoHorarios(horarios: HorarioPreInscripcion[]): string {
  const porFranja = new Map<string, string[]>();
  for (const { dia, horaInicio, horaFin } of horarios) {
    const franja = `${horaInicio} a ${horaFin}`;
    porFranja.set(franja, [...(porFranja.get(franja) ?? []), DIA_CORTO[dia]]);
  }
  return [...porFranja].map(([franja, dias]) => `${enumerar(dias)} ${franja}`).join(" · ");
}

export function actividadesDe(horarios: HorarioPreInscripcion[]): string {
  return [...new Set(horarios.map((h) => h.actividad))].join(", ");
}
