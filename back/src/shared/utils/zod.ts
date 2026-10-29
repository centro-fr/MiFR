import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// En Zod 4 cada esquema copia sus métodos al crearse, así que .openapi() tiene que estar en z antes de que
// se cree cualquiera. Por eso el código importa z desde acá y no desde "zod": el orden de los imports no
// puede dejar un esquema sin documentación.
extendZodWithOpenApi(z);

export { z };
