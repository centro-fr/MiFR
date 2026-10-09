import type { Request, Response } from "express";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaPlanes } from "../interface/i-logica-servicio-entrenamiento.js";
import type {
  ActualizarPlanInput,
  CrearPlanInput,
  ListarPlanQuery,
  RegistrarPrecioInput,
} from "./plan.schemas.js";

export function createPlanController(logica: ILogicaPlanes) {
  return {
    async listar(req: Request<{}, {}, {}, ListarPlanQuery>, res: Response) {
      const planes = await logica.listarPlanes(req.query);
      res.json(planes);
    },

    async obtener(req: Request, res: Response) {
      const plan = await logica.obtenerPlanPorId(Number(req.params.id));
      res.json(plan);
    },

    async crear(req: Request, res: Response) {
      const plan = await logica.crearPlan(req.body as CrearPlanInput);
      res.status(201).json(plan);
    },

    async actualizar(req: Request, res: Response) {
      const plan = await logica.actualizarPlan(Number(req.params.id), req.body as ActualizarPlanInput);
      res.json(plan);
    },

    async baja(req: Request, res: Response) {
      const plan = await logica.darDeBajaPlan(Number(req.params.id));
      res.json(plan);
    },

    async listarPrecios(req: Request, res: Response) {
      const precios = await logica.listarPreciosPlan(Number(req.params.id));
      res.json(precios);
    },

    async registrarPrecio(req: Request, res: Response) {
      const precio = await logica.registrarPrecioPlan(
        Number(req.params.id),
        req.body as RegistrarPrecioInput,
      );
      auditar("PRECIO_PLAN_REGISTRADO", {
        por: req.usuario?.id_usuario,
        id_plan: precio.id_plan,
        precio: precio.precio,
        fecha_vigencia_desde: precio.fecha_vigencia_desde,
      });
      res.status(201).json(precio);
    },
  };
}
