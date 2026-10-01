import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NivelPill } from "@/features/seguridad/components/nivel-pill";
import { descripcionModulo, etiquetaModulo } from "@/features/seguridad/utils/etiquetas";
import type { NivelAcceso } from "@/features/seguridad/utils/niveles";
import { cn } from "@/utils/cn";
import type { RoleCode } from "@/types/auth";

interface MatrizTableProps {
  roles: { codigo: RoleCode; nombre: string }[];
  modulos: string[];
  nivelDe: (rol: RoleCode, modulo: string) => NivelAcceso;
  bloqueoDe: (rol: RoleCode, modulo: string) => string | null;
  onCiclar: (rol: RoleCode, modulo: string) => void;
}

const ROL_SUBTITULO: Record<RoleCode, string> = {
  PROPIETARIA: "Acceso total",
  PROFESORA: "Cuerpo docente",
  ALUMNO: "Alumno",
  TUTOR: "Tutor / Familia",
};

// Desktop: una fila por módulo, una celda tri-estado por rol (Stitch).
export function MatrizTable({ roles, modulos, nivelDe, bloqueoDe, onCiclar }: MatrizTableProps) {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  function alternarModulo(modulo: string): void {
    setColapsados((anterior) => {
      const siguiente = new Set(anterior);
      if (siguiente.has(modulo)) siguiente.delete(modulo);
      else siguiente.add(modulo);
      return siguiente;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th scope="col" className="min-w-[280px] px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Módulo
            </th>
            {roles.map((rol) => (
              <th key={rol.codigo} scope="col" className="border-l border-slate-200/70 px-4 py-3.5 text-center">
                <span className="block text-sm font-extrabold text-slate-900">{rol.nombre}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{ROL_SUBTITULO[rol.codigo]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modulos.map((modulo) => {
            const colapsado = colapsados.has(modulo);
            return (
              <tr key={modulo} className="border-t border-slate-200 first:border-t-0">
                <td className="px-5 py-2">
                  <button
                    type="button"
                    onClick={() => alternarModulo(modulo)}
                    aria-expanded={!colapsado}
                    className="flex min-h-[44px] w-full items-center gap-2 text-left"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", colapsado && "-rotate-90")}
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-slate-800">{etiquetaModulo(modulo)}</span>
                      {!colapsado && (
                        <span className="mt-0.5 block text-xs font-normal text-slate-400">{descripcionModulo(modulo)}</span>
                      )}
                    </span>
                  </button>
                </td>
                {roles.map((rol) => (
                  <td key={rol.codigo} className={cn("border-l border-slate-100 px-3 text-center", colapsado ? "py-1" : "py-3")}>
                    {!colapsado && (
                      <NivelPill
                        nivel={nivelDe(rol.codigo, modulo)}
                        bloqueado={bloqueoDe(rol.codigo, modulo)}
                        etiqueta={`${etiquetaModulo(modulo)} para ${rol.nombre}`}
                        onCiclar={() => onCiclar(rol.codigo, modulo)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
