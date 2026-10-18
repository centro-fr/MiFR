import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CuotaParaAviso } from "../../../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IRegistroNotificaciones } from "../../notificacion/interface/i-registro-notificaciones.js";
import { PlanificadorNotificacionesService } from "../planificador-notificaciones.service.js";

const HOY = new Date("2026-10-18T00:00:00Z");
// 18/10 a las 15:00 de Argentina y, a las 22:00, ya 19/10 en UTC: sigue siendo el mismo día del centro.
const A_LA_TARDE = new Date("2026-10-18T18:00:00Z");
const A_LA_NOCHE = new Date("2026-10-19T01:00:00Z");
const AL_DIA_SIGUIENTE = new Date("2026-10-19T12:00:00Z");

const ADULTA = {
  id_alumno: 5,
  id_usuario: 50,
  id_usuario_responsable: null,
  nombre: "Sofía",
  apellido: "Medina",
};
const MENOR = {
  id_alumno: 6,
  id_usuario: 60,
  id_usuario_responsable: 61,
  nombre: "Mateo",
  apellido: "Romero",
};

function aviso(datos: Partial<CuotaParaAviso>): CuotaParaAviso {
  return {
    tipo: "CUOTA_POR_VENCER",
    id_cuota: 101,
    id_inscripcion: 12,
    fecha_vencimiento: new Date("2026-10-20T00:00:00Z"),
    nombre_plan: "Intermedio",
    alumno: ADULTA,
    ...datos,
  };
}

describe("PlanificadorNotificacionesService", () => {
  let cuotas: { paraAvisoDeVencimiento: ReturnType<typeof vi.fn> };
  let parametros: { obtener: ReturnType<typeof vi.fn> };
  let notificaciones: { registrar: ReturnType<typeof vi.fn> };
  let planificador: PlanificadorNotificacionesService;

  beforeEach(() => {
    cuotas = { paraAvisoDeVencimiento: vi.fn().mockResolvedValue([aviso({})]) };
    parametros = { obtener: vi.fn().mockResolvedValue(3) };
    notificaciones = { registrar: vi.fn().mockImplementation(async (lista: unknown[]) => lista.length) };
    planificador = new PlanificadorNotificacionesService(
      cuotas as unknown as IInfoCuotas,
      parametros as unknown as IInfoParametros,
      notificaciones as unknown as IRegistroNotificaciones,
    );
  });

  describe("generarAvisos", () => {
    it("pide las cuotas a avisar con los DIAS_AVISO_VENCIMIENTO del parámetro", async () => {
      await expect(planificador.generarAvisos(HOY)).resolves.toBe(1);

      expect(parametros.obtener).toHaveBeenCalledWith("DIAS_AVISO_VENCIMIENTO");
      expect(cuotas.paraAvisoDeVencimiento).toHaveBeenCalledWith(HOY, 3);
    });

    it("le avisa a la alumna mayor, con su cuota y el tipo de aviso", async () => {
      await planificador.generarAvisos(HOY);

      expect(notificaciones.registrar).toHaveBeenCalledWith([
        {
          id_usuario: 50,
          tipo: "CUOTA_POR_VENCER",
          id_cuota: 101,
          mensaje: "Tu cuota del plan Intermedio vence el 20/10/2026.",
        },
      ]);
    });

    it("el aviso de un menor va al tutor y nombra al alumno", async () => {
      cuotas.paraAvisoDeVencimiento.mockResolvedValue([
        aviso({ tipo: "CUOTA_VENCIDA", fecha_vencimiento: new Date("2026-10-10T00:00:00Z"), alumno: MENOR }),
      ]);

      await planificador.generarAvisos(HOY);

      expect(notificaciones.registrar).toHaveBeenCalledWith([
        {
          id_usuario: 61,
          tipo: "CUOTA_VENCIDA",
          id_cuota: 101,
          mensaje: "La cuota de Mateo Romero del plan Intermedio venció el 10/10/2026.",
        },
      ]);
    });

    it.each([
      ["CUOTA_POR_VENCER", "Tu cuota del plan Intermedio vence hoy, 18/10/2026."],
      ["CUOTA_VENCIDA", "Tu cuota del plan Intermedio vence hoy, 18/10/2026."],
    ] as const)("el aviso %s del día del vencimiento dice que vence hoy", async (tipo, mensaje) => {
      cuotas.paraAvisoDeVencimiento.mockResolvedValue([aviso({ tipo, fecha_vencimiento: HOY })]);

      await planificador.generarAvisos(HOY);

      expect(notificaciones.registrar.mock.calls[0][0][0].mensaje).toBe(mensaje);
    });

    it("sin cuotas para avisar no registra nada", async () => {
      cuotas.paraAvisoDeVencimiento.mockResolvedValue([]);

      await expect(planificador.generarAvisos(HOY)).resolves.toBe(0);
      expect(notificaciones.registrar).toHaveBeenCalledWith([]);
    });
  });

  describe("generarAvisosDelDia", () => {
    it("genera con el día de Argentina y no vuelve a generar ese mismo día", async () => {
      await expect(planificador.generarAvisosDelDia(A_LA_TARDE)).resolves.toBe(1);
      await expect(planificador.generarAvisosDelDia(A_LA_NOCHE)).resolves.toBe(0);

      expect(cuotas.paraAvisoDeVencimiento).toHaveBeenCalledTimes(1);
      expect(cuotas.paraAvisoDeVencimiento).toHaveBeenCalledWith(HOY, 3);
    });

    it("vuelve a generar al día siguiente", async () => {
      await planificador.generarAvisosDelDia(A_LA_TARDE);
      await planificador.generarAvisosDelDia(AL_DIA_SIGUIENTE);

      expect(cuotas.paraAvisoDeVencimiento).toHaveBeenLastCalledWith(new Date("2026-10-19T00:00:00Z"), 3);
    });

    it("si falla, el mismo día lo vuelve a intentar", async () => {
      notificaciones.registrar.mockRejectedValueOnce(new Error("base caída"));

      await expect(planificador.generarAvisosDelDia(A_LA_TARDE)).rejects.toThrow("base caída");
      await expect(planificador.generarAvisosDelDia(A_LA_NOCHE)).resolves.toBe(1);
    });

    it("sin fecha usa el momento actual", async () => {
      await planificador.generarAvisosDelDia();

      expect(cuotas.paraAvisoDeVencimiento).toHaveBeenCalledTimes(1);
    });
  });
});
