import { apiClient } from "@/api/client";
import { fichaInsigniasSchema, type FichaInsignias } from "../schemas/insignias";

export async function obtenerFichaInsignias(idAlumno: number): Promise<FichaInsignias> {
  const { data } = await apiClient.get(`/alumnos/${idAlumno}/insignias`);
  return fichaInsigniasSchema.parse(data);
}
