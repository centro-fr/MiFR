import { describe, expect, it } from "vitest";
import {
  cambiosParaNivel,
  codigosDelNivel,
  codigosEditables,
  derivarNivel,
  motivoBloqueoCelda,
  NIVEL_COMPLETO,
  NIVEL_LECTURA,
  NIVEL_SIN_ACCESO,
  nivelesEquivalentes,
  siguienteNivel,
  valorCanonico,
  valoresParaNivel,
} from "@/features/seguridad/utils/niveles";
import {
  CODIGOS_ASISTENCIAS,
  CODIGOS_PLANES,
  crearMatriz,
  crearMatrizSinRol,
} from "@/features/seguridad/__tests__/matriz-de-prueba";

describe("siguienteNivel", () => {
  // Orden del ciclo de la celda al hacer clic.
  it("cicla completo → lectura → sin acceso → completo", () => {
    expect(siguienteNivel(NIVEL_COMPLETO)).toBe(NIVEL_LECTURA);
    expect(siguienteNivel(NIVEL_LECTURA)).toBe(NIVEL_SIN_ACCESO);
    expect(siguienteNivel(NIVEL_SIN_ACCESO)).toBe(NIVEL_COMPLETO);
  });
});

describe("derivarNivel", () => {
  // Todo otorgado se muestra como 'Puede ver y modificar'.
  it("devuelve completo si todos los permisos del módulo están otorgados", () => {
    expect(derivarNivel(CODIGOS_PLANES, new Set(CODIGOS_PLANES))).toBe(NIVEL_COMPLETO);
  });

  // Nada otorgado se muestra como 'Sin acceso'.
  it("devuelve sin acceso si ninguno está otorgado", () => {
    expect(derivarNivel(CODIGOS_PLANES, new Set())).toBe(NIVEL_SIN_ACCESO);
  });

  // Cualquier mezcla se muestra como 'Solo puede ver'.
  it("devuelve lectura si hay otorgamiento parcial", () => {
    expect(derivarNivel(CODIGOS_PLANES, new Set(["PLANES_VER"]))).toBe(NIVEL_LECTURA);
  });

  // Cada celda depende solo de los permisos de su módulo.
  it("ignora los permisos otorgados de otros módulos", () => {
    const otorgados = new Set(["ASISTENCIAS_MARCAR", "HONORARIOS_LIQUIDAR"]);

    expect(derivarNivel(CODIGOS_PLANES, otorgados)).toBe(NIVEL_SIN_ACCESO);
  });

  // Comportamiento actual, reportado al equipo: un módulo vacío se pinta como acceso total.
  it("hoy devuelve completo para un módulo sin permisos", () => {
    expect(derivarNivel([], new Set())).toBe(NIVEL_COMPLETO);
  });
});

describe("valorCanonico", () => {
  // 'Puede ver y modificar' otorga todo el módulo.
  it("otorga todos los permisos en el nivel completo", () => {
    expect(valorCanonico(CODIGOS_PLANES, "PLANES_EDITAR", NIVEL_COMPLETO)).toBe(true);
  });

  // 'Sin acceso' revoca todo el módulo.
  it("no otorga ningún permiso en el nivel sin acceso", () => {
    expect(valorCanonico(CODIGOS_PLANES, "PLANES_VER", NIVEL_SIN_ACCESO)).toBe(false);
  });

  // 'Solo puede ver' mantiene lectura y quita acciones.
  it("en lectura otorga los permisos de ver y no los de acción", () => {
    expect(valorCanonico(CODIGOS_PLANES, "PLANES_VER", NIVEL_LECTURA)).toBe(true);
    expect(valorCanonico(CODIGOS_PLANES, "PLANES_EDITAR", NIVEL_LECTURA)).toBe(false);
  });

  // En módulos de una sola acción no existe un 'solo ver' distinto.
  it("en lectura otorga el único permiso de un módulo de una sola acción", () => {
    expect(valorCanonico(CODIGOS_ASISTENCIAS, "ASISTENCIAS_MARCAR", NIVEL_LECTURA)).toBe(true);
  });

  // Comportamiento actual, reportado al equipo: la detección por substring
  // confunde acciones como *_VERIFICAR con permisos de lectura.
  it("hoy trata como lectura a un código que contiene _VER sin serlo", () => {
    const codigos = ["ALUMNOS_VERIFICAR", "ALUMNOS_EDITAR"];

    expect(valorCanonico(codigos, "ALUMNOS_VERIFICAR", NIVEL_LECTURA)).toBe(true);
  });
});

