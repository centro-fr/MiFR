import { ForbiddenError } from "../../shared/errors/app-error.js";
import type { Guardia } from "../../shared/middlewares/auth.js";

// Pasa con el primer guardia que lo deje; cualquier otro error (sesión, base) sigue de largo.
export function cualquieraDe(...guardias: Guardia[]): Guardia {
  return async (req, res, next) => {
    for (const guardia of guardias) {
      let paso = false;
      try {
        await guardia(req, res, () => {
          paso = true;
        });
      } catch (error) {
        if (!(error instanceof ForbiddenError)) throw error;
      }
      if (paso) return next();
    }
    throw new ForbiddenError();
  };
}
