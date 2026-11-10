import type { profesoras, usuarios } from "@prisma/client";

// Los datos del usuario son opcionales porque solo el listado de la propietaria los incluye.
export type Profesora = profesoras & {
  usuario: Pick<usuarios, "nombre" | "apellido"> &
    Partial<Pick<usuarios, "email" | "telefono" | "fecha_nacimiento">>;
};
