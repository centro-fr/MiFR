import { useState, type FormEvent } from "react";
import { Loader2, UserCheck, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UsuarioCandidato } from "@/features/profesoras/api/profesoras-api";
import {
  crearProfesoraFormSchema,
  type CrearProfesoraFormData,
} from "@/features/profesoras/schemas/profesora";

interface Props {
  candidatos: UsuarioCandidato[];
  cargandoCandidatos: boolean;
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: CrearProfesoraFormData) => void;
}

export function ModalFormProfesora({
  candidatos,
  cargandoCandidatos,
  guardando,
  errorGuardado,
  onClose,
  onSave,
}: Props) {
  const [idUsuario, setIdUsuario] = useState<string>("");
  const [especialidad, setEspecialidad] = useState<string>("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const parseId = Number(idUsuario);
    const resultado = crearProfesoraFormSchema.safeParse({
      id_usuario: isNaN(parseId) ? undefined : parseId,
      especialidad: especialidad.trim() || undefined,
    });

    if (!resultado.success) {
      setErrorValidacion(resultado.error.errors[0]?.message ?? "Datos inválidos");
      return;
    }

    onSave(resultado.data);
  };

  return (
    <Dialog
      open
      onOpenChange={(abrir) => {
        if (!abrir) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="w-[96vw] sm:w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-3 text-left">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20"
            >
              <UserCheck className="size-5" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Dar de alta profesora
            </DialogTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          {errorGuardado && (
            <Alert className="rounded-xl border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertDescription className="text-xs font-semibold">{errorGuardado}</AlertDescription>
            </Alert>
          )}

          {errorValidacion && (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertDescription className="text-xs font-semibold">{errorValidacion}</AlertDescription>
            </Alert>
          )}

          {/* Selección de Usuario */}
          <div className="space-y-1.5">
            <Label htmlFor="id_usuario" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Cuenta de usuario <span className="text-destructive">*</span>
            </Label>

            {cargandoCandidatos ? (
              <div className="flex items-center gap-2 h-11 px-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Loader2 className="size-4 animate-spin text-primary" />
                Cargando usuarios aptos...
              </div>
            ) : candidatos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                No hay usuarios activos con rol <strong>PROFESORA</strong> disponibles sin perfil creado.
              </div>
            ) : (
              <Select value={idUsuario} onValueChange={(val) => setIdUsuario(val)}>
                <SelectTrigger
                  id="id_usuario"
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-xs sm:text-sm"
                >
                  <SelectValue placeholder="Seleccionar usuaria..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((c) => (
                    <SelectItem key={c.idUsuario} value={String(c.idUsuario)}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.nombre} {c.apellido}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-[11px] text-muted-foreground">
              Solo se muestran personas con rol <strong>PROFESORA</strong> en el sistema.
            </p>
          </div>

          {/* Especialidad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="especialidad" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Especialidad o disciplina principal
              </Label>
              <span className="text-[11px] font-semibold text-slate-400">
                {especialidad.length}/80
              </span>
            </div>
            <Input
              id="especialidad"
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value.slice(0, 80))}
              placeholder="Ej: Pilates Reformer, Funcional, Musculación..."
              maxLength={80}
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={guardando}
              className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || !idUsuario || candidatos.length === 0}
              className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creando perfil...
                </>
              ) : (
                "Guardar profesora"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
