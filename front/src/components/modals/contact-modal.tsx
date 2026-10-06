import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle, X } from "lucide-react";
import { contactSchema, useEscapeToClose, type ContactFormData } from "@/features/auth/schemas/contact";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INPUT_CLASSES =
  "min-h-[44px] w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-base text-white transition-colors focus:border-primary";

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  useEscapeToClose(onClose, isOpen);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({ resolver: zodResolver(contactSchema), mode: "onBlur" });

  if (!isOpen) return null;

  function onSubmit(data: ContactFormData) {
    setSubmittedEmail(data.email);
  }

  function handleClose() {
    setSubmittedEmail(null);
    reset();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-dark p-6 text-white shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-dark text-sm font-black text-white shadow-md"
          >
            FR
          </span>
          <div>
            <h3 id="contact-title" className="text-lg font-bold tracking-tight text-white">
              Administración MiFR
            </h3>
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
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark"
              >
                Cerrar y volver al portal
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-300">
              Para ingresar a la plataforma, tu cuenta de Google debe estar vinculada a una membresía activa o registro
              de staff. Completá tus datos y te contactaremos:
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mb-2 space-y-4" noValidate>
              <div>
                <label htmlFor="contact-nombre" className="mb-1 block text-sm font-semibold text-slate-300">
                  Nombre Completo *
                </label>
                <input id="contact-nombre" type="text" placeholder="Ej. Martín Rodríguez" className={INPUT_CLASSES} {...register("nombre")} />
                {errors.nombre && <FieldError message={errors.nombre.message} />}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-sm font-semibold text-slate-300">
                    Email de Google *
                  </label>
                  <input id="contact-email" type="email" placeholder="tu.cuenta@gmail.com" className={INPUT_CLASSES} {...register("email")} />
                  {errors.email && <FieldError message={errors.email.message} />}
                </div>
                <div>
                  <label htmlFor="contact-telefono" className="mb-1 block text-sm font-semibold text-slate-300">
                    Teléfono / WhatsApp *
                  </label>
                  <input id="contact-telefono" type="tel" placeholder="+54 9 11 ..." className={INPUT_CLASSES} {...register("telefono")} />
                  {errors.telefono && <FieldError message={errors.telefono.message} />}
                </div>
              </div>
              <div>
                <label htmlFor="contact-tipo" className="mb-1 block text-sm font-semibold text-slate-300">
                  Tipo de Acceso Requerido *
                </label>
                <select id="contact-tipo" className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#1f2430] px-3.5 py-2.5 text-base text-white focus:border-primary" {...register("tipoAcceso")}>
                  <option value="socio">Alumno / Socio Nuevo</option>
                  <option value="profesor">Profesor / Entrenador</option>
                  <option value="staff">Personal Administrativo</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:bg-primary-dark disabled:opacity-70"
              >
                {isSubmitting ? "Enviando..." : "Enviar Solicitud de Habilitación"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-rose-300">
      {message}
    </p>
  );
}
