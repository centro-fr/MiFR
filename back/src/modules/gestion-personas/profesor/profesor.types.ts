import type { profesoras, usuarios } from "@prisma/client";

// El nombre vive en usuarios (DER: profesoras.id_usuario): se trae con la profesora para
// que quien la muestre no tenga que pedir el listado de usuarios.
export type Profesora = profesoras & { usuario: Pick<usuarios, "nombre" | "apellido"> };
