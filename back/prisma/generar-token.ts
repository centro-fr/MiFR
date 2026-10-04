import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { JwtService } from "../src/modules/gestion-usuarios/sesion/jwt.service.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const email = args[0];

  const usuario = email
    ? await prisma.usuarios.findUnique({
        where: { email },
        include: { roles: { include: { rol: true } } },
      })
    : await prisma.usuarios.findFirst({
        where: { roles: { some: { rol: { codigo: "PROPIETARIA" } } } },
        include: { roles: { include: { rol: true } } },
      });

  if (!usuario) {
    const todos = await prisma.usuarios.findMany({ select: { email: true } });
    console.error(
      email
        ? `No se encontró ningún usuario con el correo "${email}".`
        : "No se encontró ningún usuario con rol PROPIETARIA.",
    );
    if (todos.length > 0) {
      console.log(`Usuarios disponibles en la base: ${todos.map((u) => u.email).join(", ")}`);
    } else {
      console.log("No hay usuarios cargados en la base. Ejecutá primero: pnpm --filter back db:seed:demo");
    }
    process.exit(1);
  }

  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    console.error("Falta la variable de entorno JWT_SECRET.");
    process.exit(1);
  }

  const jwtService = new JwtService(secreto, process.env.JWT_EXPIRES_IN ?? "8h");
  const token = jwtService.emitir(usuario);

  console.log(`\n========================================`);
  console.log(`Usuario: ${usuario.nombre} ${usuario.apellido} (${usuario.email})`);
  console.log(`Roles:   ${usuario.roles.map((r) => r.rol.codigo).join(", ") || "SIN_ROL"}`);
  console.log(`Estado:  ${usuario.estado}`);
  console.log(`========================================`);
  console.log(`\nToken JWT (vigencia: ${process.env.JWT_EXPIRES_IN ?? "8h"}):`);
  console.log(`${token}`);
  console.log(`\nLínea para pegar en REST Client (.http):`);
  console.log(`@token = ${token}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
