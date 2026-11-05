// Altas de alumnos anteriores para el mock de US-35. Casi todos los alumnos de la semilla tienen la
// misma fecha de alta (01/01/2026), así que con ellos solos el gráfico mostraría todo en enero. Esto
// suma altas de alumnos que no están en db (solo se cuentan: el informe no muestra nombres), con un
// plan y una profesora de la semilla para que los filtros respondan.

export type MotivoBajaMock = "ABANDONO" | "MUDANZA" | "SALUD" | "ECONOMICO" | "CAMBIO_PLAN" | "OTRO";

export interface AltaHistorica {
  /** AAAA-MM-DD. */
  fecha: string;
  id_plan: number;
  id_profesora: number;
  /** Si después se fue: cuándo (AAAA-MM-DD) y por qué. */
  baja: { fecha: string; motivo: MotivoBajaMock } | null;
}

// Uno de cada tres se va: los días que se quedó y el motivo van rotando, con más abandono y motivo
// económico, como pasa en el centro.
const DIAS_QUE_SE_QUEDA = [25, 50, 80, 130, 200, 300, 420];
const MOTIVOS: MotivoBajaMock[] = ["ABANDONO", "ECONOMICO", "ABANDONO", "MUDANZA", "ECONOMICO", "SALUD", "ABANDONO", "OTRO", "CAMBIO_PLAN"];

function sumarDias(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function bajaDe(fecha: string, indice: number, hasta: string): AltaHistorica["baja"] {
  if (indice % 3 !== 0) return null;
  const fechaBaja = sumarDias(fecha, DIAS_QUE_SE_QUEDA[indice % DIAS_QUE_SE_QUEDA.length]);
  return fechaBaja < hasta ? { fecha: fechaBaja, motivo: MOTIVOS[Math.floor(indice / 3) % MOTIVOS.length] } : null;
}

// Más altas a principio de año y después del receso de invierno, como cuenta la propietaria.
const ALTAS_POR_MES = [12, 8, 11, 9, 6, 4, 5, 9, 8, 6, 4, 3];
const DESDE_ANIO = 2024;

/** `hasta` es AAAA-MM-DD exclusivo: del mes en curso cuentan solo los días que ya pasaron. */
export function altasHistoricas(idsPlanes: number[], idsProfesoras: number[], hasta: string): AltaHistorica[] {
  const altas: AltaHistorica[] = [];
  const anioHasta = Number(hasta.slice(0, 4));
  for (let anio = DESDE_ANIO; anio <= anioHasta; anio++) {
    ALTAS_POR_MES.forEach((base, indiceMes) => {
      // Los años anteriores un poco más flojos, para que la comparación entre años tenga sentido.
      const cantidad = Math.max(base - 2 * (anioHasta - anio), 1);
      for (let n = 0; n < cantidad; n++) {
        const dia = String(1 + ((n * 7 + indiceMes * 3) % 27)).padStart(2, "0");
        const fecha = `${anio}-${String(indiceMes + 1).padStart(2, "0")}-${dia}`;
        if (fecha >= hasta) continue;
        altas.push({
          fecha,
          id_plan: idsPlanes[(n + indiceMes) % idsPlanes.length],
          id_profesora: idsProfesoras[(n * 2 + indiceMes) % idsProfesoras.length],
          baja: bajaDe(fecha, altas.length, hasta),
        });
      }
    });
  }
  return altas;
}
