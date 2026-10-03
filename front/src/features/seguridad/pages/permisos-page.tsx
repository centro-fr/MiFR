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
import { useMatrizEditor } from "@/features/seguridad/hooks/use-matriz-editor";

export function PermisosPage() {
  const matrizQuery = useMatriz();
  const actualizar = useActualizarMatriz();
  const editor = useMatrizEditor(matrizQuery.data);
  const [confirmaDescarte, setConfirmaDescarte] = useState(false);

  const efectiva = matrizQuery.data;

  function guardar(): void {
    if (!matrizQuery.data || editor.objetivos.size === 0 || actualizar.isPending) return;
    if (editor.cambios.length === 0) {
      editor.descartar();
      return;
    }
    actualizar.mutate(editor.cambios, {
      onSuccess: () => {
        editor.limpiarTrasGuardar();
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

  function pedirDescartar(): void {
    if (editor.objetivos.size === 0 || actualizar.isPending) return;
    setConfirmaDescarte(true);
  }

  function descartar(): void {
    editor.descartar();
    setConfirmaDescarte(false);
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
          <p className="max-w-[320px] text-sm leading-relaxed text-slate-600">
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
          <p className="max-w-[320px] text-sm text-slate-600">Todavía no hay módulos ni permisos para mostrar.</p>
        </div>
      </OwnerLayout>
    );
  }

  const roles = efectiva.roles.map(({ codigo, nombre }) => ({ codigo, nombre }));
  const modulos = efectiva.modulos.map((m) => m.modulo);

  return (
    <OwnerLayout>
      <MatrizToolbar
        cambiosPendientes={editor.objetivos.size}
        isSaving={actualizar.isPending}
        onGuardar={guardar}
        onDescartar={pedirDescartar}
        compactActions
      />
      <div className="hidden lg:block">
        <MatrizTable roles={roles} modulos={modulos} nivelDe={editor.nivelDe} bloqueoDe={editor.bloqueoDe} onCiclar={editor.ciclar} />
      </div>
      <div className="lg:hidden">
        <ModuloCards
          roles={roles}
          modulos={modulos}
          nivelDe={editor.nivelDe}
          bloqueoDe={editor.bloqueoDe}
          onCiclar={editor.ciclar}
          rolInicial="PROPIETARIA"
        />
      </div>
      {/* Barra de guardado fija en mobile (Stitch) */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 lg:hidden">
        <Button
          onClick={guardar}
          disabled={editor.objetivos.size === 0 || actualizar.isPending}
          className="w-full bg-primary text-white hover:bg-primary-dark"
        >
          {actualizar.isPending ? "Guardando..." : `Guardar${editor.objetivos.size > 0 ? ` (${editor.objetivos.size})` : ""}`}
        </Button>
      </div>

      {confirmaDescarte && (
        <div role="dialog" aria-modal="true" aria-labelledby="descartar-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="descartar-titulo" className="text-lg font-extrabold text-slate-900">
              Descartar cambios
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tenés {editor.objetivos.size} {editor.objetivos.size === 1 ? "cambio sin guardar" : "cambios sin guardar"}. Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setConfirmaDescarte(false)} className="flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                Seguir editando
              </Button>
              <Button onClick={descartar} className="flex-1 bg-rose-600 text-white hover:bg-rose-700">
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
