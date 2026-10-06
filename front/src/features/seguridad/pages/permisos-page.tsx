import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { PendingChangesDock } from "@/components/ui/pending-changes-dock";
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

  function descartar(): void {
    if (editor.objetivos.size === 0 || actualizar.isPending) return;
    editor.descartar();
    toast.info("Cambios descartados: se restauró la matriz oficial.");
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">No pudimos cargar la matriz</h1>
          <p className="max-w-[320px] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sin permisos cargados</h1>
          <p className="max-w-[320px] text-sm text-slate-600 dark:text-slate-400">Todavía no hay módulos ni permisos para mostrar.</p>
        </div>
      </OwnerLayout>
    );
  }

  const roles = efectiva.roles.map(({ codigo, nombre }) => ({ codigo, nombre }));
  const modulos = efectiva.modulos.map((m) => m.modulo);
  const cambiosPendientes = editor.objetivos.size;

  return (
    <OwnerLayout>
      <MatrizToolbar />
      <div className={cambiosPendientes > 0 ? "pb-24" : ""}>
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
      </div>

      {/* DOCK FLOTANTE DE CAMBIOS PENDIENTES (único punto de confirmación) */}
      {cambiosPendientes > 0 && (
        <PendingChangesDock
          cantidad={cambiosPendientes}
          guardando={actualizar.isPending}
          onGuardar={guardar}
          onDescartar={descartar}
        />
      )}
    </OwnerLayout>
  );
}