describe("motivoBloqueoCelda", () => {
  // CA-07: a la propietaria no se le pueden quitar permisos desde la UI.
  it("bloquea la columna de la propietaria en todos los módulos", () => {
    const matriz = crearMatriz({ PROPIETARIA: [] });

    for (const { modulo } of matriz.modulos) {
      expect(motivoBloqueoCelda(matriz, "PROPIETARIA", modulo)).toMatch(/Acceso total/);
    }
  });

  // CA: una profesora no accede a los honorarios de otras profesoras.
  it("bloquea a la profesora en honorarios porque son permisos exclusivos", () => {
    const motivo = motivoBloqueoCelda(crearMatriz(), "PROFESORA", "HONORARIOS");

    expect(motivo).toBe("Permiso exclusivo de la propietaria");
  });

  // Un exclusivo otorgado por error se puede revocar aunque falte otro exclusivo del módulo.
  it("permite editar si el rol tiene algún exclusivo del módulo, para poder revocarlo", () => {
    const matriz = crearMatriz({ PROFESORA: ["HONORARIOS_VER_TODOS"] });

    expect(motivoBloqueoCelda(matriz, "PROFESORA", "HONORARIOS")).toBeNull();
  });

  // PAGOS mezcla una acción de la profesora (registrar cobros) con exclusivos de la propietaria.
  it("permite editar un módulo con exclusivos si tiene permisos que el rol sí puede tener", () => {
    expect(motivoBloqueoCelda(crearMatriz(), "PROFESORA", "PAGOS")).toBeNull();
  });

  // Los módulos comunes son editables para los roles no propietarios.
  it("permite editar un módulo sin permisos exclusivos", () => {
    expect(motivoBloqueoCelda(crearMatriz(), "ALUMNO", "PLANES")).toBeNull();
  });

  // Si un exclusivo quedó otorgado por error, la propietaria debe poder quitarlo.
  it("permite editar si el rol ya tiene todos los exclusivos del módulo, para poder revocarlos", () => {
    const matriz = crearMatriz({ PROFESORA: ["HONORARIOS_VER_TODOS", "HONORARIOS_LIQUIDAR"] });

    expect(motivoBloqueoCelda(matriz, "PROFESORA", "HONORARIOS")).toBeNull();
  });

  // Un módulo desconocido no bloquea nada ni rompe la grilla.
  it("devuelve null para un módulo que no existe", () => {
    expect(motivoBloqueoCelda(crearMatriz(), "PROFESORA", "INEXISTENTE")).toBeNull();
  });

  // Datos incompletos del back no deben romper el cálculo de bloqueo.
  it("no falla si el rol no figura en la matriz", () => {
    const matrizSinTutor = crearMatrizSinRol("TUTOR");

    expect(motivoBloqueoCelda(matrizSinTutor, "TUTOR", "HONORARIOS")).toBe(
      "Permiso exclusivo de la propietaria",
    );
  });
});

