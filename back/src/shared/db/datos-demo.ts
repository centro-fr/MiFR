import type { PrismaClient, codigo_rol, modalidad_actividad } from "@prisma/client";

// Datos de prueba de las tareas 1.2 del SDD de autenticación (usuario multi-rol) y de
// configuración base (actividades, profesoras y horarios). Los cargan seed-demo.ts en la base
// local y los tests de integración en la base de prueba, así el escenario que se recorre a mano
// es el mismo que verifican los tests.

export const EMAIL_MULTIROL_DEMO = "marina.sosa@example.com";

interface UsuarioDemo {
  email: string;
  nombre: string;
  apellido: string;
  roles: codigo_rol[];
  especialidad: string;
}

interface ActividadDemo {
  codigo: string;
  nombre: string;
  descripcion: string;
  modalidad: modalidad_actividad;
  cupo_maximo: number | null;
}

interface HorarioDemo {
  codigoActividad: string;
  emailProfesora: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
}

function usuariosDemo(emailMultirol: string): UsuarioDemo[] {
  return [
    {
      email: "lucia.gomez@example.com",
      nombre: "Lucía",
      apellido: "Gómez",
      roles: ["PROFESORA"],
      especialidad: "Entrenamiento funcional",
    },
    {
      email: "carla.ruiz@example.com",
      nombre: "Carla",
      apellido: "Ruiz",
      roles: ["PROFESORA"],
      especialidad: "Pilates",
    },
    {
      email: emailMultirol,
      nombre: "Marina",
      apellido: "Sosa",
      roles: ["PROPIETARIA", "PROFESORA"],
      especialidad: "Entrenamiento personalizado",
    },
  ];
}

export const ACTIVIDADES_DEMO: ActividadDemo[] = [
  {
    codigo: "FUNCIONAL",
    nombre: "Funcional Grupal",
    descripcion: "Clase grupal de entrenamiento funcional",
    modalidad: "GRUPAL",
    cupo_maximo: null,
  },
  {
    codigo: "PILATES_REF",
    nombre: "Pilates Reformer",
    descripcion: "Clase personalizada en máquina reformer",
    modalidad: "PERSONALIZADA",
    cupo_maximo: 4,
  },
];

function horariosDemo(emailMultirol: string): HorarioDemo[] {
  return [
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: "lucia.gomez@example.com",
      dia_semana: 1,
      hora_inicio: "18:00",
      hora_fin: "19:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: "lucia.gomez@example.com",
      dia_semana: 3,
      hora_inicio: "18:00",
      hora_fin: "19:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "PILATES_REF",
      emailProfesora: "carla.ruiz@example.com",
      dia_semana: 2,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      cupo_maximo: null,
    },
    {
      codigoActividad: "PILATES_REF",
      emailProfesora: "carla.ruiz@example.com",
      dia_semana: 4,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      cupo_maximo: null,
    },
    // Cupo propio del horario, distinto del de la actividad (CA-07).
    {
      codigoActividad: "FUNCIONAL",
      emailProfesora: emailMultirol,
      dia_semana: 5,
      hora_inicio: "19:00",
      hora_fin: "20:00",
      cupo_maximo: 12,
    },
  ];
}

function convertirHora(hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

export interface DatosDemoCargados {
  // id_profesora por correo de la profesora
  idProfesora: Map<string, number>;
  // id_actividad por código de la actividad
  idActividad: Map<string, number>;
  horariosCreados: number;
}

// Espera el catálogo de seguridad ya cargado: las profesoras reciben sus roles de la tabla roles.
export async function cargarDatosDemo(
  prisma: PrismaClient,
  emailMultirol: string = EMAIL_MULTIROL_DEMO,
): Promise<DatosDemoCargados> {
  const idProfesora = await cargarUsuarios(prisma, usuariosDemo(emailMultirol));
  const idActividad = await cargarActividades(prisma);
  const horariosCreados = await cargarHorarios(prisma, horariosDemo(emailMultirol), idActividad, idProfesora);
  return { idProfesora, idActividad, horariosCreados };
}

async function cargarUsuarios(prisma: PrismaClient, usuarios: UsuarioDemo[]): Promise<Map<string, number>> {
  const roles = await prisma.roles.findMany();
  const idRol = new Map(roles.map((rol) => [rol.codigo, rol.id_rol]));
  const idProfesoraPorEmail = new Map<string, number>();

  for (const datos of usuarios) {
    const usuario = await prisma.usuarios.upsert({
      where: { email: datos.email },
      update: {},
      create: {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: new Date("1990-01-01"),
      },
    });
    await prisma.usuario_roles.createMany({
      data: datos.roles.map((rol) => ({ id_usuario: usuario.id_usuario, id_rol: idRol.get(rol) as number })),
      skipDuplicates: true,
    });
    const profesora = await prisma.profesoras.upsert({
      where: { id_usuario: usuario.id_usuario },
      update: {},
      create: { id_usuario: usuario.id_usuario, especialidad: datos.especialidad },
    });
    idProfesoraPorEmail.set(datos.email, profesora.id_profesora);
  }

  return idProfesoraPorEmail;
}

async function cargarActividades(prisma: PrismaClient): Promise<Map<string, number>> {
  const idActividadPorCodigo = new Map<string, number>();
  for (const actividad of ACTIVIDADES_DEMO) {
    const creada = await prisma.actividades.upsert({
      where: { codigo: actividad.codigo },
      update: {},
      create: { ...actividad, activo: true },
    });
    idActividadPorCodigo.set(actividad.codigo, creada.id_actividad);
  }
  return idActividadPorCodigo;
}

// Los horarios no tienen una clave única en el DER: se busca el mismo bloque activo antes de crearlo
// para que volver a correr el script no los duplique.
async function cargarHorarios(
  prisma: PrismaClient,
  horarios: HorarioDemo[],
  idActividad: Map<string, number>,
  idProfesora: Map<string, number>,
): Promise<number> {
  let creados = 0;
  for (const horario of horarios) {
    const clave = {
      id_actividad: idActividad.get(horario.codigoActividad) as number,
      id_profesora: idProfesora.get(horario.emailProfesora) as number,
      dia_semana: horario.dia_semana,
      hora_inicio: convertirHora(horario.hora_inicio),
    };
    const existente = await prisma.horarios.findFirst({ where: { ...clave, fecha_baja: null } });
    if (existente) continue;

    await prisma.horarios.create({
      data: { ...clave, hora_fin: convertirHora(horario.hora_fin), cupo_maximo: horario.cupo_maximo },
    });
    creados++;
  }
  return creados;
}
