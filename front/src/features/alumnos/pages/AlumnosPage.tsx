import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Search, Filter, Loader2 } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAlumnos } from "../hooks/use-alumnos";
import { usePlanes } from "../hooks/use-planes";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { AlumnosTable } from "../components/AlumnosTable";
import { AlumnosEmptyState } from "../components/AlumnosEmptyState";
import { ModalPreinscripcion } from "../components/preinscripcion/ModalPreinscripcion";

export function AlumnosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Consultar alumnos
  const estadoQuery = filtroEstado === "TODOS" ? undefined : (filtroEstado as "ACTIVO" | "INACTIVO" | "BAJA");
  const { data: alumnosResp, isLoading: cargandoAlumnos } = useAlumnos({
    busqueda: busqueda || undefined,
    estado: estadoQuery,
  });

  // Consultar datos auxiliares para el modal de pre-inscripción
  const { data: planes = [] } = usePlanes();
  const { data: profesoras = [] } = useQuery({
    queryKey: ["profesoras"],
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
  });
  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios"],
    queryFn: listarHorarios,
    staleTime: 5 * 60_000,
  });

  const alumnos = alumnosResp?.datos || [];
  const totalAlumnos = alumnosResp?.total || 0;

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Encabezado sin bordes ni tarjetas exteriores, fundido al fondo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
                Alumnos
              </h1>
              {!cargandoAlumnos && (
                <Badge
                  variant="outline"
                  className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
                >
                  {totalAlumnos} alumnos
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Gestión de alumnos, pre-inscripciones y tutores de menores de edad.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="min-h-[44px] w-full sm:w-auto justify-center rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0 flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            Nueva pre-inscripción
          </Button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI o tutor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9.5 min-h-[44px] rounded-xl border-border bg-slate-50 dark:bg-white/5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Filter className="size-4 text-muted-foreground hidden sm:inline" />
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] rounded-xl border-border bg-slate-50 dark:bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="ACTIVO">Activos</SelectItem>
                <SelectItem value="INACTIVO">Pre-inscriptos</SelectItem>
                <SelectItem value="BAJA">Bajas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contenido principal */}
        {cargandoAlumnos ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">Cargando alumnos...</span>
          </div>
        ) : alumnos.length === 0 ? (
          <AlumnosEmptyState onNuevoAlumno={() => setIsModalOpen(true)} />
        ) : (
          <AlumnosTable alumnos={alumnos} />
        )}

        {/* Modal de Pre-inscripción */}
        <ModalPreinscripcion
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          planes={planes}
          profesoras={profesoras}
          horarios={horarios}
        />
      </div>
    </OwnerLayout>
  );
}
export default AlumnosPage;
