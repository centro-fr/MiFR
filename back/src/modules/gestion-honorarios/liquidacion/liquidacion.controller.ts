import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaLiquidaciones } from "../interface/i-logica-honorarios.js";
import type { GenerarLiquidacionesInput, ListarLiquidacionesQuery } from "./liquidacion.schemas.js";

// Las liquidaciones deciden cuánto se le paga a cada profesora: generar, cerrar y pagar quedan en la
// auditoría con quién lo hizo, porque el DER no guarda eso.
export function createLiquidacionController(logica: ILogicaLiquidaciones) {
  return {
    async generar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const { periodo } = req.body as GenerarLiquidacionesInput;
      const resultado = await logica.generarLiquidaciones(periodo);
      auditar("LIQUIDACION_GENERADA", {
        por: idUsuario,
        periodo: periodo.periodo,
        liquidaciones: resultado.liquidaciones.length,
        sin_recalcular: resultado.sin_recalcular,
        advertencias: resultado.advertencias.length,
      });
      res.json(resultado);
    },

    async listar(req: Request, res: Response) {
      const { periodo } = req.query as unknown as ListarLiquidacionesQuery;
      res.json(await logica.listarLiquidaciones(periodo));
    },

    async obtener(req: Request, res: Response) {
      res.json(await logica.obtenerLiquidacion(Number(req.params.id)));
    },

    async cerrar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const liquidacion = await logica.cerrarLiquidacion(Number(req.params.id));
      auditar("LIQUIDACION_CERRADA", {
        por: idUsuario,
        id_liquidacion: liquidacion.id_liquidacion,
        id_profesora: liquidacion.id_profesora,
        monto_total: liquidacion.monto_total,
      });
      res.json(liquidacion);
    },

    async pagar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const liquidacion = await logica.pagarLiquidacion(Number(req.params.id));
      auditar("LIQUIDACION_PAGADA", {
        por: idUsuario,
        id_liquidacion: liquidacion.id_liquidacion,
        id_profesora: liquidacion.id_profesora,
        monto_total: liquidacion.monto_total,
      });
      res.json(liquidacion);
    },
  };
}