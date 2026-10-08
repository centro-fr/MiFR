import { describe, expect, it } from "vitest";
import { actualizarMatrizBodySchema, matrizResponseSchema } from "@/features/seguridad/schemas/matriz";
import { crearMatriz } from "@/features/seguridad/__tests__/matriz-de-prueba";

describe("matrizResponseSchema", () => {
  // Contrato del GET: la respuesta real del back se parsea sin errores.
  it("acepta una respuesta válida del back", () => {
    expect(matrizResponseSchema.safeParse(crearMatriz()).success).toBe(true);
  });

  // Matriz sin datos todavía: se muestra estado vacío, no error.
  it("acepta listas vacías, porque la página tiene estado vacío", () => {
    const resultado = matrizResponseSchema.safeParse({ roles: [], modulos: [], matriz: {} });

    expect(resultado.success).toBe(true);
  });

  // Compatibilidad hacia adelante: un rol nuevo en el back no rompe el front.
  it("acepta un rol extra en la matriz, para no romper si el back agrega uno", () => {
    const matriz = { ...crearMatriz().matriz, ADMINISTRATIVA: ["PLANES_VER"] };

    expect(matrizResponseSchema.safeParse({ ...crearMatriz(), matriz }).success).toBe(true);
  });

  // Los roles listados alimentan las columnas: uno desconocido no tendría cómo mostrarse.
  it("rechaza un código de rol desconocido en la lista de roles", () => {
    const roles = [{ id_rol: 9, codigo: "ADMINISTRATIVA", nombre: "Administrativa" }];

    expect(matrizResponseSchema.safeParse({ ...crearMatriz(), roles }).success).toBe(false);
  });

  // Sin código no hay forma de otorgar o revocar ese permiso.
  it("rechaza un permiso sin código", () => {
    const modulos = [
      { modulo: "PLANES", permisos: [{ id_permiso: 1, codigo: "", descripcion: null, critico: false }] },
    ];

    expect(matrizResponseSchema.safeParse({ ...crearMatriz(), modulos }).success).toBe(false);
  });
});

describe("actualizarMatrizBodySchema", () => {
  const cambio = { rol: "PROFESORA", permiso: "PLANES_VER", otorgado: true };

  // Contrato del PUT: el cuerpo mínimo que acepta el back.
  it("acepta un cambio válido", () => {
    expect(actualizarMatrizBodySchema.safeParse({ cambios: [cambio] }).success).toBe(true);
  });

  // Guardar sin cambios no debe llegar al back.
  it("rechaza una lista de cambios vacía", () => {
    const resultado = actualizarMatrizBodySchema.safeParse({ cambios: [] });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Debe enviar al menos un cambio");
  });

  // El back compara códigos en mayúsculas; se normaliza antes de enviar.
  it("normaliza el permiso quitando espacios y pasándolo a mayúsculas", () => {
    const resultado = actualizarMatrizBodySchema.parse({
      cambios: [{ ...cambio, permiso: "  planes_ver " }],
    });

    expect(resultado.cambios[0]?.permiso).toBe("PLANES_VER");
  });

  // Valor límite: mismo máximo que valida el back.
  it("acepta un permiso de 50 caracteres y rechaza uno de 51", () => {
    const conLargo = (largo: number) => ({ cambios: [{ ...cambio, permiso: "A".repeat(largo) }] });

    expect(actualizarMatrizBodySchema.safeParse(conLargo(50)).success).toBe(true);
    expect(actualizarMatrizBodySchema.safeParse(conLargo(51)).success).toBe(false);
  });

  // Dos cambios contradictorios para la misma celda no tienen resultado definido.
  it("rechaza dos cambios para el mismo rol y permiso aunque difieran en mayúsculas", () => {
    const resultado = actualizarMatrizBodySchema.safeParse({
      cambios: [cambio, { ...cambio, permiso: "planes_ver", otorgado: false }],
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Hay más de un cambio para el mismo rol y permiso");
  });

  // El control de duplicados es por par (rol, permiso), no solo por permiso.
  it("acepta el mismo permiso para roles distintos", () => {
    const resultado = actualizarMatrizBodySchema.safeParse({
      cambios: [cambio, { ...cambio, rol: "ALUMNO" }],
    });

    expect(resultado.success).toBe(true);
  });

  // Solo se pueden modificar los roles que conoce el sistema.
  it("rechaza un rol inexistente", () => {
    const resultado = actualizarMatrizBodySchema.safeParse({ cambios: [{ ...cambio, rol: "ADMIN" }] });

    expect(resultado.success).toBe(false);
  });
});
