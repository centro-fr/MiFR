import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LockKeyhole, LogOut } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { AvatarFicha, FilaDato, TarjetaDeDatos, TarjetaResumen } from "@/components/ficha/piezas-ficha";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { AvatarIniciales, DatosEnFilas } from "@/components/movil/piezas";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { MisInsignias } from "@/features/portal-alumno/components/mis-insignias";
import { useAlumnoElegido } from "@/features/portal-alumno/hooks/use-alumno-elegido";
import { usePanelAlumno } from "@/features/portal-alumno/hooks/use-panel-alumno";
import { listarProfesoras } from "@/features/profesoras/api/profesoras-api";
import { useIsMobile } from "@/hooks/use-mobile";
import { homePathForRoles, type AuthUser } from "@/types/auth";
import { inicialesDeNombre } from "@/utils/texto";

// Perfil de la profesora y del alumno: sus datos, solo de lectura porque los carga la propietaria, y las
// insignias del alumno. En el
// celular, con el diseño mobile y el cierre de sesión; en escritorio, con el formato de las fichas (el
// cierre de sesión y el tema están en el sidebar y en la barra superior).

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function mesYAnio(fecha: string): string {
  const [anio, mes] = fecha.slice(0, 7).split("-").map(Number);
  return `${MESES[mes - 1]} de ${anio}`;
}

/** Lo que se muestra del perfil, igual en el celular y en escritorio. */
interface DatosDelPerfil {
  rol: string;
  telefono?: string | null;
  email: string | null;
  /** Tarjetas de resumen en escritorio y filas en el celular. */
  resumen: { etiqueta: string; valor: string; detalle?: string }[];
}

type Consulta = { isPending: boolean; isError: boolean; isFetching: boolean; error: unknown; refetch: () => unknown };