describe("cambiosParaNivel", () => {
  // Doble protección: aunque la UI falle, no se envían cambios prohibidos.
  it("no genera cambios en una celda bloqueada", () => {
    const matriz = crearMatriz();

    expect(cambiosParaNivel(matriz, "PROPIETARIA", "PLANES", NIVEL_SIN_ACCESO)).toEqual([]);
    expect(cambiosParaNivel(matriz, "PROFESORA", "HONORARIOS", NIVEL_COMPLETO)).toEqual([]);
  });

  // Pasar a 'completo' otorga cada permiso del módulo.
  it("otorga todos los permisos al pasar de sin acceso a completo", () => {
    const cambios = cambiosParaNivel(crearMatriz(), "PROFESORA", "PLANES", NIVEL_COMPLETO);

    expect(cambios).toEqual([
      { rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true },
      { rol: "PROFESORA", permiso: "PLANES_EDITAR", otorgado: true },
    ]);
  });

  // Bajar a lectura solo revoca acciones; la lectura queda.
  it("revoca solo los permisos de acción al pasar de completo a lectura", () => {
    const matriz = crearMatriz({ PROFESORA: CODIGOS_PLANES });

    expect(cambiosParaNivel(matriz, "PROFESORA", "PLANES", NIVEL_LECTURA)).toEqual([
      { rol: "PROFESORA", permiso: "PLANES_EDITAR", otorgado: false },
    ]);
  });

  // Sin diferencias no se envía nada al back.
  it("no genera cambios si el nivel pedido es el actual", () => {
    const matriz = crearMatriz({ PROFESORA: ["PLANES_VER"] });

    expect(cambiosParaNivel(matriz, "PROFESORA", "PLANES", NIVEL_LECTURA)).toEqual([]);
  });

  // El PUT lleva lo mínimo indispensable.
  it("incluye solo los permisos cuyo valor cambia", () => {
    const matriz = crearMatriz({ PROFESORA: ["PLANES_VER"] });

    expect(cambiosParaNivel(matriz, "PROFESORA", "PLANES", NIVEL_COMPLETO)).toEqual([
      { rol: "PROFESORA", permiso: "PLANES_EDITAR", otorgado: true },
    ]);
  });
});

describe("valoresParaNivel", () => {
  // Vista previa de cómo quedaría cada permiso con ese nivel.
  it("devuelve los valores canónicos del nivel en una celda editable", () => {
    const valores = valoresParaNivel(crearMatriz(), "PROFESORA", "PLANES", NIVEL_LECTURA);

    expect(Object.fromEntries(valores)).toEqual({ PLANES_VER: true, PLANES_EDITAR: false });
  });

  // Una celda bloqueada nunca cambia sus valores, pida el nivel que pida.
  it("conserva los valores del servidor en una celda bloqueada", () => {
    const valores = valoresParaNivel(crearMatriz(), "PROFESORA", "HONORARIOS", NIVEL_COMPLETO);

    expect(Object.fromEntries(valores)).toEqual({
      HONORARIOS_VER_TODOS: false,
      HONORARIOS_LIQUIDAR: false,
    });
  });
});

describe("nivelesEquivalentes", () => {
  // Base para saltear niveles que no producen cambios.
  it("considera equivalentes completo y lectura en un módulo de una sola acción", () => {
    const matriz = crearMatriz();

    expect(nivelesEquivalentes(matriz, "PROFESORA", "ASISTENCIAS", NIVEL_COMPLETO, NIVEL_LECTURA)).toBe(true);
  });

  // En módulos con ver y editar los tres niveles son distintos.
  it("distingue completo de lectura en un módulo con ver y editar", () => {
    const matriz = crearMatriz();

    expect(nivelesEquivalentes(matriz, "PROFESORA", "PLANES", NIVEL_COMPLETO, NIVEL_LECTURA)).toBe(false);
  });

  // Completo y sin acceso nunca son equivalentes en una celda editable.
  it("distingue completo de sin acceso", () => {
    const matriz = crearMatriz();

    expect(nivelesEquivalentes(matriz, "PROFESORA", "ASISTENCIAS", NIVEL_COMPLETO, NIVEL_SIN_ACCESO)).toBe(
      false,
    );
  });

  // En una celda bloqueada ningún nivel cambia nada.
  it("considera equivalentes todos los niveles de una celda bloqueada", () => {
    const matriz = crearMatriz();

    expect(nivelesEquivalentes(matriz, "PROFESORA", "HONORARIOS", NIVEL_COMPLETO, NIVEL_SIN_ACCESO)).toBe(
      true,
    );
  });
});

