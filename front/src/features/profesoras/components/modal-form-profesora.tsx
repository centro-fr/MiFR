import { useState, type FormEvent } from "react";
import { Loader2, UserCheck, UserPlus, X } from "lucide-react";
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
  crearProfesoraDirectaSchema,
  crearProfesoraExistenteSchema,
  type CrearProfesoraInput,
} from "@/features/profesoras/schemas/profesora";
import { cn } from "@/utils/cn";

interface Props {
  candidatos: UsuarioCandidato[];
  cargandoCandidatos: boolean;
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: CrearProfesoraInput) => void;
}

export function ModalFormProfesora({
  candidatos,
  cargandoCandidatos,
  guardando,
  errorGuardado,
  onClose,
  onSave,
}: Props) {
  const [modo, setModo] = useState<"NUEVA" | "EXISTENTE">("NUEVA");

  // Campos para nueva persona
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");

  // Campos para persona existente
  const [idUsuario, setIdUsuario] = useState<string>("");

  // Campo común
  const [especialidad, setEspecialidad] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (modo === "NUEVA") {
      const res = crearProfesoraDirectaSchema.safeParse({
        nombre,
        apellido,
        email,
        especialidad: especialidad.trim() || undefined,
      });

      if (!res.success) {
        setErrorValidacion(res.error.errors[0]?.message ?? "Datos inválidos");
        return;
      }

      onSave({
        modo: "NUEVA",
        ...res.data,
      });
    } else {
      const parseId = Number(idUsuario);
      const res = crearProfesoraExistenteSchema.safeParse({
        id_usuario: isNaN(parseId) ? undefined : parseId,
        especialidad: especialidad.trim() || undefined,
      });

      if (!res.success) {
        setErrorValidacion(res.error.errors[0]?.message ?? "Datos inválidos");
        return;
      }

      onSave({
        modo: "EXISTENTE",
        ...res.data,
      });
    }
  };

  const hayCandidatos = candidatos.length > 0;

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
              {modo === "NUEVA" ? <UserPlus className="size-5" /> : <UserCheck className="size-5" />}
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

        {/* Pestañas de selector de modo si hay candidatos existentes */}
        {hayCandidatos && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-2">
            <button
              type="button"
              onClick={() => {
                setModo("NUEVA");
                setErrorValidacion(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                modo === "NUEVA"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              Nueva persona
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("EXISTENTE");
                setErrorValidacion(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                modo === "EXISTENTE"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              <span>Vincular existente</span>
              <span className="rounded-full bg-primary/15 text-primary dark:bg-primary/25 px-1.5 py-0.2 text-[10px] font-black">
                {candidatos.length}
              </span>
            </button>
          </div>
        )}

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

          {modo === "NUEVA" ? (
            <>
              {/* Formulario de Alta Directa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Laura"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: García"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Correo electrónico (Google) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Es la cuenta con la que la profesora podrá iniciar sesión mediante Google Auth.
                </p>
              </div>
            </>
          ) : (
            /* Selector de Usuario Existente */
            <div className="space-y-1.5">
              <Label htmlFor="id_usuario" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Seleccionar cuenta registrada <span className="text-destructive">*</span>
              </Label>

              {cargandoCandidatos ? (
                <div className="flex items-center gap-2 h-11 px-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Cargando usuarios...
                </div>
              ) : (
                <Select value={idUsuario} onValueChange={(val) => setIdUsuario(val)}>
                  <SelectTrigger
                    id="id_usuario"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-xs sm:text-sm"
                  >
                    <SelectValue placeholder="Elegir usuaria..." />
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
            </div>
          )}

          {/* Especialidad (común a ambos modos) */}
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
              disabled={guardando || (modo === "EXISTENTE" && !idUsuario)}
              className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Guardando...
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
