import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { CodigoRol } from "../../modules/gestion-usuarios/usuario/usuario.types.js";
import { cargarDatosDemo } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion, SECRETO_JWT_DE_PRUEBA } from "./entorno.js";
import { crearUsuario, type UsuarioDePrueba } from "./fabricas.js";

// Los tests de rutas mockean IAutorizacion; acá los permisos salen de la base sembrada con la
// matriz inicial, que es lo que decide en producción quién entra a cada pantalla.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const ROLES: CodigoRol[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];
const ROLES_SIN_ESCRITURA = ["PROFESORA", "ALUMNO", "TUTOR"] as const;
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
    expect(await prisma.usuarios.count()).toBe(0);
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

  it.each(ROLES_SIN_ESCRITURA)("%s no puede crear actividades y no queda nada guardado", async (rol) => {
    const { token } = await sesionCon(rol);

    const respuesta = await request(app)
      .post("/api/v1/actividades")
      .set(...autorizacion(token))
      .send(ACTIVIDAD_VALIDA);

    expect(respuesta.status).toBe(403);
    expect(await prisma.actividades.count()).toBe(0);
  });

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

describe("escrituras sobre actividades y horarios cargados", () => {
  it.each(ROLES_SIN_ESCRITURA)(
    "%s no puede modificar ni dar de baja actividades ni asignar horarios, y la base queda igual",
    async (rol) => {
      const { idActividad, idProfesora } = await cargarDatosDemo(prisma);
      const idFuncional = idActividad.get("FUNCIONAL") as number;
      const horariosAntes = await prisma.horarios.count();
      const { token } = await sesionCon(rol);

      const modificar = await request(app)
        .patch(`/api/v1/actividades/${idFuncional}`)
        .set(...autorizacion(token))
        .send({ descripcion: "Descripción cambiada" });
      const darDeBaja = await request(app)
        .delete(`/api/v1/actividades/${idFuncional}`)
        .set(...autorizacion(token));
      const asignarHorario = await request(app)
        .post("/api/v1/horarios")
        .set(...autorizacion(token))
        .send({
          id_actividad: idFuncional,
          id_profesora: idProfesora.get("carla.ruiz@example.com"),
          dia_semana: 6,
          hora_inicio: "10:00",
          hora_fin: "11:00",
        });

      expect([modificar.status, darDeBaja.status, asignarHorario.status]).toEqual([403, 403, 403]);
      const funcional = await prisma.actividades.findUnique({ where: { id_actividad: idFuncional } });
      expect(funcional).toMatchObject({
        descripcion: "Entrenamiento funcional en grupo",
        activo: true,
      });
      expect(await prisma.horarios.count()).toBe(horariosAntes);
    },
  );
});

async function delegarUsuariosEditarAProfesora(tokenPropietaria: string): Promise<void> {
  const cambio = await request(app)
    .put("/api/v1/seguridad/matriz")
    .set(...autorizacion(tokenPropietaria))
    .send({ cambios: [{ rol: "PROFESORA", permiso: "USUARIOS_EDITAR", otorgado: true }] });
  expect(cambio.status).toBe(200);
}

async function rolesDe(idUsuario: number): Promise<string[]> {
  const filas = await prisma.usuario_roles.findMany({
    where: { id_usuario: idUsuario },
    include: { rol: true },
  });
  return filas.map(({ rol }) => rol.codigo).sort();
}

