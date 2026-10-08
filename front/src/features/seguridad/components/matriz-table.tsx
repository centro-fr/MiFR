import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { NivelPill } from "@/features/seguridad/components/nivel-pill";
import { descripcionModulo, etiquetaModulo } from "@/features/seguridad/utils/etiquetas";
import type { NivelAcceso } from "@/features/seguridad/utils/niveles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Card className="overflow-x-auto rounded-2xl border-slate-200 bg-white dark:border-white/10 dark:bg-surface-low">
      <Table className="w-full min-w-[720px] text-left">
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <TableHead scope="col" className="min-w-[280px] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Módulo
            </TableHead>
            {roles.map((rol) => {
              const bloqueada = rol.codigo === "PROPIETARIA";
              return (
                <TableHead
                  key={rol.codigo}
                  scope="col"
                  className={cn(
                    "border-l border-slate-200/70 px-4 py-3.5 text-center dark:border-white/10",
                    bloqueada && "bg-slate-100/70 dark:bg-white/[0.02]",
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                    {bloqueada && (
                      <Lock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                    {rol.nombre}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-400 dark:text-slate-500">
                    {bloqueada ? (
                      <span title="Columna bloqueada con acceso total">
                        {ROL_SUBTITULO[rol.codigo]} · No editable
                      </span>
                    ) : (
                      ROL_SUBTITULO[rol.codigo]
                    )}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modulos.map((modulo) => {
            const colapsado = colapsados.has(modulo);
            return (
              <TableRow key={modulo} className="border-t border-slate-200 first:border-t-0 dark:border-white/10">
                <TableCell className="px-5 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => alternarModulo(modulo)}
                    aria-expanded={!colapsado}
                    className="flex h-auto min-h-[44px] w-full items-center justify-start gap-2 rounded-lg px-0 text-left hover:bg-transparent"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", colapsado && "-rotate-90")}
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-slate-800 dark:text-slate-100">{etiquetaModulo(modulo)}</span>
                      {!colapsado && (
                        <span className="mt-0.5 block text-xs font-normal text-slate-400 dark:text-slate-500">{descripcionModulo(modulo)}</span>
                      )}
                    </span>
                  </Button>
                </TableCell>
                {roles.map((rol) => (
                  <TableCell
                    key={rol.codigo}
                    className={cn(
                      "border-l border-slate-100 px-3 text-center dark:border-white/10",
                      colapsado ? "py-1" : "py-3",
                      rol.codigo === "PROPIETARIA" && "bg-slate-50/60 dark:bg-white/[0.02]",
                    )}
                  >
                    {!colapsado && (
                      <NivelPill
                        nivel={nivelDe(rol.codigo, modulo)}
                        bloqueado={bloqueoDe(rol.codigo, modulo)}
                        etiqueta={`${etiquetaModulo(modulo)} para ${rol.nombre}`}
                        onCiclar={() => onCiclar(rol.codigo, modulo)}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
