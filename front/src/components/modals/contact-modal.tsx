import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle, X } from "lucide-react";
import { contactSchema, type ContactFormData } from "@/features/auth/schemas/contact";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INPUT_CLASSES =
  "min-h-[44px] w-full rounded-xl border-white/10 bg-white/5 px-3.5 py-2.5 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus-visible:ring-primary/40";

const LABEL_CLASSES = "mb-1 block text-sm font-semibold text-slate-300";

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ContactFormData>({ resolver: zodResolver(contactSchema), mode: "onBlur" });

  async function onSubmit(data: ContactFormData) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmittedEmail(data.email);
  }

  function handleClose() {
    setSubmittedEmail(null);
    form.reset();
    onClose();
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) handleClose();
      }}
    >
      <DialogContent
        hideClose
        className="max-h-[85vh] w-full max-w-lg gap-0 overflow-y-auto rounded-3xl border-white/15 bg-dark p-6 text-white shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white [&_svg]:size-5"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-dark text-sm font-black text-white shadow-md"
          >
            FR
          </span>
          <div>
            <DialogTitle className="text-lg font-bold tracking-tight text-white">
              Administración MiFR
            </DialogTitle>
            <p className="text-sm font-semibold text-primary">Solicitud de Alta de Socio o Staff</p>
          </div>
        </div>

        {submittedEmail ? (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
              <CheckCircle aria-hidden="true" className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-white">¡Solicitud Recibida!</h4>
            <p role="status" className="mx-auto max-w-sm text-sm text-slate-300">
              El equipo de administración de MiFR se comunicará a tu correo{" "}
              <strong className="break-all text-white">{submittedEmail}</strong> en menos de 24 horas para habilitar tu acceso.
            </p>
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark"
              >
                Cerrar y volver al portal
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogDescription className="mb-6 text-sm text-slate-300">
              Para ingresar a la plataforma, tu cuenta de Google debe estar vinculada a una membresía activa o registro
              de staff. Completá tus datos y te contactaremos:
            </DialogDescription>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mb-2 space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="contact-nombre" className={LABEL_CLASSES}>Nombre Completo *</FormLabel>
                      <FormControl>
                        <Input id="contact-nombre" placeholder="Ej. Martín Rodríguez" className={INPUT_CLASSES} {...field} />
                      </FormControl>
                      <FormMessage role="alert" className="text-sm text-rose-300" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="contact-email" className={LABEL_CLASSES}>Email de Google *</FormLabel>
                        <FormControl>
                          <Input id="contact-email" type="email" placeholder="tu.cuenta@gmail.com" className={INPUT_CLASSES} {...field} />
                        </FormControl>
                        <FormMessage role="alert" className="text-sm text-rose-300" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="contact-telefono" className={LABEL_CLASSES}>Teléfono / WhatsApp *</FormLabel>
                        <FormControl>
                          <Input id="contact-telefono" type="tel" placeholder="+54 9 11 ..." className={INPUT_CLASSES} {...field} />
                        </FormControl>
                        <FormMessage role="alert" className="text-sm text-rose-300" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="tipoAcceso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="contact-tipo" className={LABEL_CLASSES}>Tipo de Acceso Requerido *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger id="contact-tipo" className="min-h-[44px] w-full rounded-xl border-white/10 bg-[#1f2430] px-3.5 py-2.5 text-base text-white focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="socio">Alumno / Socio Nuevo</SelectItem>
                          <SelectItem value="profesor">Profesor / Entrenador</SelectItem>
                          <SelectItem value="staff">Personal Administrativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage role="alert" className="text-sm text-rose-300" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mensaje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="contact-mensaje" className={LABEL_CLASSES}>
                        Mensaje o Consulta <span className="font-normal text-slate-400">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="contact-mensaje"
                          placeholder="Contanos tu consulta o disponibilidad horaria..."
                          className="min-h-[80px] w-full resize-none rounded-xl border-white/10 bg-white/5 px-3.5 py-2.5 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus-visible:ring-primary/40"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage role="alert" className="text-sm text-rose-300" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="min-h-[44px] w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:bg-primary-dark disabled:opacity-70"
                >
                  {form.formState.isSubmitting ? "Enviando..." : "Enviar Solicitud de Habilitación"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
