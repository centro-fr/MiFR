import type { PrismaClient } from "@prisma/client";
import {
  CATALOGO_PERMISOS,
  CATALOGO_ROLES,
  MATRIZ_INICIAL,
  PERMISOS_CRITICOS,
} from "../../modules/gestion-usuarios/rol/rol.catalogo.js";

// Carga roles, permisos y la matriz inicial. Lo comparten los seeds y los tests de integración,
// así la base de prueba arranca con la misma seguridad que la publicada.
export async function cargarCatalogoSeguridad(prisma: PrismaClient): Promise<void> {
  for (const rol of CATALOGO_ROLES) {
    await prisma.roles.upsert({ where: { codigo: rol.codigo }, update: {}, create: rol });
  }
  await cargarPermisos(prisma);
}

// La matriz inicial se aplica solo a los permisos que se crean en esta corrida: volver a
// correr el seed no pisa lo que la propietaria haya cambiado en la matriz. Los críticos
// de la propietaria se reponen siempre.
async function cargarPermisos(prisma: PrismaClient): Promise<void> {
  const existentes = new Set(
    (await prisma.permisos.findMany({ select: { codigo: true } })).map((p) => p.codigo),
  );

  for (const permiso of CATALOGO_PERMISOS) {
    await prisma.permisos.upsert({
      where: { codigo: permiso.codigo },
      update: { modulo: permiso.modulo, descripcion: permiso.descripcion },
      create: permiso,
    });
  }

  const roles = await prisma.roles.findMany();
  const permisos = await prisma.permisos.findMany();
  const idPermiso = new Map(permisos.map((p) => [p.codigo, p.id_permiso]));

  const filas = roles.flatMap((rol) =>
    MATRIZ_INICIAL[rol.codigo]
      .filter(
        (codigo) =>
          !existentes.has(codigo) || (rol.codigo === "PROPIETARIA" && PERMISOS_CRITICOS.includes(codigo)),
      )
      .map((codigo) => ({ id_rol: rol.id_rol, id_permiso: idPermiso.get(codigo) as number })),
  );
  await prisma.rol_permisos.createMany({ data: filas, skipDuplicates: true });
}
