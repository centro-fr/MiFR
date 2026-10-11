import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMatrizEditor } from "@/features/seguridad/hooks/use-matriz-editor";
import { NIVEL_COMPLETO, NIVEL_LECTURA, NIVEL_SIN_ACCESO } from "@/features/seguridad/utils/niveles";
import { crearMatriz } from "@/features/seguridad/__tests__/matriz-de-prueba";
import type { RoleCode } from "@/types/auth";
import type { MatrizPermisos } from "@/types/permissions";

function renderizarEditor(matriz: MatrizPermisos | null = crearMatriz()) {
  const { result } = renderHook(() => useMatrizEditor(matriz ?? undefined));
  const ciclar = (rol: RoleCode, modulo: string, veces = 1) => {
    for (let i = 0; i < veces; i++) act(() => result.current.ciclar(rol, modulo));
  };
  return { result, ciclar };
}

describe("useMatrizEditor sin matriz cargada", () => {
  // Estado Loading: mientras no llega la matriz, la grilla no debe permitir ediciones.
  it("muestra sin acceso, no bloquea y no permite ciclar", () => {
    const { result, ciclar } = renderizarEditor(null);

    ciclar("PROFESORA", "PLANES");

    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_SIN_ACCESO);
    expect(result.current.bloqueoDe("PROFESORA", "PLANES")).toBeNull();
    expect(result.current.cambios).toEqual([]);
  });
});

describe("useMatrizEditor.nivelDe", () => {
  // CA-07: la columna de la propietaria se ve completa aunque el servidor tenga datos inconsistentes.
  it("muestra a la propietaria siempre con acceso total, aunque el servidor diga otra cosa", () => {
    const { result } = renderizarEditor(crearMatriz({ PROPIETARIA: [] }));

    expect(result.current.nivelDe("PROPIETARIA", "PLANES")).toBe(NIVEL_COMPLETO);
  });

  // Sin ediciones locales, lo que se ve es exactamente lo que está guardado.
  it("refleja el estado del servidor mientras no haya ediciones", () => {
    const { result } = renderizarEditor(crearMatriz({ PROFESORA: ["PLANES_VER"] }));

    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_LECTURA);
    expect(result.current.nivelDe("PROFESORA", "ASISTENCIAS")).toBe(NIVEL_SIN_ACCESO);
  });
});

describe("useMatrizEditor.bloqueoDe", () => {
  // El motivo se muestra en el tooltip de la celda bloqueada.
  it("informa el motivo de bloqueo de los permisos exclusivos", () => {
    const { result } = renderizarEditor();

    expect(result.current.bloqueoDe("PROFESORA", "HONORARIOS")).toBe("Permiso exclusivo de la propietaria");
    expect(result.current.bloqueoDe("PROFESORA", "PLANES")).toBeNull();
  });
});

describe("useMatrizEditor.ciclar", () => {
  // Cada clic en una celda avanza un nivel y prepara lo que se enviará al guardar.
  it("avanza al nivel siguiente y genera los cambios para guardarlo", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "PLANES");

    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_COMPLETO);
    expect(result.current.cambios).toEqual([
      { rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true },
      { rol: "PROFESORA", permiso: "PLANES_EDITAR", otorgado: true },
    ]);
  });

  // Varios clics en la misma celda no deben acumular cambios intermedios.
  it("calcula los cambios contra el servidor y no contra el paso anterior", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "PLANES", 2);

    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_LECTURA);
    expect(result.current.cambios).toEqual([{ rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true }]);
  });

  // Exclusivos y columna propietaria no se editan aunque se haga clic.
  it("no cambia una celda bloqueada", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "HONORARIOS");
    ciclar("PROPIETARIA", "PLANES");

    expect(result.current.cambios).toEqual([]);
    expect(result.current.objetivos.size).toBe(0);
  });

  // Evita un clic 'muerto' en módulos donde lectura y completo dan el mismo resultado.
  it("saltea los niveles equivalentes: un módulo de una sola acción alterna entre completo y sin acceso", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "ASISTENCIAS");
    expect(result.current.nivelDe("PROFESORA", "ASISTENCIAS")).toBe(NIVEL_COMPLETO);

    ciclar("PROFESORA", "ASISTENCIAS");
    expect(result.current.nivelDe("PROFESORA", "ASISTENCIAS")).toBe(NIVEL_SIN_ACCESO);
  });

  // Volver al valor original no debe habilitar 'Guardar' con cambios vacíos.
  it("no deja cambios pendientes al volver al nivel del servidor", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "PLANES", 3);

    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_SIN_ACCESO);
    expect(result.current.objetivos.size).toBe(0);
    expect(result.current.cambios).toEqual([]);
  });

  // Un solo guardado envía todas las celdas editadas.
  it("acumula cambios de celdas distintas", () => {
    const { result, ciclar } = renderizarEditor();

    ciclar("PROFESORA", "ASISTENCIAS");
    ciclar("ALUMNO", "ASISTENCIAS");

    expect(result.current.cambios).toEqual([
      { rol: "PROFESORA", permiso: "ASISTENCIAS_MARCAR", otorgado: true },
      { rol: "ALUMNO", permiso: "ASISTENCIAS_MARCAR", otorgado: true },
    ]);
  });
});

describe("useMatrizEditor: cancelar y guardar", () => {
  // Acciones Cancelar y Éxito al guardar: la grilla vuelve a mostrar los datos del servidor.
  it.each(["descartar", "limpiarTrasGuardar"] as const)("%s vuelve al estado del servidor", (accion) => {
    const { result, ciclar } = renderizarEditor();
    ciclar("PROFESORA", "PLANES");

    act(() => result.current[accion]());

    expect(result.current.cambios).toEqual([]);
    expect(result.current.nivelDe("PROFESORA", "PLANES")).toBe(NIVEL_SIN_ACCESO);
  });
});
