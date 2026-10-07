import type { PrismaClient } from "@prisma/client";
import type { CodigoRol, Usuario } from "../../modules/gestion-usuarios/usuario/usuario.types.js";

export interface UsuarioDePrueba {
  id_usuario: number;
  email: string;
}

interface OpcionesUsuario {
  roles: CodigoRol[];
  estado?: Usuario["estado"];
}

let siguienteNumero = 1;

// Prepara el escenario directo en la base, como lo dejaría el alta de la propietaria:
// lo que se prueba es lo que pasa después, al pedir por la API.
export async function crearUsuario(
  prisma: PrismaClient,
  { roles, estado = "ACTIVO" }: OpcionesUsuario,
): Promise<UsuarioDePrueba> {
  const numero = siguienteNumero++;
  const filasRoles = await prisma.roles.findMany({ where: { codigo: { in: roles } } });

  const usuario = await prisma.usuarios.create({
    data: {
      email: `usuario${numero}@example.com`,
      nombre: "Usuario",
      apellido: `De Prueba ${numero}`,
      fecha_nacimiento: new Date("1990-01-01"),
      estado,
      roles: { create: filasRoles.map((rol) => ({ id_rol: rol.id_rol })) },
    },
  });

  return { id_usuario: usuario.id_usuario, email: usuario.email as string };
}
