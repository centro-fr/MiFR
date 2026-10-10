import type { RoleCode } from "@/types/auth";
import type { MatrizPermisos, ModuloMatriz } from "@/types/permissions";

// Un módulo de cada forma que distingue la lógica de niveles:
// lectura + acción, una sola acción y permisos exclusivos de la propietaria.
export const CODIGOS_PLANES = ["PLANES_VER", "PLANES_EDITAR"];
export const CODIGOS_ASISTENCIAS = ["ASISTENCIAS_MARCAR"];
export const CODIGOS_HONORARIOS = ["HONORARIOS_VER_TODOS", "HONORARIOS_LIQUIDAR"];

function crearModulo(modulo: string, codigos: string[], primerId: number): ModuloMatriz {
  return {
    modulo,
    permisos: codigos.map((codigo, indice) => ({
      id_permiso: primerId + indice,
      codigo,
      descripcion: null,
      critico: false,
    })),
  };
}

export function crearMatriz(otorgados: Partial<Record<RoleCode, string[]>> = {}): MatrizPermisos {
  return {
    roles: [
      { id_rol: 1, codigo: "PROPIETARIA", nombre: "Propietaria" },
      { id_rol: 2, codigo: "PROFESORA", nombre: "Profesora" },
      { id_rol: 3, codigo: "ALUMNO", nombre: "Alumno" },
      { id_rol: 4, codigo: "TUTOR", nombre: "Tutor" },
    ],
    modulos: [
      crearModulo("PLANES", CODIGOS_PLANES, 1),
      crearModulo("ASISTENCIAS", CODIGOS_ASISTENCIAS, 10),
      crearModulo("HONORARIOS", CODIGOS_HONORARIOS, 20),
    ],
    matriz: {
      PROPIETARIA: [...CODIGOS_PLANES, ...CODIGOS_ASISTENCIAS, ...CODIGOS_HONORARIOS],
      PROFESORA: [],
      ALUMNO: [],
      TUTOR: [],
      ...otorgados,
    },
  };
}

// El schema del GET acepta un record parcial, así que en runtime puede faltar un rol
// aunque el tipo MatrizPermisos diga lo contrario.
export function crearMatrizSinRol(rol: RoleCode): MatrizPermisos {
  const matriz = crearMatriz();
  const otorgados: Partial<Record<RoleCode, string[]>> = { ...matriz.matriz };
  delete otorgados[rol];
  return { ...matriz, matriz: otorgados as MatrizPermisos["matriz"] };
}
