import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  normalizarProfesora,
  profesoraApiSchema,
  type CrearProfesoraInput,
  type Profesora,
} from "@/features/profesoras/schemas/profesora";

export interface UsuarioCandidato {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  estado: string;
}

const usuarioApiSchema = z.object({
  id_usuario: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
  estado: z.string().optional(),
  roles: z.array(z.union([z.string(), z.object({ rol: z.object({ codigo: z.string() }) })])).optional(),
});

export async function listarProfesoras(): Promise<Profesora[]> {
  const { data } = await apiClient.get("/profesoras");
  return z.array(profesoraApiSchema).parse(data).map(normalizarProfesora);
}

export async function crearProfesora(input: CrearProfesoraInput): Promise<Profesora> {
  let idUsuarioParaProfesora: number;

  if (input.modo === "EXISTENTE") {
    idUsuarioParaProfesora = input.id_usuario;
  } else {
    // 1. Crear el usuario en el sistema
    const { data: usuarioCreado } = await apiClient.post("/usuarios", {
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
      fecha_nacimiento: "1995-01-01",
    });

    const parsedUsuario = usuarioApiSchema.parse(usuarioCreado);
    idUsuarioParaProfesora = parsedUsuario.id_usuario;

    // 2. Asignar rol PROFESORA a la cuenta
    await apiClient.post(`/usuarios/${idUsuarioParaProfesora}/roles`, {
      rol: "PROFESORA",
    });
  }

  // 3. Crear el perfil de profesora
  const cuerpo = {
    id_usuario: idUsuarioParaProfesora,
    especialidad: input.especialidad && input.especialidad.trim().length > 0 ? input.especialidad.trim() : undefined,
  };

  const { data } = await apiClient.post("/profesoras", cuerpo);
  return normalizarProfesora(profesoraApiSchema.parse(data));
}

export async function darDeBajaProfesora(id: number): Promise<Profesora> {
  const { data } = await apiClient.delete(`/profesoras/${id}`);
  return normalizarProfesora(profesoraApiSchema.parse(data));
}

export async function listarUsuariosCandidatos(): Promise<UsuarioCandidato[]> {
  const { data } = await apiClient.get("/usuarios");
  const parsed = z.array(usuarioApiSchema).parse(data);

  return parsed.map((u) => {
    const rolesNormalizados = (u.roles ?? []).map((r) => (typeof r === "string" ? r : r.rol.codigo));
    return {
      idUsuario: u.id_usuario,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      roles: rolesNormalizados,
      estado: u.estado ?? "ACTIVO",
    };
  });
}
