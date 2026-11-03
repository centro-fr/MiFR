import { setupWorker } from "msw/browser";
import { actividadesHandlers } from "@/mocks/handlers/actividades";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { asistenciaHandlers } from "@/mocks/handlers/asistencia";
import { authHandlers } from "@/mocks/handlers/auth";
import { honorariosHandlers } from "@/mocks/handlers/honorarios";
import { promocionesHandlers } from "@/mocks/handlers/promociones";
import { suplenciasHandlers } from "@/mocks/handlers/suplencias";
import { horariosHandlers } from "@/mocks/handlers/horarios";
import { inactivosHandlers } from "@/mocks/handlers/inactivos";
import { insigniasHandlers } from "@/mocks/handlers/insignias";
import { inscripcionesHandlers } from "@/mocks/handlers/inscripciones";
import { notificacionesHandlers } from "@/mocks/handlers/notificaciones";
import { pagosHandlers } from "@/mocks/handlers/pagos";
import { personasHandlers } from "@/mocks/handlers/personas";
import { planesHandlers } from "@/mocks/handlers/planes";
import { publicoHandlers } from "@/mocks/handlers/publico";
import { rankingAsistenciaHandlers } from "@/mocks/handlers/ranking-asistencia";
import { seguridadHandlers } from "@/mocks/handlers/seguridad";

export const worker = setupWorker(
  ...authHandlers,
  ...asistenciaHandlers,
  ...seguridadHandlers,
  ...actividadesHandlers,
  ...personasHandlers,
  ...horariosHandlers,
  ...alumnosHandlers,
  ...inscripcionesHandlers,
  ...planesHandlers,
  ...pagosHandlers,
  ...publicoHandlers,
  ...rankingAsistenciaHandlers,
  ...honorariosHandlers,
  ...promocionesHandlers,
  ...suplenciasHandlers,
  ...notificacionesHandlers,
  ...inactivosHandlers,
  ...insigniasHandlers,
);
