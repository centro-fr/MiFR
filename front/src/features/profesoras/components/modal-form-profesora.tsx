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
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CAMPO_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, FILA_DE_CAMPOS_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

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
        className={cn(CONTENIDO_MODAL, "w-[96vw] sm:w-full max-w-lg")}
      >
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            Dar de alta profesor/a
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Ingresá los datos de contacto y la cuenta Google para el acceso
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className={CUERPO_MODAL}>
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
          <div className={FILA_DE_CAMPOS_MODAL}>
            <div className={CAMPO_MODAL}>
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
            <div className={CAMPO_MODAL}>
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
          <div className={CAMPO_MODAL}>
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
          </div>

          {/* Teléfono y Fecha de Nacimiento */}
          <div className={FILA_DE_CAMPOS_MODAL}>
            <div className={CAMPO_MODAL}>
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
            <div className={CAMPO_MODAL}>
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
          <div className={CAMPO_MODAL}>
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
        <div className={PIE_MODAL}>
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
