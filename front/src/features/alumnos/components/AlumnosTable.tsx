import { Phone, Mail, CheckCircle2, ShieldAlert, Dumbbell } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calcularEdad } from "../utils/edad";
import type { Alumno } from "@/types/alumno";

interface AlumnosTableProps {
  alumnos: Alumno[];
}

export function AlumnosTable({ alumnos }: AlumnosTableProps) {
  return (
    <div className="w-full space-y-4">
      {/* VISTA MOBILE: Tarjetas táctiles y optimizadas para smartphones (< md) */}
      <div className="block md:hidden space-y-3">
        {alumnos.map((a) => {
          const edad = calcularEdad(a.usuario.fecha_nacimiento);
          const esMenor = edad !== null && edad < 18;

          return (
            <Card
              key={a.id_alumno}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs transition-shadow hover:shadow-xs"
            >
              <CardContent className="p-0 space-y-3">
                {/* Cabecera: Iniciales, Nombre, DNI, Menor y Estado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                      {a.usuario.nombre.charAt(0)}
                      {a.usuario.apellido.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-foreground truncate">
                        {a.usuario.nombre} {a.usuario.apellido}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          DNI: {a.usuario.dni || "—"}
                        </span>
                        {esMenor && (
                          <Badge
                            variant="outline"
                            className="text-[11px] py-0 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-semibold"
                          >
                            Menor ({edad} años)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {a.estado === "ACTIVO" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-0.5 px-2">
                        Activo
                      </Badge>
                    ) : a.estado === "INACTIVO" ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium text-xs py-0.5 px-2"
                      >
                        Pre-inscripto
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-medium text-xs py-0.5 px-2">
                        Baja
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sección de Contacto con links rápidos (tel: y mailto:) */}
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-xs space-y-2 border border-border/40">
                  {esMenor ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <ShieldAlert className="size-3.5 shrink-0" />
                        <span>
                          Tutor: {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellido}` : "A cargo"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {a.responsable?.telefono && (
                          <a
                            href={`tel:${a.responsable.telefono}`}
                            className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors"
                          >
                            <Phone className="size-3.5 text-primary shrink-0" />
                            <span>{a.responsable.telefono}</span>
                          </a>
                        )}
                        {a.responsable?.email && (
                          <a
                            href={`mailto:${a.responsable.email}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate"
                          >
                            <Mail className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{a.responsable.email}</span>
                          </a>
                        )}
                        {!a.responsable?.telefono && !a.responsable?.email && (
                          <span className="text-muted-foreground italic">Sin contacto de tutor</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {a.usuario.telefono ? (
                        <a
                          href={`tel:${a.usuario.telefono}`}
                          className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors"
                        >
                          <Phone className="size-3.5 text-primary shrink-0" />
                          <span>{a.usuario.telefono}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Sin teléfono</span>
                      )}
                      {a.usuario.email ? (
                        <a
                          href={`mailto:${a.usuario.email}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate"
                        >
                          <Mail className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{a.usuario.email}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Sin email registrado</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Plan Asignado y Estado de Cuota */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Dumbbell className="size-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">
                      {a.plan?.nombre || "Sin plan"}
                    </span>
                    {a.plan?.tipo && (
                      <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">
                        ({a.plan.tipo.replace("_", " ")})
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    {a.estado === "ACTIVO" ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 gap-1 py-0.5 px-2"
                      >
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                        Al día
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        Sin cuota
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* VISTA DESKTOP: Tabla completa clásica (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-border/60">
              <TableHead className="font-semibold text-sm py-3.5 px-4 text-foreground">
                Alumno/a
              </TableHead>
              <TableHead className="font-semibold text-sm py-3.5 px-4 text-foreground">
                Contacto
              </TableHead>
              <TableHead className="font-semibold text-sm py-3.5 px-4 text-foreground">
                Plan Asignado
              </TableHead>
              <TableHead className="font-semibold text-sm py-3.5 px-4 text-foreground">
                Estado de Cuota
              </TableHead>
              <TableHead className="font-semibold text-sm py-3.5 px-4 text-foreground">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.map((a) => {
              const edad = calcularEdad(a.usuario.fecha_nacimiento);
              const esMenor = edad !== null && edad < 18;

              return (
                <TableRow
                  key={a.id_alumno}
                  className="border-border/40 hover:bg-muted/30 transition-colors"
                >
                  {/* 1. Alumno/a (Nombre, Apellido, DNI, indicador Menor) */}
                  <TableCell className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                        {a.usuario.nombre.charAt(0)}
                        {a.usuario.apellido.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-base text-foreground flex items-center gap-2">
                          {a.usuario.nombre} {a.usuario.apellido}
                          {esMenor && (
                            <Badge
                              variant="outline"
                              className="text-xs py-0.5 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5 font-medium"
                            >
                              Menor ({edad} años)
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block font-mono">
                          DNI: {a.usuario.dni || "—"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 2. Contacto (si es menor: teléfono y email del tutor legal) */}
                  <TableCell className="py-4 px-4 text-sm">
                    {esMenor ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <ShieldAlert className="size-3 shrink-0" />
                          <span>
                            Tutor: {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellido}` : "A cargo"}
                          </span>
                        </div>

                        {a.responsable?.telefono && (
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <Phone className="size-3.5 text-primary shrink-0" />
                            <span>{a.responsable.telefono}</span>
                          </div>
                        )}

                        {a.responsable?.email && (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Mail className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[220px]">{a.responsable.email}</span>
                          </div>
                        )}

                        {!a.responsable?.telefono && !a.responsable?.email && (
                          <span className="text-xs text-muted-foreground italic block">
                            Sin contacto de tutor
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {a.usuario.telefono ? (
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <Phone className="size-3.5 text-primary shrink-0" />
                            <span>{a.usuario.telefono}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic block">
                            Sin teléfono
                          </span>
                        )}

                        {a.usuario.email ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Mail className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[220px]">{a.usuario.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic block">
                            Sin email propio
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* 3. Plan asignado */}
                  <TableCell className="py-4 px-4 text-sm">
                    {a.plan?.nombre ? (
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block text-sm">
                          {a.plan.nombre}
                        </span>
                        {a.plan.tipo && (
                          <span className="text-xs text-muted-foreground capitalize block">
                            {a.plan.tipo.toLowerCase().replace("_", " ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>

                  {/* 4. Estado de Cuota (según US-10 y US-18) */}
                  <TableCell className="py-4 px-4 text-sm">
                    {a.estado === "ACTIVO" ? (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 gap-1.5 py-1 px-2.5"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Al día
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Sin cuota (Pre-inscripto)
                      </span>
                    )}
                  </TableCell>

                  {/* 5. Estado general del alumno */}
                  <TableCell className="py-4 px-4">
                    {a.estado === "ACTIVO" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-1 px-2.5">
                        Activo
                      </Badge>
                    ) : a.estado === "INACTIVO" ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium text-xs py-1 px-2.5"
                      >
                        Pre-inscripto
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-medium text-xs py-1 px-2.5">
                        Baja
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
