import { PrismaClient } from "@prisma/client";
import { CATALOGO_PERMISOS, CATALOGO_ROLES } from "../src/modules/gestion-usuarios/rol/rol.catalogo.js";
import { cargarCatalogoSeguridad } from "../src/shared/db/catalogo-seguridad.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const email = args[0] ?? process.env.SEED_PROPIETARIA_EMAIL;
  const nombre = args[1] ?? "Propietaria";
  const apellido = args[2] ?? "Inicial";
  const fechaNacimiento = new Date(args[3] ?? process.env.SEED_PROPIETARIA_FECHA_NACIMIENTO ?? "");

  if (!email || Number.isNaN(fechaNacimiento.getTime())) {
    console.error(
      "Uso: pnpm --filter back db:seed -- <email-de-google> <nombre> <apellido> <fecha-nacimiento AAAA-MM-DD>",
    );
    process.exit(1);
  }

  await cargarCatalogoSeguridad(prisma);
  const propietaria = await prisma.roles.findUniqueOrThrow({ where: { codigo: "PROPIETARIA" } });

  const usuario = await prisma.usuarios.upsert({
    where: { email },
    update: {},
    create: { email, nombre, apellido, fecha_nacimiento: fechaNacimiento },
  });

  await prisma.usuario_roles.upsert({
    where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: propietaria.id_rol } },
    update: {},
    create: { id_usuario: usuario.id_usuario, id_rol: propietaria.id_rol },
  });

  console.log(`Roles cargados: ${CATALOGO_ROLES.map((r) => r.codigo).join(", ")}`);
  console.log(`Permisos cargados: ${CATALOGO_PERMISOS.length}`);
  console.log(`Propietaria lista: ${email} (id_usuario=${usuario.id_usuario})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
