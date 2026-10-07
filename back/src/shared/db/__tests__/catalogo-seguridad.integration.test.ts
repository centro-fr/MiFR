import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearPrismaDePrueba, reiniciarBase } from "../../../__tests__/integracion/base-de-prueba.js";
import { cargarCatalogoSeguridad } from "../catalogo-seguridad.js";

const prisma = crearPrismaDePrueba();

async function tienePermiso(rol: "PROPIETARIA" | "ALUMNO", permiso: string): Promise<boolean> {
  const filas = await prisma.rol_permisos.count({
    where: { rol: { codigo: rol }, permiso: { codigo: permiso } },
  });
  return filas === 1;
}

async function quitarPermiso(rol: "PROPIETARIA" | "ALUMNO", permiso: string): Promise<void> {
  await prisma.rol_permisos.deleteMany({ where: { rol: { codigo: rol }, permiso: { codigo: permiso } } });
}

beforeEach(() => reiniciarBase(prisma));
afterAll(() => prisma.$disconnect());

describe("cargarCatalogoSeguridad", () => {
  it("volver a correrlo no pisa un permiso que la propietaria quitó de la matriz", async () => {
    await quitarPermiso("ALUMNO", "ACTIVIDADES_VER");

    await cargarCatalogoSeguridad(prisma);

    expect(await tienePermiso("ALUMNO", "ACTIVIDADES_VER")).toBe(false);
  });

  it("volver a correrlo repone los permisos críticos de la propietaria", async () => {
    await quitarPermiso("PROPIETARIA", "USUARIOS_EDITAR");

    await cargarCatalogoSeguridad(prisma);

    expect(await tienePermiso("PROPIETARIA", "USUARIOS_EDITAR")).toBe(true);
  });

  it("volver a correrlo no duplica roles ni permisos", async () => {
    const antes = await Promise.all([
      prisma.roles.count(),
      prisma.permisos.count(),
      prisma.rol_permisos.count(),
    ]);

    await cargarCatalogoSeguridad(prisma);

    const despues = await Promise.all([
      prisma.roles.count(),
      prisma.permisos.count(),
      prisma.rol_permisos.count(),
    ]);
    expect(despues).toEqual(antes);
  });
});
