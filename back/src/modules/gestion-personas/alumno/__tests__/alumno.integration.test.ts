import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { reiniciarBase } from "../../../../__tests__/integracion/base-de-prueba.js";
import { crearEntornoDeIntegracion } from "../../../../__tests__/integracion/entorno.js";
import { crearAlumno, crearUsuario } from "../../../../__tests__/integracion/fabricas.js";
import { RolRepository } from "../../../gestion-usuarios/rol/rol.repository.js";
import { RolService } from "../../../gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "../../../gestion-usuarios/usuario/usuario.repository.js";
import { UsuarioService } from "../../../gestion-usuarios/usuario/usuario.service.js";
import { AlumnoRepository } from "../alumno.repository.js";
import { AlumnoService } from "../alumno.service.js";

// Caso PI-19: los cambios de estado que va a disparar Inscripcion (US-07 y US-08) todavía no
// tienen endpoint. Se prueban con el componente armado sobre la base real; la parte por HTTP se
// suma con las inscripciones.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;
const rolService = new RolService(new RolRepository(prisma));
const alumnos = new AlumnoService(
  new AlumnoRepository(prisma),
  new UsuarioService(new UsuarioRepository(prisma), rolService),
  rolService,
);

async function estadoDelLogin(email: string): Promise<number> {
  const respuesta = await request(app).post("/api/v1/auth/google").send({ id_token: email });
  return respuesta.status;
}

async function rolesDe(idUsuario: number): Promise<string[]> {
  const filas = await prisma.usuario_roles.findMany({
    where: { id_usuario: idUsuario },
    include: { rol: true },
  });
  return filas.map((fila) => fila.rol.codigo);
}

beforeEach(async () => {
  await reiniciarBase(prisma);
});
afterAll(() => entorno.cerrar());

describe("PI-19: cambios de estado del alumno contra la base", () => {
  it("activar a un mayor le da acceso con el rol ALUMNO, y repetirlo no duplica nada", async () => {
    const { id_alumno, id_usuario } = await crearAlumno(prisma, { email: "ana@example.com" });

    await alumnos.activar(id_alumno);
    await alumnos.activar(id_alumno);

    const alumno = await prisma.alumnos.findUnique({ where: { id_alumno }, include: { usuario: true } });
    expect(alumno?.estado).toBe("ACTIVO");
    expect(alumno?.usuario.estado).toBe("ACTIVO");
    expect(await rolesDe(id_usuario)).toEqual(["ALUMNO"]);
    expect(await estadoDelLogin("ana@example.com")).toBe(200);
  });

  it("activar a un menor le da acceso a su tutor con el rol TUTOR", async () => {
    const tutora = await crearUsuario(prisma, { roles: [], estado: "INACTIVO" });
    const { id_alumno, id_usuario } = await crearAlumno(prisma, {
      email: null,
      fecha_nacimiento: new Date("2016-05-10T00:00:00Z"),
      id_usuario_responsable: tutora.id_usuario,
    });

    await alumnos.activar(id_alumno);

    expect(await rolesDe(tutora.id_usuario)).toEqual(["TUTOR"]);
    expect(await rolesDe(id_usuario)).toEqual([]);
    expect(await estadoDelLogin(tutora.email)).toBe(200);
  });

  it("la baja corta el acceso y la reactivación lo devuelve, sin borrar al alumno", async () => {
    const { id_alumno } = await crearAlumno(prisma, { email: "ana@example.com" });
    await alumnos.activar(id_alumno);

    await alumnos.darDeBaja(id_alumno);
    const dadoDeBaja = await prisma.alumnos.findUnique({ where: { id_alumno } });
    const loginDeBaja = await estadoDelLogin("ana@example.com");
    await alumnos.reactivar(id_alumno);

    expect(dadoDeBaja?.estado).toBe("BAJA");
    expect(dadoDeBaja?.fecha_baja).not.toBeNull();
    expect(loginDeBaja).toBe(403);
    const reactivado = await prisma.alumnos.findUnique({ where: { id_alumno } });
    expect(reactivado).toMatchObject({ estado: "ACTIVO", fecha_baja: null });
    expect(await estadoDelLogin("ana@example.com")).toBe(200);
  });
});
