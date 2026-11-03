import { useState, type FormEvent } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearProfesoraSchema,
  type CrearProfesoraInput,
} from "@/features/profesoras/schemas/profesora";

interface Props {
  guardando: boolean;
  errorGuardado: string | null;
  onClose: () => void;
  onSave: (datos: CrearProfesoraInput) => void;
}

export function ModalFormProfesora({
  guardando,
  errorGuardado,
  onClose,
  onSave,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Fecha máxima permitida (al menos 18 años cumplidos)
  const hoy = new Date();
  const fechaMaximaMayorEdad = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate())
    .toISOString()
    .split("T")[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const res = crearProfesoraSchema.safeParse({
      nombre,
      apellido,
      email,
      telefono,
      fecha_nacimiento: fechaNacimiento,
      especialidad: especialidad.trim() || undefined,
    });

    if (!res.success) {
      setErrorValidacion(res.error.errors[0]?.message ?? "Datos inválidos");
      return;
    }

    onSave(res.data);
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
              <UserPlus className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Dar de alta profesor/a
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ingresá los datos de contacto y la cuenta Google para el acceso
              </p>
            </div>
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

          {/* Nombre y Apellido */}
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
                disabled={guardando}
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
                disabled={guardando}
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Email de Google */}
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
              disabled={guardando}
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Es la cuenta con la que el/la profesor/a podrá iniciar sesión mediante Google Auth.
            </p>
          </div>

          {/* Teléfono y Fecha de Nacimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefono" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Teléfono de contacto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 11 2345-6789"
                disabled={guardando}
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_nacimiento" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Fecha de nacimiento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                max={fechaMaximaMayorEdad}
                min="1920-01-01"
                disabled={guardando}
                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs sm:text-sm"
              />
            </div>
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
              disabled={guardando}
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
              disabled={guardando}
              className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                "Guardar profesor/a"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
