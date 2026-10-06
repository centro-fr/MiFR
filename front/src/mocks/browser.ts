import { setupWorker } from "msw/browser";
import { authHandlers } from "@/mocks/handlers/auth";
import { seguridadHandlers } from "@/mocks/handlers/seguridad";

export const worker = setupWorker(...authHandlers, ...seguridadHandlers);
