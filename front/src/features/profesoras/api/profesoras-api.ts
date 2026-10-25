import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  normalizarProfesora,
  profesoraApiSchema,
  type CrearProfesoraInput,
  type Profesora,
} from "@/features/profesoras/schemas/profesora";

const usuarioCreadoSchema = z.object({
  id_usuario: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
});

export async function listarProfesoras(): Promise<Profesora[]> {
  const { data } = await apiClient.get("/profesoras");
  return z.array(profesoraApiSchema).parse(data).map(normalizarProfesora);
}

export async function crearProfesora(input: CrearProfesoraInput): Promise<Profesora> {
  // 1. Crear el usuario en el sistema con su cuenta de acceso
  const { data: usuarioData } = await apiClient.post("/usuarios", {
    nombre: input.nombre,
    apellido: input.apellido,
    email: input.email,
    fecha_nacimiento: "1995-01-01",
  });

  const usuario = usuarioCreadoSchema.parse(usuarioData);

  // 2. Asignarle el rol PROFESORA
  await apiClient.post(`/usuarios/${usuario.id_usuario}/roles`, {
    rol: "PROFESORA",
  });

  // 3. Crear el perfil docente con su especialidad
  const cuerpo = {
    id_usuario: usuario.id_usuario,
    especialidad: input.especialidad && input.especialidad.trim().length > 0 ? input.especialidad.trim() : undefined,
  };

  const { data: profesoraData } = await apiClient.post("/profesoras", cuerpo);
  return normalizarProfesora(profesoraApiSchema.parse(profesoraData));
}

export async function darDeBajaProfesora(id: number): Promise<Profesora> {
  const { data } = await apiClient.delete(`/profesoras/${id}`);
  return normalizarProfesora(profesoraApiSchema.parse(data));
}
