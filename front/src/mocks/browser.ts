import { setupWorker } from "msw/browser";
import { actividadesHandlers } from "@/mocks/handlers/actividades";
import { authHandlers } from "@/mocks/handlers/auth";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { horariosHandlers } from "@/mocks/handlers/horarios";
import { personasHandlers } from "@/mocks/handlers/personas";
import { seguridadHandlers } from "@/mocks/handlers/seguridad";

export const worker = setupWorker(
  ...authHandlers,
  ...seguridadHandlers,
  ...alumnosHandlers,
  ...actividadesHandlers,
  ...personasHandlers,
  ...horariosHandlers,
);
