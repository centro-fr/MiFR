import { setupWorker } from "msw/browser";
import { actividadesHandlers } from "@/mocks/handlers/actividades";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { authHandlers } from "@/mocks/handlers/auth";
import { horariosHandlers } from "@/mocks/handlers/horarios";
import { inscripcionesHandlers } from "@/mocks/handlers/inscripciones";
import { personasHandlers } from "@/mocks/handlers/personas";
import { planesHandlers } from "@/mocks/handlers/planes";
import { seguridadHandlers } from "@/mocks/handlers/seguridad";

export const worker = setupWorker(
  ...authHandlers,
  ...seguridadHandlers,
  ...alumnosHandlers,
  ...actividadesHandlers,
  ...personasHandlers,
  ...horariosHandlers,
  ...planesHandlers,
  ...inscripcionesHandlers,
);
