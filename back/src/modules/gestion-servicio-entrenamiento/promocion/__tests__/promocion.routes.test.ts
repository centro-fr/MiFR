import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";
import type { ILogicaUsuarios } from "../../../gestion-usuarios/interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaServicioEntrenamiento } from "../../interface/i-logica-servicio-entrenamiento.js";

const promocion = {
  id_promocion: 4,
  codigo: "VERANO26",
  tipo_descuento: "PORCENTAJE",
  valor: 20,
  fecha_desde: "2026-12-01T00:00:00.000Z",
  fecha_hasta: "2027-02-28T00:00:00.000Z",
  planes: [{ id_plan: 1, nombre: "Básico" }],
  estado: "PROGRAMADA",
};
const alta = {
  codigo: "verano26",
  nombre: "Verano 2026",
  tipo_descuento: "PORCENTAJE",
  valor: 20,
  fecha_desde: "2026-12-01",
  fecha_hasta: "2027-02-28",
  ids_planes: [1],
};

function crearLogicaMock() {
  return {
    listarPromociones: vi.fn().mockResolvedValue([promocion]),
    obtenerPromocion: vi.fn().mockResolvedValue(promocion),
    crearPromocion: vi.fn().mockResolvedValue(promocion),
    actualizarPromocion: vi.fn().mockResolvedValue(promocion),
    desactivarPromocion: vi.fn().mockResolvedValue({ ...promocion, estado: "DESACTIVADA" }),
  };
}

describe("rutas de promociones", () => {
  let logica: ReturnType<typeof crearLogicaMock>;
  let autorizacion: IAutorizacion;
  let app: ReturnType<typeof createApp>;
  let warn: { mock: { calls: unknown[][] } };

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logica = crearLogicaMock();
    autorizacion = { tienePermiso: vi.fn(async () => true) } as unknown as IAutorizacion;
    const autenticacion = {
      validarSesion: async (token: string) => ({
        usuarioId: token === "propietaria" ? 1 : 2,
        roles: token === "propietaria" ? ["PROPIETARIA"] : ["PROFESORA"],
      }),
    } as unknown as IAutenticacion;

    app = createApp({
      gestionUsuarios: {} as unknown as ILogicaUsuarios,
      gestionPersonas: {} as unknown as ILogicaPersonas,
      gestionServicioEntrenamiento: logica as unknown as ILogicaServicioEntrenamiento,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      reportes: logicaInformesNoConfigurada,
      autenticacion,
      autorizacion,
    });
  });

  function como(quien: string, metodo: "get" | "post" | "patch", ruta: string) {
    return request(app)[metodo](`/api/v1/promociones${ruta}`).set("Authorization", `Bearer ${quien}`);
  }

  it("exige sesión", async () => {
    expect((await request(app).get("/api/v1/promociones")).status).toBe(401);
  });

  it("lista y muestra con PLANES_VER, con los filtros convertidos", async () => {
    const listado = await como("profesora", "get", "?estado=ACTIVA&id_plan=3");
    const detalle = await como("profesora", "get", "/4");

    expect(listado.status).toBe(200);
    expect(logica.listarPromociones).toHaveBeenCalledWith({
      estado: "ACTIVA",
      id_plan: 3,
      limit: 100,
      offset: 0,
    });
    expect(detalle.status).toBe(200);
    expect(logica.obtenerPromocion).toHaveBeenCalledWith(4);
    expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "PLANES_VER");
  });

  it("crea, edita y desactiva la propietaria, y queda en la auditoría", async () => {
    const creada = await como("propietaria", "post", "").send(alta);
    const editada = await como("propietaria", "patch", "/4").send({ valor: 15 });
    const desactivada = await como("propietaria", "post", "/4/desactivar");

    expect(creada.status).toBe(201);
    expect(logica.crearPromocion).toHaveBeenCalledWith({
      ...alta,
      codigo: "VERANO26",
      fecha_desde: new Date("2026-12-01T00:00:00Z"),
      fecha_hasta: new Date("2027-02-28T00:00:00Z"),
    });
    expect(editada.status).toBe(200);
    expect(logica.actualizarPromocion).toHaveBeenCalledWith(4, { valor: 15 });
    expect(desactivada.status).toBe(200);
    expect(logica.desactivarPromocion).toHaveBeenCalledWith(4);
    const eventos = warn.mock.calls.map(([linea]) => JSON.parse(String(linea)) as Record<string, unknown>);
    expect(eventos.map(({ auditoria }) => auditoria)).toEqual([
      "PROMOCION_CREADA",
      "PROMOCION_MODIFICADA",
      "PROMOCION_DESACTIVADA",
    ]);
    expect(eventos[0]).toMatchObject({ por: 1, id_promocion: 4, codigo: "VERANO26", ids_planes: [1] });
  });

  it.each([
    ["post", ""],
    ["patch", "/4"],
    ["post", "/4/desactivar"],
  ] as const)("%s %s es solo de la propietaria: la profesora recibe 403", async (metodo, ruta) => {
    const respuesta = await como("profesora", metodo, ruta).send(alta);

    expect(respuesta.status).toBe(403);
    expect(logica.crearPromocion).not.toHaveBeenCalled();
    expect(logica.actualizarPromocion).not.toHaveBeenCalled();
    expect(logica.desactivarPromocion).not.toHaveBeenCalled();
  });

  it("valida la entrada antes de llegar a la lógica y traduce el 409", async () => {
    expect((await como("propietaria", "post", "").send({ ...alta, valor: 120 })).status).toBe(400);
    expect((await como("propietaria", "patch", "/4").send({})).status).toBe(400);
    expect((await como("propietaria", "get", "?estado=OTRO")).status).toBe(400);
    expect(logica.crearPromocion).not.toHaveBeenCalled();

    logica.crearPromocion.mockRejectedValue(new ConflictError("Se superpone"));
    expect((await como("propietaria", "post", "").send(alta)).status).toBe(409);
  });
});
