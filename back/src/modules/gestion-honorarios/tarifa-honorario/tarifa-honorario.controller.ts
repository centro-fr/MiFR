import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import { auditar, type EventoSeguridad } from "../../../shared/utils/auditoria.js";
import type { ILogicaTarifasHonorario } from "../interface/i-logica-honorarios.js";
import type {
  CerrarTarifaInput,
  ListarTarifasQuery,
  RegistrarTarifaInput,
} from "./tarifa-honorario.schemas.js";
import type { TarifaHonorario } from "./tarifa-honorario.types.js";

// Las tarifas mueven lo que cobra cada profesora (US-23): el DER no guarda quién las registró ni
// quién las cerró, así que cada cambio queda en la auditoría.
function auditarTarifa(evento: EventoSeguridad, idUsuario: number, tarifa: TarifaHonorario): void {
  auditar(evento, {
    por: idUsuario,
    id_tarifa: tarifa.id_tarifa,
    id_profesora: tarifa.id_profesora,
    concepto: tarifa.concepto,
    id_plan: tarifa.id_plan,
    tipo_valor: tarifa.tipo_valor,
    valor: tarifa.valor,
    fecha_vigencia_desde: tarifa.fecha_vigencia_desde,
    fecha_vigencia_hasta: tarifa.fecha_vigencia_hasta,
  });
}

export function createTarifaHonorarioController(logica: ILogicaTarifasHonorario) {
  return {
    async listar(req: Request, res: Response) {
      const { id_profesora, vigentes } = req.query as unknown as ListarTarifasQuery;
      res.json(await logica.listarTarifas({ id_profesora, soloVigentes: vigentes }));
    },

    async registrar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const tarifa = await logica.registrarTarifa(req.body as RegistrarTarifaInput);
      auditarTarifa("TARIFA_HONORARIO_REGISTRADA", idUsuario, tarifa);
      res.status(201).json(tarifa);
    },

    async cerrar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const { fecha_hasta } = req.body as CerrarTarifaInput;
      const tarifa = await logica.cerrarTarifa(Number(req.params.id), fecha_hasta);
      auditarTarifa("TARIFA_HONORARIO_CERRADA", idUsuario, tarifa);
      res.json(tarifa);
    },
  };
}
