import { useCallback, useMemo, useState } from "react";
import {
  cambiosParaNivel,
  derivarNivel,
  motivoBloqueoCelda,
  NIVEL_COMPLETO,
  nivelesEquivalentes,
  siguienteNivel,
  type NivelAcceso,
} from "@/features/seguridad/utils/niveles";
import type { MatrizPermisos } from "@/types/permissions";
import type { RoleCode } from "@/types/auth";

function claveCelda(rol: RoleCode, modulo: string): string {
  return `${rol}::${modulo}`;
}

function parseClave(clave: string): { rol: RoleCode; modulo: string } {
  const sep = clave.indexOf("::");
  return { rol: clave.slice(0, sep) as RoleCode, modulo: clave.slice(sep + 2) };
}

function codigosDe(matriz: MatrizPermisos, modulo: string): string[] {
  return matriz.modulos.find((m) => m.modulo === modulo)?.permisos.map((p) => p.codigo) ?? [];
}

function nivelServidor(matriz: MatrizPermisos, rol: RoleCode, modulo: string): NivelAcceso {
  return derivarNivel(codigosDe(matriz, modulo), new Set(matriz.matriz[rol]));
}

// Estado de edición local: nivel objetivo por celda + traducción a cambios
// atómicos para el PUT. La vista muestra el objetivo si existe.
export function useMatrizEditor(matriz: MatrizPermisos | undefined) {
  const [objetivos, setObjetivos] = useState<Map<string, NivelAcceso>>(new Map());

  const nivelDe = useCallback(
    (rol: RoleCode, modulo: string): NivelAcceso => {
      // La propietaria es acceso total fijo: siempre verde, sin importar
      // objetivos locales ni valores del servidor.
      if (rol === "PROPIETARIA") return NIVEL_COMPLETO;
      const objetivo = objetivos.get(claveCelda(rol, modulo));
      if (objetivo !== undefined) return objetivo;
      if (!matriz) return 2;
      return nivelServidor(matriz, rol, modulo);
    },
    [matriz, objetivos],
  );

  const bloqueoDe = useCallback(
    (rol: RoleCode, modulo: string): string | null => {
      if (!matriz) return null;
      return motivoBloqueoCelda(matriz, rol, modulo);
    },
    [matriz],
  );

  const ciclar = useCallback(
    (rol: RoleCode, modulo: string): void => {
      if (!matriz || motivoBloqueoCelda(matriz, rol, modulo) !== null) return;
      const actual = objetivos.get(claveCelda(rol, modulo)) ?? nivelServidor(matriz, rol, modulo);
      let siguiente = siguienteNivel(actual);
      for (let i = 0; i < 2 && nivelesEquivalentes(matriz, rol, modulo, siguiente, actual); i++) {
        siguiente = siguienteNivel(siguiente);
      }
      if (nivelesEquivalentes(matriz, rol, modulo, siguiente, actual)) return;
      const clave = claveCelda(rol, modulo);
      setObjetivos((anterior) => {
        const proximo = new Map(anterior);
        if (siguiente === nivelServidor(matriz, rol, modulo)) proximo.delete(clave);
        else proximo.set(clave, siguiente);
        return proximo;
      });
    },
    [matriz, objetivos],
  );

  const cambios = useMemo(() => {
    if (!matriz || objetivos.size === 0) return [];
    return [...objetivos].flatMap(([clave, nivel]) => {
      const { rol, modulo } = parseClave(clave);
      return cambiosParaNivel(matriz, rol, modulo, nivel);
    });
  }, [matriz, objetivos]);

  const descartar = useCallback(() => setObjetivos(new Map()), []);
  const limpiarTrasGuardar = useCallback(() => setObjetivos(new Map()), []);

  return { objetivos, cambios, nivelDe, bloqueoDe, ciclar, descartar, limpiarTrasGuardar };
}
