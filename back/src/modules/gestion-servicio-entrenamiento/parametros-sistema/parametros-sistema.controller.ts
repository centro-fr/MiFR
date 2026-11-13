import type { Request, Response } from "express";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaParametros } from "../interface/i-logica-servicio-entrenamiento.js";
import type { ActualizarParametroInput } from "./parametros-sistema.schemas.js";
import type { ClaveParametro } from "./parametros-sistema.types.js";

export function createParametrosSistemaController(logica: ILogicaParametros) {
  return {
    async listar(_req: Request, res: Response) {
      res.json(await logica.listarParametros());
    },

    async datosBancarios(_req: Request, res: Response) {
      res.json(await logica.obtenerDatosBancarios());
    },

    async actualizar(req: Request, res: Response) {
      const { valor } = req.body as ActualizarParametroInput;
      const parametro = await logica.actualizarParametro(req.params.clave as ClaveParametro, valor);
      // Los de tipo TEXTO son los datos bancarios: el log dice quién los cambió, pero no los copia.
      auditar("PARAMETRO_MODIFICADO", {
        por: req.usuario?.id_usuario,
        clave: parametro.clave,
        ...(parametro.tipo_dato === "TEXTO" ? {} : { valor: parametro.valor }),
      });
      res.json(parametro);
    },
  };
}
