import { useState, type FormEvent } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USUARIOS_SEMILLA, type UsuarioSemilla } from "@/mocks/data/semilla";
import type { AuthErrorCode, RoleCode } from "@/types/auth";

interface Props {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onSelect: (email: string) => void;
}

const ORDEN_ROL: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];

const NOMBRE_ROL: Record<RoleCode, string> = {
  PROPIETARIA: "Propietaria",
  PROFESORA: "Profesora",
  ALUMNO: "Alumno",
  TUTOR: "Tutor",
};

function etiquetaDePerfil({ roles }: UsuarioSemilla): string {
  return roles.map((rol) => NOMBRE_ROL[rol]).join(" + ");
}

function rangoDePerfil({ roles }: UsuarioSemilla): number {
  return Math.min(...roles.map((rol) => ORDEN_ROL.indexOf(rol)));
}

// Un usuario representante por combinación de roles: lo que cambia el menú y los permisos es
// el perfil, no la persona.
function perfilesDeLaSemilla(): UsuarioSemilla[] {
  const porRoles = new Map<string, UsuarioSemilla>();
  for (const usuario of USUARIOS_SEMILLA) {
    const clave = [...usuario.roles].sort().join("+");
    if (!porRoles.has(clave)) porRoles.set(clave, usuario);
  }
  return [...porRoles.values()].sort((a, b) => rangoDePerfil(a) - rangoDePerfil(b));
}

const PERFILES = perfilesDeLaSemilla();

// Pantalla de login solo para mocks: elegir un perfil permite ver el menú y los permisos de cada
// rol sin Google. Se carga de forma diferida para que no viaje en el build real.
export default function LoginMocksPanel({ errorCode, isLoading, onSelect }: Props) {
  const [idPerfil, setIdPerfil] = useState(PERFILES[0].id_usuario);
  const perfil = PERFILES.find((candidato) => candidato.id_usuario === idPerfil) ?? PERFILES[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSelect(perfil.email);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8">
      <Card
        aria-labelledby="login-mocks-titulo"
        className="w-full max-w-sm gap-4 rounded-2xl border-2 border-dashed border-amber-300 p-6 shadow-sm dark:border-amber-500/40"
      >
        <CardHeader className="flex items-center gap-2 p-0 text-amber-700 dark:text-amber-300">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          <CardTitle id="login-mocks-titulo" className="text-base font-extrabold">
            Entrar como… (datos de prueba)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-mocks-rol">Rol</Label>
              <select
                id="login-mocks-rol"
                value={idPerfil}
                onChange={(e) => setIdPerfil(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {PERFILES.map((opcion) => (
                  <option key={opcion.id_usuario} value={opcion.id_usuario}>
                    {etiquetaDePerfil(opcion)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-mocks-usuario">Usuario</Label>
              <Input
                id="login-mocks-usuario"
                readOnly
                disabled
                value={`${perfil.nombre} ${perfil.apellido}`}
                className="h-11 rounded-xl"
              />
            </div>

            {errorCode && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              >
                No se pudo iniciar sesión con ese perfil.
              </p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full rounded-xl text-sm font-extrabold">
              {isLoading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
