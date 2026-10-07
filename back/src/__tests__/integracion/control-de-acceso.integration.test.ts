import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { CodigoRol } from "../../modules/gestion-usuarios/usuario/usuario.types.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion, SECRETO_JWT_DE_PRUEBA } from "./entorno.js";
import { crearUsuario, type UsuarioDePrueba } from "./fabricas.js";

// Los tests de rutas mockean IAutorizacion; acá los permisos salen de la base sembrada con la
// matriz inicial, que es lo que decide en producción quién entra a cada pantalla.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const ROLES: CodigoRol[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];
const ACTIVIDAD_VALIDA = { codigo: "FUNC", nombre: "Funcional", modalidad: "GRUPAL", cupo_maximo: 10 };

interface Sesion {
  usuario: UsuarioDePrueba;
  token: string;
}

async function sesionCon(...roles: CodigoRol[]): Promise<Sesion> {
  const usuario = await crearUsuario(prisma, { roles });
  return { usuario, token: await entorno.iniciarSesion(usuario.email) };
}

function autorizacion(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

beforeEach(() => reiniciarBase(prisma));
afterAll(() => entorno.cerrar());

describe("autenticación", () => {
  it("rechaza con 401 un pedido sin token", async () => {
    const respuesta = await request(app).get("/api/v1/actividades");

    expect(respuesta.status).toBe(401);
  });

  it("rechaza con 401 un token firmado con otro secreto", async () => {
    const { usuario } = await sesionCon("PROPIETARIA");
    const tokenAjeno = jwt.sign({ sub: String(usuario.id_usuario), roles: ["PROPIETARIA"] }, "otro-secreto");

    const respuesta = await request(app)
      .get("/api/v1/usuarios")
      .set(...autorizacion(tokenAjeno));

    expect(respuesta.status).toBe(401);
  });

  it("no deja iniciar sesión a quien no fue dado de alta", async () => {
    const respuesta = await request(app)
      .post("/api/v1/auth/google")
      .send({ id_token: "desconocido@example.com" });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.code).toBe("USUARIO_NO_REGISTRADO");
  });

  it("el login vincula la cuenta de Google y /auth/me devuelve los permisos de la base", async () => {
    const { usuario, token } = await sesionCon("ALUMNO");

    const respuesta = await request(app)
      .get("/api/v1/auth/me")
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.roles).toEqual(["ALUMNO"]);
    expect(respuesta.body.permisos).toEqual(expect.arrayContaining(["ACTIVIDADES_VER", "HORARIOS_VER"]));
    expect(respuesta.body.permisos).not.toContain("USUARIOS_VER");
    const enLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: usuario.id_usuario } });
    expect(enLaBase?.google_id).toBe(`google-${usuario.email}`);
  });

  it("rechaza con 401 el token de un usuario que ya no existe", async () => {
    const { usuario, token } = await sesionCon("PROPIETARIA");
    await prisma.usuario_roles.deleteMany({ where: { id_usuario: usuario.id_usuario } });
    await prisma.usuarios.delete({ where: { id_usuario: usuario.id_usuario } });

    const respuesta = await request(app)
      .get("/api/v1/actividades")
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(401);
  });

  it("rechaza con 403 a un usuario dado de baja aunque su token siga vigente", async () => {
    const { usuario, token } = await sesionCon("PROPIETARIA");
    await prisma.usuarios.update({ where: { id_usuario: usuario.id_usuario }, data: { estado: "INACTIVO" } });

    const respuesta = await request(app)
      .get("/api/v1/actividades")
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(403);
  });
});

describe("permisos de lectura según la matriz inicial", () => {
  const LECTURAS: { ruta: string; permitidos: CodigoRol[] }[] = [
    { ruta: "/api/v1/usuarios", permitidos: ["PROPIETARIA"] },
    { ruta: "/api/v1/seguridad/matriz", permitidos: ["PROPIETARIA"] },
    { ruta: "/api/v1/actividades", permitidos: ROLES },
    { ruta: "/api/v1/horarios", permitidos: ROLES },
    { ruta: "/api/v1/profesoras", permitidos: ROLES },
  ];
  const casos = LECTURAS.flatMap(({ ruta, permitidos }) =>
    ROLES.map((rol) => ({ ruta, rol, esperado: permitidos.includes(rol) ? 200 : 403 })),
  );

  it.each(casos)("GET $ruta con el rol $rol responde $esperado", async ({ ruta, rol, esperado }) => {
    const { token } = await sesionCon(rol);

    const respuesta = await request(app)
      .get(ruta)
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(esperado);
  });
});

