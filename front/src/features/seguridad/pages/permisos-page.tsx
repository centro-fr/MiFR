import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { MatrizTable } from "@/features/seguridad/components/matriz-table";
import { MatrizSkeleton } from "@/features/seguridad/components/matriz-skeleton";
import { MatrizToolbar } from "@/features/seguridad/components/matriz-toolbar";
import { ModuloCards } from "@/features/seguridad/components/modulo-cards";
import { useActualizarMatriz, useMatriz } from "@/features/seguridad/hooks/use-matriz";
import {
  cambiosParaNivel,
  derivarNivel,
  motivoBloqueoCelda,
  nivelesEquivalentes,
  siguienteNivel,
  type NivelAcceso,
} from "@/features/seguridad/utils/niveles";
import type { MatrizPermisos } from "@/types/permissions";
import type { RoleCode } from "@/types/auth";

function claveCelda(rol: RoleCode, modulo: string): string {
  return `${rol}:${modulo}`;
}

function codigosDe(matriz: MatrizPermisos, modulo: string): string[] {
  return matriz.modulos.find((m) => m.modulo === modulo)?.permisos.map((p) => p.codigo) ?? [];
}

function nivelServidor(matriz: MatrizPermisos, rol: RoleCode, modulo: string): NivelAcceso {
  return derivarNivel(codigosDe(matriz, modulo), new Set(matriz.matriz[rol]));
}

export function PermisosPage() {
  const matrizQuery = useMatriz();
  const actualizar = useActualizarMatriz();
  // Nivel objetivo por celda tocada. La vista muestra el objetivo si existe,
  // si no el derivado del servidor. Al guardar se traducen a cambios atómicos.
  const [objetivos, setObjetivos] = useState<Map<string, NivelAcceso>>(new Map());

  const efectiva = matrizQuery.data;

  function nivelDe(rol: RoleCode, modulo: string): NivelAcceso {
    const objetivo = objetivos.get(claveCelda(rol, modulo));
    if (objetivo !== undefined) return objetivo;
    if (!matrizQuery.data) return 2;
    return nivelServidor(matrizQuery.data, rol, modulo);
  }

  function bloqueoDe(rol: RoleCode, modulo: string): string | null {
    if (!matrizQuery.data) return null;
    return motivoBloqueoCelda(matrizQuery.data, rol, modulo);
  }

  function ciclar(rol: RoleCode, modulo: string): void {
    if (!matrizQuery.data || bloqueoDe(rol, modulo) !== null) return;
    const servidor = matrizQuery.data;
    const actual = nivelDe(rol, modulo);
    let siguiente = siguienteNivel(actual);
    // Salta niveles indistinguibles del actual (ej. módulo de un permiso).
    for (let i = 0; i < 2 && nivelesEquivalentes(servidor, rol, modulo, siguiente, actual); i++) {
      siguiente = siguienteNivel(siguiente);
    }
    if (nivelesEquivalentes(servidor, rol, modulo, siguiente, actual)) return;
    const clave = claveCelda(rol, modulo);
    setObjetivos((anterior) => {
      const proximo = new Map(anterior);
      // Si vuelve al valor del servidor, deja de ser un cambio pendiente.
      if (siguiente === nivelServidor(servidor, rol, modulo)) proximo.delete(clave);
      else proximo.set(clave, siguiente);
      return proximo;
    });
  }

  function guardar(): void {
    if (!matrizQuery.data || objetivos.size === 0 || actualizar.isPending) return;
    const servidor = matrizQuery.data;
    const cambios = [...objetivos].flatMap(([clave, nivel]) => {
      const separador = clave.indexOf(":");
      const rol = clave.slice(0, separador) as RoleCode;
      const modulo = clave.slice(separador + 1);
      return cambiosParaNivel(servidor, rol, modulo, nivel);
    });
    if (cambios.length === 0) {
      setObjetivos(new Map());
      return;
    }
    actualizar.mutate(cambios, {
      onSuccess: () => {
        setObjetivos(new Map());
        toast.success("Matriz de permisos actualizada");
      },
      onError: (codigo) => {
        if (codigo === "PERMISO_BLOQUEADO") {
          toast.error("Hay cambios bloqueados: revisá los permisos con candado");
        } else {
          toast.error("No se pudo guardar. Revisá tu conexión e intentá de nuevo");
        }
      },
    });
  }

  function descartar(): void {
    setObjetivos(new Map());
  }

  if (matrizQuery.isPending) {
    return (
      <OwnerLayout>
        <MatrizSkeleton />
      </OwnerLayout>
    );
  }

  if (matrizQuery.isError || !efectiva) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-8 w-8" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">No pudimos cargar la matriz</h1>
          <p className="max-w-[320px] text-sm leading-relaxed text-slate-500">
            {matrizQuery.error === "SIN_PERMISO"
              ? "Tu sesión no tiene permiso para ver esta sección."
              : "Verificá tu conexión e intentá de nuevo."}
          </p>
          <Button onClick={() => void matrizQuery.refetch()} className="bg-primary text-white hover:bg-primary-dark">
            Reintentar
          </Button>
        </div>
      </OwnerLayout>
    );
  }

  if (efectiva.modulos.length === 0) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sin permisos cargados</h1>
          <p className="max-w-[320px] text-sm text-slate-500">Todavía no hay módulos ni permisos para mostrar.</p>
        </div>
      </OwnerLayout>
    );
  }

  const roles = efectiva.roles.map(({ codigo, nombre }) => ({ codigo, nombre }));
  const modulos = efectiva.modulos.map((m) => m.modulo);

  return (
    <OwnerLayout>
      <MatrizToolbar
        cambiosPendientes={objetivos.size}
        isSaving={actualizar.isPending}
        onGuardar={guardar}
        onDescartar={descartar}
      />
      <div className="hidden lg:block">
        <MatrizTable roles={roles} modulos={modulos} nivelDe={nivelDe} bloqueoDe={bloqueoDe} onCiclar={ciclar} />
      </div>
      <div className="lg:hidden">
        <ModuloCards roles={roles} modulos={modulos} nivelDe={nivelDe} bloqueoDe={bloqueoDe} onCiclar={ciclar} />
      </div>
      {/* Barra de guardado fija en mobile (Stitch) */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 lg:hidden">
        <Button
          onClick={guardar}
          disabled={objetivos.size === 0 || actualizar.isPending}
          className="w-full bg-primary text-white hover:bg-primary-dark"
        >
          {actualizar.isPending ? "Guardando..." : `Guardar${objetivos.size > 0 ? ` (${objetivos.size})` : ""}`}
        </Button>
      </div>
    </OwnerLayout>
  );
}
