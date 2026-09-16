import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const email = args[0] ?? process.env.SEED_PROPIETARIO_EMAIL;
  const nombre = args[1] ?? "Propietario";
  const apellido = args[2] ?? "Inicial";

  if (!email) {
    console.error("Uso: pnpm --filter back db:seed -- <email-de-google> [nombre] [apellido]");
    process.exit(1);
  }

  const usuario = await prisma.usuarios.upsert({
    where: { email },
    update: {},
    create: { email, nombre, apellido },
  });

  await prisma.usuario_roles.upsert({
    where: { id_usuario_rol: { id_usuario: usuario.id_usuario, rol: "PROPIETARIO" } },
    update: {},
    create: { id_usuario: usuario.id_usuario, rol: "PROPIETARIO" },
  });

  console.log(`Propietario listo: ${email} (id_usuario=${usuario.id_usuario})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