describe("escrituras reservadas a la propietaria", () => {
  it("la propietaria crea una actividad", async () => {
    const { token } = await sesionCon("PROPIETARIA");

    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set(...autorizacion(token))
      .send(ACTIVIDAD_VALIDA);

    expect(respuesta.status).toBe(201);
    expect(await prisma.actividades.count()).toBe(1);
  });

  it.each(["PROFESORA", "ALUMNO", "TUTOR"] as const)(
    "%s no puede crear actividades y no queda nada guardado",
    async (rol) => {
      const { token } = await sesionCon(rol);

      const respuesta = await request(app)
        .post("/api/v1/actividades")
        .set(...autorizacion(token))
        .send(ACTIVIDAD_VALIDA);

      expect(respuesta.status).toBe(403);
      expect(await prisma.actividades.count()).toBe(0);
    },
  );

  it("un usuario con varios roles suma los permisos de todos", async () => {
    const { token } = await sesionCon("PROFESORA", "PROPIETARIA");

    const respuesta = await request(app)
      .get("/api/v1/usuarios")
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(200);
  });
});

describe("datos propios", () => {
  it("un alumno ve sus propios datos", async () => {
    const { usuario, token } = await sesionCon("ALUMNO");

    const respuesta = await request(app)
      .get(`/api/v1/usuarios/${usuario.id_usuario}`)
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.email).toBe(usuario.email);
  });

  it("un alumno no ve los datos de otro usuario", async () => {
    const { token } = await sesionCon("ALUMNO");
    const otro = await crearUsuario(prisma, { roles: ["ALUMNO"] });

    const respuesta = await request(app)
      .get(`/api/v1/usuarios/${otro.id_usuario}`)
      .set(...autorizacion(token));

    expect(respuesta.status).toBe(403);
  });

  it("un alumno no puede reactivarse ni darse de baja a sí mismo", async () => {
    const { usuario, token } = await sesionCon("ALUMNO");

    const respuesta = await request(app)
      .patch(`/api/v1/usuarios/${usuario.id_usuario}`)
      .set(...autorizacion(token))
      .send({ estado: "INACTIVO" });

    expect(respuesta.status).toBe(403);
    const enLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: usuario.id_usuario } });
    expect(enLaBase?.estado).toBe("ACTIVO");
  });
});

describe("los permisos se releen de la base en cada pedido", () => {
  it("los roles que dice el token no cuentan: decide la base", async () => {
    const { usuario } = await sesionCon("ALUMNO");
    const tokenConRolesFalsos = jwt.sign(
      { sub: String(usuario.id_usuario), roles: ["PROPIETARIA"] },
      SECRETO_JWT_DE_PRUEBA,
    );

    const respuesta = await request(app)
      .get("/api/v1/usuarios")
      .set(...autorizacion(tokenConRolesFalsos));

    expect(respuesta.status).toBe(403);
  });

  it("un permiso quitado en la matriz deja de valer con el mismo token", async () => {
    const propietaria = await sesionCon("PROPIETARIA");
    const alumno = await sesionCon("ALUMNO");

    const cambio = await request(app)
      .put("/api/v1/seguridad/matriz")
      .set(...autorizacion(propietaria.token))
      .send({ cambios: [{ rol: "ALUMNO", permiso: "ACTIVIDADES_VER", otorgado: false }] });
    const respuesta = await request(app)
      .get("/api/v1/actividades")
      .set(...autorizacion(alumno.token));

    expect(cambio.status).toBe(200);
    expect(respuesta.status).toBe(403);
  });

  it("un rol quitado deja de valer con el mismo token", async () => {
    const propietaria = await sesionCon("PROPIETARIA");
    const profesora = await sesionCon("PROFESORA");

    const cambio = await request(app)
      .delete(`/api/v1/usuarios/${profesora.usuario.id_usuario}/roles/PROFESORA`)
      .set(...autorizacion(propietaria.token));
    const respuesta = await request(app)
      .get("/api/v1/actividades")
      .set(...autorizacion(profesora.token));

    expect(cambio.status).toBe(200);
    expect(respuesta.status).toBe(403);
  });

  it("la matriz no deja otorgar a otro rol un permiso exclusivo de la propietaria", async () => {
    const { token } = await sesionCon("PROPIETARIA");

    const respuesta = await request(app)
      .put("/api/v1/seguridad/matriz")
      .set(...autorizacion(token))
      .send({ cambios: [{ rol: "PROFESORA", permiso: "PAGOS_CONFIRMAR", otorgado: true }] });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("PERMISO_EXCLUSIVO_PROPIETARIA");
    const otorgado = await prisma.rol_permisos.count({
      where: { rol: { codigo: "PROFESORA" }, permiso: { codigo: "PAGOS_CONFIRMAR" } },
    });
    expect(otorgado).toBe(0);
  });
});