describe("PI-28: administración de roles y cuentas reservada a la propietaria", () => {
  it("con USUARIOS_EDITAR delegado, una profesora no se hace propietaria ni deja afuera a la dueña", async () => {
    const duena = await sesionCon("PROPIETARIA");
    const profesora = await sesionCon("PROFESORA");
    await delegarUsuariosEditarAProfesora(duena.token);
    const comoProfesora = autorizacion(profesora.token);
    const idDuena = duena.usuario.id_usuario;

    const respuestas = await Promise.all([
      request(app)
        .post(`/api/v1/usuarios/${profesora.usuario.id_usuario}/roles`)
        .set(...comoProfesora)
        .send({ rol: "PROPIETARIA" }),
      request(app)
        .delete(`/api/v1/usuarios/${idDuena}/roles/PROPIETARIA`)
        .set(...comoProfesora),
      request(app)
        .patch(`/api/v1/usuarios/${idDuena}`)
        .set(...comoProfesora)
        .send({ estado: "INACTIVO" }),
      request(app)
        .delete(`/api/v1/usuarios/${idDuena}`)
        .set(...comoProfesora),
    ]);

    expect(respuestas.map(({ status }) => status)).toEqual([403, 403, 403, 403]);
    expect(await rolesDe(profesora.usuario.id_usuario)).toEqual(["PROFESORA"]);
    expect(await rolesDe(idDuena)).toEqual(["PROPIETARIA"]);
    const duenaEnLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: idDuena } });
    expect(duenaEnLaBase?.estado).toBe("ACTIVO");
  });

  it("la única propietaria activa no se puede quitar el rol ni dejarse inactiva", async () => {
    const duena = await sesionCon("PROPIETARIA");
    const idDuena = duena.usuario.id_usuario;

    const quitarRol = await request(app)
      .delete(`/api/v1/usuarios/${idDuena}/roles/PROPIETARIA`)
      .set(...autorizacion(duena.token));
    const desactivar = await request(app)
      .patch(`/api/v1/usuarios/${idDuena}`)
      .set(...autorizacion(duena.token))
      .send({ estado: "INACTIVO" });

    expect([quitarRol.status, desactivar.status]).toEqual([409, 409]);
    expect(await rolesDe(idDuena)).toEqual(["PROPIETARIA"]);
    const enLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: idDuena } });
    expect(enLaBase?.estado).toBe("ACTIVO");
  });

  it("con otra propietaria activa, una puede dejar el rol", async () => {
    const duena = await sesionCon("PROPIETARIA");
    await crearUsuario(prisma, { roles: ["PROPIETARIA"] });

    const respuesta = await request(app)
      .delete(`/api/v1/usuarios/${duena.usuario.id_usuario}/roles/PROPIETARIA`)
      .set(...autorizacion(duena.token));

    expect(respuesta.status).toBe(200);
    expect(await rolesDe(duena.usuario.id_usuario)).toEqual([]);
  });
});

describe("PI-29: identidad de la cuenta", () => {
  it.each([{ dni: "30111222" }, { fecha_nacimiento: "1975-05-05" }])(
    "un usuario sin permisos no cambia su propio %j",
    async (cambio) => {
      const { usuario, token } = await sesionCon("ALUMNO");

      const respuesta = await request(app)
        .patch(`/api/v1/usuarios/${usuario.id_usuario}`)
        .set(...autorizacion(token))
        .send(cambio);

      expect(respuesta.status).toBe(403);
      const enLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: usuario.id_usuario } });
      expect(enLaBase).toMatchObject({ dni: null, fecha_nacimiento: new Date("1990-01-01") });
    },
  );

  it("un usuario sin permisos sí cambia su propio teléfono", async () => {
    const { usuario, token } = await sesionCon("ALUMNO");

    const respuesta = await request(app)
      .patch(`/api/v1/usuarios/${usuario.id_usuario}`)
      .set(...autorizacion(token))
      .send({ telefono: "3794 112233" });

    expect(respuesta.status).toBe(200);
    const enLaBase = await prisma.usuarios.findUnique({ where: { id_usuario: usuario.id_usuario } });
    expect(enLaBase?.telefono).toBe("3794 112233");
  });

  it("dar de alta un usuario con un DNI que ya existe responde 409, no 500", async () => {
    const { token } = await sesionCon("PROPIETARIA");
    const existente = await crearUsuario(prisma, { roles: [] });
    await prisma.usuarios.update({ where: { id_usuario: existente.id_usuario }, data: { dni: "30111222" } });
    const usuariosAntes = await prisma.usuarios.count();

    const respuesta = await request(app)
      .post("/api/v1/usuarios")
      .set(...autorizacion(token))
      .send({ nombre: "Otra", apellido: "Persona", dni: "30111222", fecha_nacimiento: "1990-01-01" });

    expect(respuesta.status).toBe(409);
    expect(await prisma.usuarios.count()).toBe(usuariosAntes);
  });
});
