import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectorEspecialidades } from "@/features/profesoras/components/selector-especialidades";
import {
  crearProfesoraSchema,
  formatearEspecialidades,
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
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<string[]>([]);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Fecha máxima permitida (al menos 18 años cumplidos)
  const hoy = new Date();
  const fechaMaximaMayorEdad = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate())
    .toISOString()
    .split("T")[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const especialidadFormateada = formatearEspecialidades(actividadesSeleccionadas);

    const res = crearProfesoraSchema.safeParse({
      nombre,
      apellido,
      email,
      telefono,
      fecha_nacimiento: fechaNacimiento,
      especialidad: especialidadFormateada || undefined,
    });

    if (!res.success) {
      setErrorValidacion(res.error.issues[0]?.message ?? "Datos inválidos");
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
        className="flex max-h-[90dvh] w-[96vw] sm:w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Dar de alta profesor/a
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Ingresá los datos de contacto y la cuenta Google para el acceso
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

          {/* Selector de Especialidades por Actividades */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Actividades especializadas
            </Label>
            <SelectorEspecialidades
              seleccionadas={actividadesSeleccionadas}
              onCambiar={setActividadesSeleccionadas}
              disabled={guardando}
            />
          </div>
        </div>

        {/* Footer del mismo color que el body */}
        <div className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={guardando}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
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
