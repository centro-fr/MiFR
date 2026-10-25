import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearProfesora,
  darDeBajaProfesora,
  listarProfesoras,
  listarUsuariosCandidatos,
  type UsuarioCandidato,
} from "@/features/profesoras/api/profesoras-api";
import type { CrearProfesoraFormData, Profesora } from "@/features/profesoras/schemas/profesora";

export const PROFESORAS_QUERY_KEY = ["profesoras"] as const;
export const USUARIOS_CANDIDATOS_QUERY_KEY = ["usuarios-aptos-profesora"] as const;

export function useProfesoras() {
  return useQuery<Profesora[]>({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
  });
}

export function useCrearProfesora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearProfesoraFormData) => crearProfesora(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USUARIOS_CANDIDATOS_QUERY_KEY });
    },
  });
}

export function useDarDeBajaProfesora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => darDeBajaProfesora(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USUARIOS_CANDIDATOS_QUERY_KEY });
    },
  });
}

export function useUsuariosAptosProfesora(profesorasExistentes: Profesora[] = []) {
  return useQuery<UsuarioCandidato[]>({
    queryKey: USUARIOS_CANDIDATOS_QUERY_KEY,
    queryFn: listarUsuariosCandidatos,
    select: (usuarios) => {
      const idsConPerfil = new Set(profesorasExistentes.map((p) => p.idUsuario));
      return usuarios.filter(
        (u) =>
          u.estado === "ACTIVO" &&
          u.roles.includes("PROFESORA") &&
          !idsConPerfil.has(u.idUsuario),
      );
    },
  });
}
