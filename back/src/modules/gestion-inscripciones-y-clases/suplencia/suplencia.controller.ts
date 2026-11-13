import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaSuplencias } from "../interface/i-logica-inscripciones-y-clases.js";
import type {
  CambiarSuplenciaInput,
  ListarSuplenciasQuery,
  RegistrarSuplenciaInput,
} from "./suplencia.schemas.js";

// Las suplencias mueven honorarios entre profesoras (US-23): cada cambio queda en la auditoría,
// porque el DER guarda solo el último registro y no lo que se borró.
export function createSuplenciaController(logica: ILogicaSuplencias) {
  return {
    async listar(req: Request, res: Response) {
      res.json(await logica.listarSuplencias(req.query as unknown as ListarSuplenciasQuery));
    },

    async registrar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const registrada = await logica.registrarSuplencia(req.body as RegistrarSuplenciaInput, idUsuario);
      const { suplencia } = registrada;
      auditar("SUPLENCIA_REGISTRADA", {
        por: idUsuario,
        id_clase: suplencia.id_clase,
        id_prof_ausente: suplencia.id_prof_ausente,
        id_prof_suplente: suplencia.clase.id_prof_dictante,
      });
      res.status(201).json(registrada);
    },

    async cambiar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const suplencia = await logica.cambiarSuplencia(
        Number(req.params.idClase),
        req.body as CambiarSuplenciaInput,
        idUsuario,
      );
      auditar("SUPLENCIA_MODIFICADA", {
        por: idUsuario,
        id_clase: suplencia.id_clase,
        id_prof_suplente: suplencia.clase.id_prof_dictante,
      });
      res.json(suplencia);
    },

    async eliminar(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      const eliminada = await logica.eliminarSuplencia(Number(req.params.idClase));
      auditar("SUPLENCIA_ELIMINADA", {
        por: idUsuario,
        id_clase: eliminada.id_clase,
        id_prof_ausente: eliminada.id_prof_ausente,
        id_prof_suplente: eliminada.clase.id_prof_dictante,
      });
      res.status(204).send();
    },
  };
}
