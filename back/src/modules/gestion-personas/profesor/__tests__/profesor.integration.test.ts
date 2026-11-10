import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { reiniciarBase } from "../../../../__tests__/integracion/base-de-prueba.js";
import { crearProfesora, crearUsuario } from "../../../../__tests__/integracion/fabricas.js";
import { crearEntornoDeIntegracion } from "../../../../__tests__/integracion/entorno.js";

const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

let tokenPropietaria: string;
let tokenProfesora: string;

function comoPropietaria(metodo: "get" | "patch" | "delete", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${tokenPropietaria}`);
}

function comoProfesora(metodo: "get" | "patch", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${tokenProfesora}`);
}

async function crearProfesoraConContacto() {
  const profesora = await crearProfesora(prisma);
  await prisma.usuarios.update({
    where: { id_usuario: profesora.id_usuario },
    data: {
      telefono: "+54 351 555 0101",
      fecha_nacimiento: new Date("1992-06-15T00:00:00.000Z"),
    },
  });
  return profesora;
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  const propietaria = await crearUsuario(prisma, { roles: ["PROPIETARIA"] });
  const profesora = await crearUsuario(prisma, { roles: ["PROFESORA"] });
  tokenPropietaria = await entorno.iniciarSesion(propietaria.email);
  tokenProfesora = await entorno.iniciarSesion(profesora.email);
});
afterAll(() => entorno.cerrar());

describe("PI-88: actualización y reincorporación de profesoras", () => {
  it("la propietaria modifica la especialidad y reincorpora el perfil existente", async () => {
    const profesora = await crearProfesoraConContacto();
    const baja = await comoPropietaria("delete", `/profesoras/${profesora.id_profesora}`);
    expect(baja.status).toBe(200);
    const respuesta = await comoPropietaria("patch", `/profesoras/${profesora.id_profesora}`).send({
      especialidad: "Posing",
      reactivar: true,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      id_profesora: profesora.id_profesora,
      id_usuario: profesora.id_usuario,
      especialidad: "Posing",
      fecha_baja: null,
    });
    expect(await prisma.profesoras.count({ where: { id_usuario: profesora.id_usuario } })).toBe(1);
    expect(
      await prisma.profesoras.findUniqueOrThrow({ where: { id_profesora: profesora.id_profesora } }),
    ).toMatchObject({
      especialidad: "Posing",
      fecha_baja: null,
    });
  });

  it("rechaza reincorporar a una profesora activa sin modificarla", async () => {
    const profesora = await crearProfesoraConContacto();

    const respuesta = await comoPropietaria("patch", `/profesoras/${profesora.id_profesora}`).send({
      reactivar: true,
    });

    expect(respuesta.status).toBe(409);
    expect(
      await prisma.profesoras.findUniqueOrThrow({ where: { id_profesora: profesora.id_profesora } }),
    ).toMatchObject({ especialidad: null, fecha_baja: null });
  });

  it("solo permite la actualización a la propietaria", async () => {
    const profesora = await crearProfesoraConContacto();
    const [rol, permiso] = await Promise.all([
      prisma.roles.findUniqueOrThrow({ where: { codigo: "PROFESORA" } }),
      prisma.permisos.findUniqueOrThrow({ where: { codigo: "HORARIOS_EDITAR" } }),
    ]);
    await prisma.rol_permisos.create({ data: { id_rol: rol.id_rol, id_permiso: permiso.id_permiso } });

    const respuesta = await comoProfesora("patch", `/profesoras/${profesora.id_profesora}`).send({
      especialidad: "Posing",
    });

    expect(respuesta.status).toBe(403);
    expect(
      await prisma.profesoras.findUniqueOrThrow({ where: { id_profesora: profesora.id_profesora } }),
    ).toMatchObject({ especialidad: null, fecha_baja: null });
  });

  it("requiere HORARIOS_EDITAR además del rol de propietaria", async () => {
    const profesora = await crearProfesoraConContacto();
    await prisma.rol_permisos.deleteMany({
      where: { rol: { codigo: "PROPIETARIA" }, permiso: { codigo: "HORARIOS_EDITAR" } },
    });

    const respuesta = await comoPropietaria("patch", `/profesoras/${profesora.id_profesora}`).send({
      especialidad: "Posing",
    });

    expect(respuesta.status).toBe(403);
    expect(
      await prisma.profesoras.findUniqueOrThrow({ where: { id_profesora: profesora.id_profesora } }),
    ).toMatchObject({ especialidad: null, fecha_baja: null });
  });
});

describe("PI-89: datos de contacto en el listado de profesoras", () => {
  it("incluye los datos de contacto y las bajas solo para la propietaria", async () => {
    const activa = await crearProfesoraConContacto();
    const dadaDeBaja = await crearProfesoraConContacto();
    const respuestaBaja = await comoPropietaria("delete", `/profesoras/${dadaDeBaja.id_profesora}`);
    expect(respuestaBaja.status).toBe(200);

    const listadoActivo = await comoPropietaria("get", "/profesoras");
    const listadoCompleto = await comoPropietaria("get", "/profesoras?incluirBajas=true");
    const listadoProfesora = await comoProfesora("get", "/profesoras?incluirBajas=true");

    expect(listadoActivo.status).toBe(200);
    expect(listadoActivo.body).toHaveLength(1);
    expect(listadoActivo.body[0]).toMatchObject({
      id_profesora: activa.id_profesora,
      usuario: {
        email: activa.email,
        telefono: "+54 351 555 0101",
        fecha_nacimiento: "1992-06-15T00:00:00.000Z",
      },
    });
    expect(listadoCompleto.body).toHaveLength(2);
    expect(listadoCompleto.body.map((fila: { id_profesora: number }) => fila.id_profesora)).toContain(
      dadaDeBaja.id_profesora,
    );
    expect(listadoProfesora.status).toBe(200);
    expect(listadoProfesora.body).toHaveLength(2);
    expect(listadoProfesora.body[0].usuario).not.toHaveProperty("email");
    expect(listadoProfesora.body[0].usuario).not.toHaveProperty("telefono");
    expect(listadoProfesora.body[0].usuario).not.toHaveProperty("fecha_nacimiento");
  });
});
