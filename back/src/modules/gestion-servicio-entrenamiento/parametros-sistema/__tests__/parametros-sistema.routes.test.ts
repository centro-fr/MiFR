import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInsigniasNoConfigurada } from "../../../../__tests__/fakes/logica-insignias-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import { logicaRutinasNoConfigurada } from "../../../../__tests__/fakes/logica-rutinas-no-configurada.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";

const parametroEntero = {
  clave: "DIAS_RESERVA_PREINSCRIPCION",
  tipo_dato: "ENTERO",
  valor: 5,
  descripcion: "Días de reserva",
  fecha_actualizacion: "2026-10-11T00:00:00.000Z",
};
const parametroTexto = {
  clave: "DATOS_BANCARIOS_CBU",
  tipo_dato: "TEXTO",
  valor: "0000003100012345678901",
  descripcion: "CBU",
  fecha_actualizacion: "2026-10-11T00:00:00.000Z",
};
const datosBancarios = { cbu: "0000003100012345678901", alias: "mifr.centro", titular: "Centro MiFR" };

const USUARIO_POR_TOKEN: Record<string, { usuarioId: number; roles: string[] }> = {
  propietaria: { usuarioId: 1, roles: ["PROPIETARIA"] },
  profesora: { usuarioId: 2, roles: ["PROFESORA"] },
  alumno: { usuarioId: 3, roles: ["ALUMNO"] },
  tutor: { usuarioId: 4, roles: ["TUTOR"] },
};

function crearLogicaMock() {
  return {
    listarParametros: vi.fn(),
    actualizarParametro: vi.fn(),
    obtenerDatosBancarios: vi.fn(),
  };
}

describe("rutas de parámetros del sistema", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn(async () => true) } as unknown as IAutorizacion;
    const autenticacion = {
      validarSesion: async (token: string) => USUARIO_POR_TOKEN[token],
    } as unknown as IAutenticacion;

    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: {} as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: logica as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      gestionHonorarios: logicaHonorariosNoConfigurada,
      gestionRutinasYProgreso: logicaRutinasNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  describe("GET /api/v1/parametros", () => {
    it("exige sesión", async () => {
      const respuesta = await request(app).get("/api/v1/parametros");

      expect(respuesta.status).toBe(401);
    });

    it("lista los parámetros para la propietaria con el permiso PARAMETROS_EDITAR", async () => {
      logica.listarParametros.mockResolvedValue([parametroEntero]);

      const respuesta = await request(app)
        .get("/api/v1/parametros")
        .set("Authorization", "Bearer propietaria");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([parametroEntero]);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "PARAMETROS_EDITAR");
    });

    it.each(["profesora", "alumno", "tutor"])(
      "responde 403 al rol %s aunque tenga el permiso",
      async (token) => {
        const respuesta = await request(app)
          .get("/api/v1/parametros")
          .set("Authorization", `Bearer ${token}`);

        expect(respuesta.status).toBe(403);
        expect(logica.listarParametros).not.toHaveBeenCalled();
      },
    );

    it("responde 403 a la propietaria si le falta el permiso", async () => {
      vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

      const respuesta = await request(app)
        .get("/api/v1/parametros")
        .set("Authorization", "Bearer propietaria");

      expect(respuesta.status).toBe(403);
      expect(logica.listarParametros).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/parametros/datos-bancarios", () => {
    it("exige sesión", async () => {
      const respuesta = await request(app).get("/api/v1/parametros/datos-bancarios");

      expect(respuesta.status).toBe(401);
    });

    it.each(["alumno", "tutor", "propietaria"])("los da al rol %s sin pedir un permiso", async (token) => {
      logica.obtenerDatosBancarios.mockResolvedValue(datosBancarios);

      const respuesta = await request(app)
        .get("/api/v1/parametros/datos-bancarios")
        .set("Authorization", `Bearer ${token}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual(datosBancarios);
      expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
    });

    it("responde 403 a la profesora", async () => {
      const respuesta = await request(app)
        .get("/api/v1/parametros/datos-bancarios")
        .set("Authorization", "Bearer profesora");

      expect(respuesta.status).toBe(403);
      expect(logica.obtenerDatosBancarios).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/v1/parametros/:clave", () => {
    it("exige sesión", async () => {
      const respuesta = await request(app)
        .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
        .send({ valor: 5 });

      expect(respuesta.status).toBe(401);
    });

    it("modifica un parámetro para la propietaria y deja en el log quién y qué valor", async () => {
      logica.actualizarParametro.mockResolvedValue(parametroEntero);

      const respuesta = await request(app)
        .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
        .set("Authorization", "Bearer propietaria")
        .send({ valor: 5 });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual(parametroEntero);
      expect(logica.actualizarParametro).toHaveBeenCalledWith("DIAS_RESERVA_PREINSCRIPCION", 5);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "PARAMETROS_EDITAR");
      expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
        auditoria: "PARAMETRO_MODIFICADO",
        por: 1,
        clave: "DIAS_RESERVA_PREINSCRIPCION",
        valor: 5,
      });
    });

    it("no copia al log el valor de los datos bancarios", async () => {
      logica.actualizarParametro.mockResolvedValue(parametroTexto);

      const respuesta = await request(app)
        .patch("/api/v1/parametros/DATOS_BANCARIOS_CBU")
        .set("Authorization", "Bearer propietaria")
        .send({ valor: "0000003100012345678901" });

      const evento = JSON.parse(String(warn.mock.calls[0][0]));
      expect(respuesta.status).toBe(200);
      expect(evento).toMatchObject({
        auditoria: "PARAMETRO_MODIFICADO",
        por: 1,
        clave: "DATOS_BANCARIOS_CBU",
      });
      expect(evento).not.toHaveProperty("valor");
    });

    it.each(["profesora", "alumno", "tutor"])(
      "rechaza la edición al rol %s aunque tenga el permiso",
      async (token) => {
        const respuesta = await request(app)
          .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
          .set("Authorization", `Bearer ${token}`)
          .send({ valor: 5 });

        expect(respuesta.status).toBe(403);
        expect(logica.actualizarParametro).not.toHaveBeenCalled();
      },
    );

    it("rechaza la edición a la propietaria si le falta el permiso", async () => {
      vi.mocked(autorizacion.tienePermiso).mockResolvedValue(false);

      const respuesta = await request(app)
        .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
        .set("Authorization", "Bearer propietaria")
        .send({ valor: 5 });

      expect(respuesta.status).toBe(403);
      expect(logica.actualizarParametro).not.toHaveBeenCalled();
    });

    it("responde 400 y no llega a la lógica con una clave que no existe", async () => {
      const respuesta = await request(app)
        .patch("/api/v1/parametros/NO_EXISTE")
        .set("Authorization", "Bearer propietaria")
        .send({ valor: 5 });

      expect(respuesta.status).toBe(400);
      expect(logica.actualizarParametro).not.toHaveBeenCalled();
    });

    it.each([
      ["sin valor", {}],
      ["con un valor nulo", { valor: null }],
      ["con un valor que es un objeto", { valor: { numero: 5 } }],
      ["con un valor que es una lista", { valor: [5] }],
    ])("responde 400 y no llega a la lógica %s", async (_caso, cuerpo) => {
      const respuesta = await request(app)
        .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
        .set("Authorization", "Bearer propietaria")
        .send(cuerpo);

      expect(respuesta.status).toBe(400);
      expect(logica.actualizarParametro).not.toHaveBeenCalled();
    });
  });
});
