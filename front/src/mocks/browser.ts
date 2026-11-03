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
import { inscripcionesHandlers } from "@/mocks/handlers/inscripciones";
import { notificacionesHandlers } from "@/mocks/handlers/notificaciones";
import { pagosHandlers } from "@/mocks/handlers/pagos";
import { personasHandlers } from "@/mocks/handlers/personas";
import { planesHandlers } from "@/mocks/handlers/planes";
import { publicoHandlers } from "@/mocks/handlers/publico";
import { reportesHandlers } from "@/mocks/handlers/reportes";
import { rutinasHandlers } from "@/mocks/handlers/rutinas";
import { seguridadHandlers } from "@/mocks/handlers/seguridad";

export const worker = setupWorker(
  ...authHandlers,
  ...asistenciaHandlers,
  ...seguridadHandlers,
  ...actividadesHandlers,
  ...personasHandlers,
  ...horariosHandlers,
  // Antes que alumnos: si no, GET /alumnos/:id atrapa a GET /alumnos/mios.
  ...rutinasHandlers,
  ...alumnosHandlers,
  ...inscripcionesHandlers,
  ...planesHandlers,
  ...pagosHandlers,
  ...publicoHandlers,
  ...honorariosHandlers,
  ...promocionesHandlers,
  ...suplenciasHandlers,
  ...notificacionesHandlers,
  ...inactivosHandlers,
  ...reportesHandlers,
);
