import { PrismaClient, type codigo_rol } from "@prisma/client";

const prisma = new PrismaClient();

// Catálogo de roles del DER (roles.codigo).
const ROLES: { codigo: codigo_rol; nombre: string; descripcion: string }[] = [
  {
    codigo: "PROPIETARIA",
    nombre: "Propietaria",
    descripcion: "Administradora y dueña del centro de entrenamiento",
  },
  {
    codigo: "PROFESORA",
    nombre: "Profesora",
    descripcion: "Instructora que dicta clases y gestiona asistencias y rutinas",
  },
  { codigo: "ALUMNO", nombre: "Alumno", descripcion: "Persona que asiste al centro" },
  { codigo: "TUTOR", nombre: "Tutor", descripcion: "Responsable de un alumno menor de edad" },
];

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

  for (const rol of ROLES) {
    await prisma.roles.upsert({ where: { codigo: rol.codigo }, update: {}, create: rol });
  }
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

  console.log(`Roles cargados: ${ROLES.map((r) => r.codigo).join(", ")}`);
  console.log(`Propietaria lista: ${email} (id_usuario=${usuario.id_usuario})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