describe("permisos exclusivos dentro de un módulo editable", () => {
  // El back rechaza otorgar un exclusivo a otro rol: la celda nunca lo intenta.
  it("deja fuera de la celda los exclusivos que el rol no tiene", () => {
    expect(codigosEditables(crearMatriz(), "PROFESORA", "PAGOS")).toEqual(["PAGOS_REGISTRAR"]);
  });

  it("incluye un exclusivo que el rol ya tiene, para poder revocarlo", () => {
    const matriz = crearMatriz({ PROFESORA: ["PAGOS_CONFIRMAR"] });

    expect(codigosEditables(matriz, "PROFESORA", "PAGOS")).toEqual(["PAGOS_REGISTRAR", "PAGOS_CONFIRMAR"]);
  });

  // Antes la profesora con PAGOS_REGISTRAR se veía "solo ver" (1 de 3 permisos).
  it("muestra completo a la profesora que registra cobros", () => {
    const matriz = crearMatriz({ PROFESORA: ["PAGOS_REGISTRAR"] });
    const codigos = codigosDelNivel(matriz, "PROFESORA", "PAGOS");

    expect(derivarNivel(codigos, new Set(matriz.matriz.PROFESORA))).toBe(NIVEL_COMPLETO);
  });

  // Una celda bloqueada calcula el nivel con todos sus permisos: sin acceso no se ve como completa.
  it("calcula el nivel de una celda bloqueada con todos sus permisos", () => {
    const matriz = crearMatriz();

    expect(codigosDelNivel(matriz, "PROFESORA", "HONORARIOS")).toEqual(["HONORARIOS_VER_TODOS", "HONORARIOS_LIQUIDAR"]);
  });

  it("otorga solo PAGOS_REGISTRAR al pasar la celda a completo", () => {
    expect(cambiosParaNivel(crearMatriz(), "PROFESORA", "PAGOS", NIVEL_COMPLETO)).toEqual([
      { rol: "PROFESORA", permiso: "PAGOS_REGISTRAR", otorgado: true },
    ]);
  });

  it("quita PAGOS_REGISTRAR al pasar la celda a sin acceso", () => {
    const matriz = crearMatriz({ PROFESORA: ["PAGOS_REGISTRAR"] });

    expect(cambiosParaNivel(matriz, "PROFESORA", "PAGOS", NIVEL_SIN_ACCESO)).toEqual([
      { rol: "PROFESORA", permiso: "PAGOS_REGISTRAR", otorgado: false },
    ]);
  });

  // Con un exclusivo apagado y otro otorgado por error, la celda solo puede revocar.
  it("nunca otorga un exclusivo, aunque la celda se pase a completo", () => {
    const matriz = crearMatriz({ PROFESORA: ["HONORARIOS_VER_TODOS"] });

    expect(cambiosParaNivel(matriz, "PROFESORA", "HONORARIOS", NIVEL_COMPLETO)).toEqual([]);
    expect(cambiosParaNivel(matriz, "PROFESORA", "HONORARIOS", NIVEL_SIN_ACCESO)).toEqual([
      { rol: "PROFESORA", permiso: "HONORARIOS_VER_TODOS", otorgado: false },
    ]);
  });

  it("conserva el valor del servidor de los exclusivos en la vista previa", () => {
    const valores = valoresParaNivel(crearMatriz(), "PROFESORA", "PAGOS", NIVEL_COMPLETO);

    expect(Object.fromEntries(valores)).toEqual({
      PAGOS_REGISTRAR: true,
      PAGOS_CONFIRMAR: false,
      PAGOS_RENDICION_VER: false,
    });
  });

  // Una sola acción asignable: "solo ver" y "completo" dan lo mismo y el ciclo los saltea.
  it("considera equivalentes completo y lectura en PAGOS para la profesora", () => {
    expect(nivelesEquivalentes(crearMatriz(), "PROFESORA", "PAGOS", NIVEL_COMPLETO, NIVEL_LECTURA)).toBe(true);
  });
});