function useDatosDeLaProfesora(user: AuthUser): { datos: DatosDelPerfil; consulta: Consulta } {
  // Clave propia: ["profesoras"] la usa también horarios-api con otra forma de datos.
  const consulta = useQuery({ queryKey: ["perfil", "profesora"], queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  const propia = consulta.data?.find((profesora) => profesora.idUsuario === user.id_usuario);
  return {
    consulta,
    datos: {
      rol: "Profesor/a",
      telefono: propia?.telefono ?? null,
      email: user.email,
      resumen: [
        { etiqueta: "Especialidad", valor: propia?.especialidad ?? "Sin cargar" },
        ...(propia ? [{ etiqueta: "Desde", valor: mesYAnio(propia.fechaAlta), detalle: `Alta el ${formatearFecha(propia.fechaAlta)}` }] : []),
      ],
    },
  };
}

function useDatosDelAlumno(user: AuthUser): { datos: DatosDelPerfil; consulta: Consulta } {
  const consulta = usePanelAlumno();
  const { elegido } = useAlumnoElegido();
  const planes = consulta.data?.planes ?? [];
  // El tutor ve los planes del menor que eligió en la barra superior.
  const deQuien = elegido && !elegido.propio ? ` de ${elegido.nombre}` : "";
  return {
    consulta,
    datos: {
      rol: deQuien ? "Tutor/a" : "Alumno/a",
      email: user.email,
      resumen:
        planes.length > 0
          ? planes.flatMap((plan, indice) => {
              const sufijo = planes.length > 1 ? ` (${indice + 1})` : "";
              return [
                { etiqueta: `Plan${deQuien}${sufijo}`, valor: plan.nombre },
                { etiqueta: `Profesor/a${sufijo}`, valor: plan.profesora },
              ];
            })
          : [{ etiqueta: `Plan${deQuien}`, valor: "Sin plan vigente" }],
    },
  };
}

function AvisoEmail() {
  return (
    <span className="block text-xs font-normal text-muted-foreground">
      <LockKeyhole aria-hidden="true" className="mr-1 inline size-3 align-[-1px]" />
      Solo lo cambia la propietaria
    </span>
  );
}

interface PropsVista {
  nombre: string;
  datos: DatosDelPerfil;
  /** Carga o error de los datos; null con los datos listos. */
  contenido: ReactNode;
  /** Lo propio de cada rol debajo de los datos (las insignias del alumno). */
  extra?: ReactNode;
}

/** La propietaria que también dicta vuelve a su panel (en el celular no tiene el switch del sidebar). */
function IrAlPanelDePropietaria() {
  const navigate = useNavigate();
  const { elegirPanel } = usePanelActivo();
  return (
    <button
      type="button"
      onClick={() => {
        elegirPanel("PROPIETARIA");
        navigate(homePathForRoles(["PROPIETARIA"]));
      }}
      className="flex h-11 items-center gap-3 rounded-xl border border-slate-400 bg-card px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5"
    >
      <LayoutDashboard aria-hidden="true" className="size-5 text-slate-600 dark:text-slate-300" />
      Ir a la vista de propietaria
    </button>
  );
}

function PerfilMovil({ nombre, datos, contenido, extra }: PropsVista) {
  const { logout } = useAuth();
  const { tieneLosDosPaneles } = usePanelActivo();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarIniciales nombre={nombre} tamano="grande" />
        <h1 className="text-[22px] leading-7 font-extrabold tracking-tight">{nombre}</h1>
      </div>
      {contenido ?? (
        <DatosEnFilas
          filas={[
            ...(datos.telefono !== undefined ? [{ etiqueta: "Teléfono", valor: datos.telefono ?? "Sin cargar" }] : []),
            {
              etiqueta: "Email",
              valor: (
                <>
                  <span className="font-semibold">{datos.email ?? "Sin cargar"}</span>
                  <AvisoEmail />
                </>
              ),
            },
            ...datos.resumen.map(({ etiqueta, valor }) => ({ etiqueta, valor })),
          ]}
        />
      )}
      {extra}
      {tieneLosDosPaneles && <IrAlPanelDePropietaria />}
      <button
        type="button"
        onClick={() => void logout()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión
      </button>
    </div>
  );
}

function PerfilEscritorio({ nombre, datos, contenido, extra }: PropsVista) {
  return (
    <div className="@container min-w-0 space-y-6">
      <header className="flex min-w-0 items-center gap-4">
        <AvatarFicha iniciales={inicialesDeNombre(nombre)} activo />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 @xl:text-3xl dark:text-white">{nombre}</h1>
          <p className="text-sm text-muted-foreground">{datos.rol}</p>
        </div>
      </header>
      {contenido ?? (
        <>
          <section aria-label="Resumen" className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
            {datos.resumen.map((tarjeta) => (
              <TarjetaResumen key={tarjeta.etiqueta} etiqueta={tarjeta.etiqueta} valor={tarjeta.valor} detalle={tarjeta.detalle} />
            ))}
          </section>
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
            <TarjetaDeDatos titulo="Contacto">
              {datos.telefono !== undefined && <FilaDato etiqueta="Teléfono" valor={datos.telefono ?? "Sin teléfono"} />}
              <FilaDato etiqueta="Email" valor={datos.email ?? "Sin email"} />
              <AvisoEmail />
            </TarjetaDeDatos>
          </div>
        </>
      )}
      {extra}
    </div>
  );
}

function Perfil({ user, datos, consulta, extra }: { user: AuthUser; datos: DatosDelPerfil; consulta: Consulta; extra?: ReactNode }) {
  const esMobile = useIsMobile();
  const nombre = `${user.nombre} ${user.apellido}`;
  const contenido = consulta.isPending ? (
    <Skeleton aria-label="Cargando tus datos" className="h-40 rounded-xl" />
  ) : consulta.isError ? (
    <EstadoErrorCarga
      mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar tus datos.")}
      reintentando={consulta.isFetching}
      onReintentar={() => void consulta.refetch()}
    />
  ) : null;
  return esMobile ? (
    <PerfilMovil nombre={nombre} datos={datos} contenido={contenido} extra={extra} />
  ) : (
    <PerfilEscritorio nombre={nombre} datos={datos} contenido={contenido} extra={extra} />
  );
}

function PerfilDeLaProfesora({ user }: { user: AuthUser }) {
  const { datos, consulta } = useDatosDeLaProfesora(user);
  return <Perfil user={user} datos={datos} consulta={consulta} />;
}

function PerfilDelAlumno({ user }: { user: AuthUser }) {
  const { datos, consulta } = useDatosDelAlumno(user);
  return <Perfil user={user} datos={datos} consulta={consulta} extra={<MisInsignias />} />;
}

export function PerfilPage() {
  const { user } = useAuth();
  const { panelActivo } = usePanelActivo();
  if (!user) return null;
  return (
    <OwnerLayout>
      {panelActivo === "PROFESORA" ? <PerfilDeLaProfesora user={user} /> : <PerfilDelAlumno user={user} />}
    </OwnerLayout>
  );
}
