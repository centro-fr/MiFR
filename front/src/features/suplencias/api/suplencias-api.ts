import { z } from "zod";
import { apiClient } from "@/api/client";
import { suplenciaApiSchema, type RegistrarSuplenciaBody } from "@/features/suplencias/schemas/suplencia";
import type { Suplencia, SuplenciaRegistrada } from "@/types/suplencia";

const listaSchema = z.array(suplenciaApiSchema);

function hora(api: string): string {
  return api.includes("T") ? api.slice(11, 16) : api.slice(0, 5);
}

function aSuplencia(api: z.infer<typeof suplenciaApiSchema>): Suplencia {
  return {
    idClase: String(api.id_clase),
    idHorario: String(api.clase.id_horario),
    fechaClase: api.clase.fecha_clase,
    estadoClase: api.clase.estado,
    actividad: { id: String(api.clase.horario.actividad.id_actividad), nombre: api.clase.horario.actividad.nombre },
    horaInicio: hora(api.clase.horario.hora_inicio),
    horaFin: hora(api.clase.horario.hora_fin),
    titular: {
      id: String(api.profesora_ausente.id_profesora),
      ...api.profesora_ausente.usuario,
    },
    suplente: {
      id: String(api.clase.profesora.id_profesora),
      ...api.clase.profesora.usuario,
    },
    motivo: api.motivo,
  };
}

export async function listarSuplencias(): Promise<Suplencia[]> {
  const { data } = await apiClient.get("/suplencias", { params: { limit: 100, offset: 0 } });
  return listaSchema.parse(data).map(aSuplencia);
}

export async function registrarSuplencia(cuerpo: RegistrarSuplenciaBody): Promise<SuplenciaRegistrada> {
  const { data } = await apiClient.post("/suplencias", cuerpo);
  const respuesta = z.object({ suplencia: suplenciaApiSchema, advertencia: z.string().nullable() }).parse(data);
  return { suplencia: aSuplencia(respuesta.suplencia), advertencia: respuesta.advertencia };
}

export async function actualizarSuplencia(idClase: string, cambios: { id_profesora_suplente?: number; motivo?: string }): Promise<Suplencia> {
  const { data } = await apiClient.patch(`/suplencias/${encodeURIComponent(idClase)}`, cambios);
  return aSuplencia(suplenciaApiSchema.parse(data));
}

export async function eliminarSuplencia(idClase: string): Promise<void> {
  await apiClient.delete(`/suplencias/${encodeURIComponent(idClase)}`);
}
