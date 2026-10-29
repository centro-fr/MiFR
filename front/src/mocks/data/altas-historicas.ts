// Altas de alumnos anteriores para el mock de US-35. Casi todos los alumnos de la semilla tienen la
// misma fecha de alta (01/01/2026), así que con ellos solos el gráfico mostraría todo en enero. Esto
// suma altas de alumnos que no están en db (solo se cuentan: el informe no muestra nombres), con un
// plan y una profesora de la semilla para que los filtros respondan.

export interface AltaHistorica {
  /** AAAA-MM-DD. */
  fecha: string;
  id_plan: number;
  id_profesora: number;
}

// Más altas a principio de año y después del receso de invierno, como cuenta la propietaria.
const ALTAS_POR_MES = [12, 8, 11, 9, 6, 4, 5, 9, 8, 6, 4, 3];
const DESDE_ANIO = 2025;

/** `hasta` es AAAA-MM-DD exclusivo: del mes en curso cuentan solo los días que ya pasaron. */
export function altasHistoricas(idsPlanes: number[], idsProfesoras: number[], hasta: string): AltaHistorica[] {
  const altas: AltaHistorica[] = [];
  const anioHasta = Number(hasta.slice(0, 4));
  for (let anio = DESDE_ANIO; anio <= anioHasta; anio++) {
    ALTAS_POR_MES.forEach((base, indiceMes) => {
      // El año anterior un poco más flojo, para que la comparación entre años tenga sentido.
      const cantidad = anio < anioHasta ? Math.max(base - 2, 1) : base;
      for (let n = 0; n < cantidad; n++) {
        const dia = String(1 + ((n * 7 + indiceMes * 3) % 27)).padStart(2, "0");
        const fecha = `${anio}-${String(indiceMes + 1).padStart(2, "0")}-${dia}`;
        if (fecha >= hasta) continue;
        altas.push({ fecha, id_plan: idsPlanes[(n + indiceMes) % idsPlanes.length], id_profesora: idsProfesoras[(n * 2 + indiceMes) % idsProfesoras.length] });
      }
    });
  }
  return altas;
}
