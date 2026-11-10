import type { Request, Response } from "express";
import { auditar, type EventoSeguridad } from "../../../shared/utils/auditoria.js";
import type { ILogicaPromociones } from "../interface/i-logica-servicio-entrenamiento.js";
import type {
  ActualizarPromocionInput,
  CrearPromocionInput,
  ListarPromocionesQuery,
} from "./promocion.schemas.js";
import type { Promocion } from "./promocion.types.js";

// El DER no guarda quién creó, cambió o desactivó una promoción: queda en la auditoría, como el precio.
function auditarPromocion(evento: EventoSeguridad, req: Request, promocion: Promocion): void {
  auditar(evento, {
    por: req.usuario?.id_usuario,
    id_promocion: promocion.id_promocion,
    codigo: promocion.codigo,
    tipo_descuento: promocion.tipo_descuento,
    valor: promocion.valor,
    fecha_desde: promocion.fecha_desde,
    fecha_hasta: promocion.fecha_hasta,
    ids_planes: promocion.planes.map(({ id_plan }) => id_plan),
  });
}

export function createPromocionController(logica: ILogicaPromociones) {
  return {
    async listar(req: Request, res: Response) {
      res.json(await logica.listarPromociones(req.query as unknown as ListarPromocionesQuery));
    },

    async obtener(req: Request, res: Response) {
      res.json(await logica.obtenerPromocion(Number(req.params.id)));
    },

    async crear(req: Request, res: Response) {
      const promocion = await logica.crearPromocion(req.body as CrearPromocionInput);
      auditarPromocion("PROMOCION_CREADA", req, promocion);
      res.status(201).json(promocion);
    },

    async actualizar(req: Request, res: Response) {
      const promocion = await logica.actualizarPromocion(
        Number(req.params.id),
        req.body as ActualizarPromocionInput,
      );
      auditarPromocion("PROMOCION_MODIFICADA", req, promocion);
      res.json(promocion);
    },

    async desactivar(req: Request, res: Response) {
      const promocion = await logica.desactivarPromocion(Number(req.params.id));
      auditarPromocion("PROMOCION_DESACTIVADA", req, promocion);
      res.json(promocion);
    },

    async reactivar(req: Request, res: Response) {
      const promocion = await logica.reactivarPromocion(Number(req.params.id));
      auditarPromocion("PROMOCION_MODIFICADA", req, promocion);
      res.json(promocion);
    },
  };
}
