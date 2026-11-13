export interface EjercicioCatalogo {
  id: string;
  nombre: string;
  grupo_muscular: string;
  equipamiento: string;
  iniciales?: string;
  tiene_gif?: boolean;
  gif_url?: string;
}

export const EJERCICIOS_DATASET_ES: EjercicioCatalogo[] = [
  // PIERNAS / CUÁDRICEPS / GLÚTEOS / ISQUIOTIBIALES
  { id: "001", nombre: "Sentadilla con barra", grupo_muscular: "Piernas", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0043-qXTaZnJ.gif" },
  { id: "002", nombre: "Sentadilla goblet", grupo_muscular: "Piernas", equipamiento: "Kettlebell", tiene_gif: true, gif_url: "videos/0534-ZA8b5hc.gif" },
  { id: "003", nombre: "Sentadilla sumo", grupo_muscular: "Piernas", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/3142-dzz6BiV.gif" },
  { id: "004", nombre: "Sentadilla en Smith", grupo_muscular: "Piernas", equipamiento: "Máquina Smith", tiene_gif: true, gif_url: "videos/0748-trqKQv2.gif" },
  { id: "005", nombre: "Sentadilla búlgara", grupo_muscular: "Piernas", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0381-SSsBDwB.gif" },
  { id: "006", nombre: "Sentadilla frontal", grupo_muscular: "Piernas", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0042-zG0zs85.gif" },
  { id: "007", nombre: "Sentadilla libre", grupo_muscular: "Piernas", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0808-4OaumBr.gif" },
  { id: "008", nombre: "Sentadilla hack", grupo_muscular: "Piernas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0464-CosupLu.gif" },
  { id: "009", nombre: "Prensa de piernas 45°", grupo_muscular: "Piernas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0739-10Z2DXU.gif" },
  { id: "010", nombre: "Estocadas", grupo_muscular: "Piernas", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0336-RRWFUcw.gif" },
  { id: "011", nombre: "Estocadas caminando", grupo_muscular: "Piernas", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0335-xMjBKwn.gif" },
  { id: "012", nombre: "Estocadas hacia atrás", grupo_muscular: "Piernas", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0381-SSsBDwB.gif" },
  { id: "013", nombre: "Sillón de cuádriceps", grupo_muscular: "Piernas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0585-my33uHU.gif" },
  { id: "014", nombre: "Extensión de piernas", grupo_muscular: "Piernas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0585-my33uHU.gif" },
  { id: "015", nombre: "Peso muerto tradicional", grupo_muscular: "Espalda baja / Isquiotibiales", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0032-ila4NZS.gif" },
  { id: "016", nombre: "Peso muerto rumano", grupo_muscular: "Isquiotibiales", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0085-wQ2c4XD.gif" },
  { id: "017", nombre: "Peso muerto sumo", grupo_muscular: "Glúteos / Piernas", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0118-SzX3uzM.gif" },
  { id: "018", nombre: "Peso muerto con mancuernas", grupo_muscular: "Isquiotibiales", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0434-oom75KC.gif" },
  { id: "019", nombre: "Camilla de isquiotibiales", grupo_muscular: "Isquiotibiales", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0599-Zg3XY7P.gif" },
  { id: "020", nombre: "Curl femoral acostado", grupo_muscular: "Isquiotibiales", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0599-Zg3XY7P.gif" },
  { id: "021", nombre: "Curl femoral sentado", grupo_muscular: "Isquiotibiales", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0603-67n3r98.gif" },
  { id: "022", nombre: "Hip thrust", grupo_muscular: "Glúteos", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/1468-xgsGFVM.gif" },
  { id: "023", nombre: "Puente de glúteos", grupo_muscular: "Glúteos", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1409-qKBpF7I.gif" },
  { id: "024", nombre: "Puente de glúteos con banda", grupo_muscular: "Glúteos", equipamiento: "Banda elástica", tiene_gif: true, gif_url: "videos/3562-qg2PGl6.gif" },
  { id: "025", nombre: "Patada de glúteos en polea", grupo_muscular: "Glúteos", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0178-goJ6ezq.gif" },
  { id: "026", nombre: "Abductores en máquina", grupo_muscular: "Glúteos", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/1427-mQ1tBXn.gif" },
  { id: "027", nombre: "Aductores en máquina", grupo_muscular: "Piernas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0609-bLyQokI.gif" },
  { id: "028", nombre: "Elevación de talones", grupo_muscular: "Pantorrillas", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0419-laVRfDf.gif" },
  { id: "029", nombre: "Elevación de talones de pie", grupo_muscular: "Pantorrillas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0606-aaXr7ld.gif" },
  { id: "030", nombre: "Elevación de talones sentado", grupo_muscular: "Pantorrillas", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0605-ykUOVze.gif" },

  // PECHO
  { id: "031", nombre: "Press de banca plano", grupo_muscular: "Pecho", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0025-EIeI8Vf.gif" },
  { id: "032", nombre: "Press plano con mancuernas", grupo_muscular: "Pecho", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0314-ns0SIbU.gif" },
  { id: "033", nombre: "Press inclinado con barra", grupo_muscular: "Pecho", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0047-3TZduzM.gif" },
  { id: "034", nombre: "Press inclinado con mancuernas", grupo_muscular: "Pecho", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0314-ns0SIbU.gif" },
  { id: "035", nombre: "Press declinado", grupo_muscular: "Pecho", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0033-GrO65fd.gif" },
  { id: "036", nombre: "Aperturas con mancuernas", grupo_muscular: "Pecho", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0308-yz9nUhF.gif" },
  { id: "037", nombre: "Aperturas en polea (cruce)", grupo_muscular: "Pecho", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0151-7xI5MXA.gif" },
  { id: "038", nombre: "Contractor de pecho (pec deck)", grupo_muscular: "Pecho", equipamiento: "Máquina", tiene_gif: true, gif_url: "videos/0757-5v7KYld.gif" },
  { id: "039", nombre: "Flexiones de brazos", grupo_muscular: "Pecho", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0662-I4hDWkc.gif" },
  { id: "040", nombre: "Fondos en paralelas para pecho", grupo_muscular: "Pecho", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0251-9WTm7dq.gif" },

  // ESPALDA
  { id: "041", nombre: "Dominadas", grupo_muscular: "Espalda", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0652-lBDjFxJ.gif" },
  { id: "042", nombre: "Dominadas supinas", grupo_muscular: "Espalda / Bíceps", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0253-G70mEAJ.gif" },
  { id: "043", nombre: "Jalón al pecho", grupo_muscular: "Espalda", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0150-eYnzaCm.gif" },
  { id: "044", nombre: "Jalón al pecho agarre cerrado", grupo_muscular: "Espalda", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0198-RVwzP10.gif" },
  { id: "045", nombre: "Remo con barra", grupo_muscular: "Espalda", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0027-eZyBC3j.gif" },
  { id: "046", nombre: "Remo con mancuerna a una mano", grupo_muscular: "Espalda", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0292-C0MA9bC.gif" },
  { id: "047", nombre: "Remo en polea baja", grupo_muscular: "Espalda", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0180-hvV79Si.gif" },
  { id: "048", nombre: "Remo en barra T", grupo_muscular: "Espalda", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0119-83HoW9X.gif" },
  { id: "049", nombre: "Pullover con mancuerna", grupo_muscular: "Espalda / Pecho", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0409-1kB3Wmk.gif" },
  { id: "050", nombre: "Pull down en polea con brazos rectos", grupo_muscular: "Espalda", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0238-x69MAlq.gif" },
  { id: "051", nombre: "Hiperextensiones de espalda", grupo_muscular: "Espalda baja", equipamiento: "Banco", tiene_gif: true, gif_url: "videos/0044-XlZ4lAC.gif" },

  // HOMBROS
  { id: "052", nombre: "Press militar con barra", grupo_muscular: "Hombros", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0091-kTbSH9h.gif" },
  { id: "053", nombre: "Press de hombros con mancuernas", grupo_muscular: "Hombros", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0405-znQUdHY.gif" },
  { id: "054", nombre: "Press Arnold", grupo_muscular: "Hombros", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0286-izMnLqz.gif" },
  { id: "055", nombre: "Vuelos laterales con mancuernas", grupo_muscular: "Hombros", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0334-DsgkuIt.gif" },
  { id: "056", nombre: "Vuelos laterales en polea", grupo_muscular: "Hombros", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0184-Q2Eu1Ax.gif" },
  { id: "057", nombre: "Vuelos frontales", grupo_muscular: "Hombros", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0310-3eGE2JC.gif" },
  { id: "058", nombre: "Vuelos posteriores (pájaros)", grupo_muscular: "Hombros", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0378-8DiFDVA.gif" },
  { id: "059", nombre: "Face pull en polea", grupo_muscular: "Hombros / Espalda", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0159-kesXOpB.gif" },
  { id: "060", nombre: "Encogimientos de hombros con mancuerna", grupo_muscular: "Trapecio", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0413-HsvHqgf.gif" },

  // BRAZOS (BÍCEPS Y TRÍCEPS)
  { id: "061", nombre: "Curl de bíceps con barra", grupo_muscular: "Bíceps", equipamiento: "Barra", tiene_gif: true, gif_url: "videos/0031-25GPyDY.gif" },
  { id: "062", nombre: "Curl de bíceps con mancuernas", grupo_muscular: "Bíceps", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0294-NbVPDMW.gif" },
  { id: "063", nombre: "Curl martillo", grupo_muscular: "Bíceps", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0313-slDvUAU.gif" },
  { id: "064", nombre: "Curl en banco Scott (predicador)", grupo_muscular: "Bíceps", equipamiento: "Barra Z", tiene_gif: true, gif_url: "videos/0070-qOgPVf6.gif" },
  { id: "065", nombre: "Curl concentrado", grupo_muscular: "Bíceps", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0297-gvsWLQw.gif" },
  { id: "066", nombre: "Curl en polea baja", grupo_muscular: "Bíceps", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0148-KHPZL0b.gif" },
  { id: "067", nombre: "Extensión de tríceps en polea alta", grupo_muscular: "Tríceps", equipamiento: "Polea", tiene_gif: true, gif_url: "videos/0241-gAwDzB3.gif" },
  { id: "068", nombre: "Press francés con barra Z", grupo_muscular: "Tríceps", equipamiento: "Barra Z", tiene_gif: true, gif_url: "videos/0053-1gFNTZV.gif" },
  { id: "069", nombre: "Fondos en banco", grupo_muscular: "Tríceps", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0139-50BETrz.gif" },
  { id: "070", nombre: "Patada de tríceps", grupo_muscular: "Tríceps", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0333-W6PxUkg.gif" },
  { id: "071", nombre: "Copa de tríceps a dos manos", grupo_muscular: "Tríceps", equipamiento: "Mancuerna", tiene_gif: true, gif_url: "videos/0364-q8aHNoF.gif" },

  // ABDOMEN Y CORE
  { id: "072", nombre: "Plancha frontal", grupo_muscular: "Abdomen", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0464-CosupLu.gif" },
  { id: "073", nombre: "Plancha lateral", grupo_muscular: "Abdomen", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/3544-5VXmnV5.gif" },
  { id: "074", nombre: "Crunch abdominal", grupo_muscular: "Abdomen", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0274-TFqbd8t.gif" },
  { id: "075", nombre: "Elevación de piernas colgado", grupo_muscular: "Abdomen", equipamiento: "Barra fija", tiene_gif: true, gif_url: "videos/0472-I3tsCnC.gif" },
  { id: "076", nombre: "Elevación de piernas en suelo", grupo_muscular: "Abdomen", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0573-rUXfn3R.gif" },
  { id: "077", nombre: "Rueda abdominal", grupo_muscular: "Abdomen", equipamiento: "Rueda", tiene_gif: true, gif_url: "videos/0857-NAgVB3t.gif" },
  { id: "078", nombre: "Giros rusos (russian twist)", grupo_muscular: "Abdomen", equipamiento: "Disco / Mancuerna", tiene_gif: true, gif_url: "videos/0716-oQRJYkC.gif" },
  { id: "079", nombre: "Bicho muerto (deadbug)", grupo_muscular: "Abdomen", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0276-iny3m5y.gif" },
  { id: "080", nombre: "Pájaro perro (bird dog)", grupo_muscular: "Core", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1366-01qpYSe.gif" },

  // FUNCIONAL / CARDIO / MOVILIDAD
  { id: "081", nombre: "Kettlebell swing", grupo_muscular: "Full body", equipamiento: "Kettlebell", tiene_gif: true, gif_url: "videos/0517-Kal9cQQ.gif" },
  { id: "082", nombre: "Burpees", grupo_muscular: "Full body", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1160-dK9394r.gif" },
  { id: "083", nombre: "Mountain climbers", grupo_muscular: "Full body", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0630-RJgzwny.gif" },
  { id: "084", nombre: "Jumping jacks", grupo_muscular: "Full body", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/0514-LIlE5Tn.gif" },
  { id: "085", nombre: "Salto al cajón (box jump)", grupo_muscular: "Piernas", equipamiento: "Cajón pliométrico", tiene_gif: true, gif_url: "videos/1374-iPm26QU.gif" },
  { id: "086", nombre: "Movilidad de cadera 90/90", grupo_muscular: "Movilidad", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1512-qBcKorM.gif" },
  { id: "087", nombre: "Movilidad torácica en 4 puntos", grupo_muscular: "Movilidad", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1368-uL9CsKm.gif" },
  { id: "088", nombre: "Gato-vaca (cat-cow)", grupo_muscular: "Movilidad", equipamiento: "Peso corporal", tiene_gif: true, gif_url: "videos/1428-2zNKRUB.gif" },
];

export function buscarEjerciciosEs(termino: string): EjercicioCatalogo[] {
  const norm = termino.trim().toLowerCase();
  if (!norm) return EJERCICIOS_DATASET_ES.slice(0, 10);
  return EJERCICIOS_DATASET_ES.filter(
    (ej) =>
      ej.nombre.toLowerCase().includes(norm) ||
      ej.grupo_muscular.toLowerCase().includes(norm) ||
      ej.equipamiento.toLowerCase().includes(norm),
  ).slice(0, 15);
}
