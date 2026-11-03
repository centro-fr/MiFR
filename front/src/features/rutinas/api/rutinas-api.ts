import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  medicionApiSchema,
  miAlumnoApiSchema,
  rutinaApiSchema,
  type CorregirMedicionBody,
  type CrearRutinaBody,
  type MedicionApi,
  type RegistrarMedicionBody,
  type RutinaApi,
} from "@/features/rutinas/schemas/rutinas";
import type { AlumnoConsultable, Medicion, Rutina } from "@/types/rutinas";

// Endpoints de US-27 y US-28. Ver: RUTINAS_VER (la profesora, solo sus alumnos a cargo) o
// RUTINAS_VER_PROPIAS (el alumno lo suyo y el tutor lo de sus menores). Cargar, corregir y dar de baja:
// RUTINAS_EDITAR, y la profesora solo sobre sus alumnos a cargo aunque otra haya cargado la medición.

function aRutina(api: RutinaApi): Rutina {
  return {
    id: api.id_rutina,
    idProfesora: api.id_profesora,
    nombre: api.nombre,
    desde: api.fecha_desde,
    hasta: api.fecha_hasta,
    dias: api.contenido.dias,
    observaciones: api.observaciones,
    vigente: api.activa,
  };
}

function aMedicion(api: MedicionApi): Medicion {
  return {
    id: api.id_registro,
    idProfesora: api.id_profesora,
    fecha: api.fecha,
    observaciones: api.observaciones,
    medidas: api.medidas,
    corregidaEl: api.fecha_modificacion,
  };
}

/**
 * Todas las rutinas del alumno, de la más reciente a la más antigua; la vigente viene marcada. Con este
 * listado alcanza: no hace falta pedir aparte GET /alumnos/:id/rutinas/vigente.
 */
export async function listarRutinasDeAlumno(idAlumno: number): Promise<Rutina[]> {
  const { data } = await apiClient.get(`/alumnos/${encodeURIComponent(idAlumno)}/rutinas`);
  return z.array(rutinaApiSchema).parse(data).map(aRutina);
}

/** La nueva queda vigente y la anterior pasa al historial. */
export async function crearRutina(cuerpo: CrearRutinaBody): Promise<Rutina> {
  const { data } = await apiClient.post("/rutinas", cuerpo);
  return aRutina(rutinaApiSchema.parse(data));
}

/** De la medición más reciente a la más antigua. Lista vacía si todavía no tiene. */
export async function listarMedicionesDeAlumno(idAlumno: number): Promise<Medicion[]> {
  const { data } = await apiClient.get(`/alumnos/${encodeURIComponent(idAlumno)}/progreso`);
  return z.array(medicionApiSchema).parse(data).map(aMedicion);
}

/**
 * US-28: los alumnos cuya rutina puede ver quien inició sesión. La sesión (/me) no dice qué alumno es:
 * el alumno recibe el suyo y el tutor, sus menores a cargo.
 */
export async function listarMisAlumnos(): Promise<AlumnoConsultable[]> {
  const { data } = await apiClient.get("/alumnos/mios");
  return z
    .array(miAlumnoApiSchema)
    .parse(data)
    .map((api) => ({ id: api.id_alumno, nombre: api.nombre, apellido: api.apellido, propio: api.propio, dadoDeBaja: api.estado === "BAJA" }));
}

/** 400 si la fecha es futura o una medida está fuera de rango. */
export async function registrarMedicion(cuerpo: RegistrarMedicionBody): Promise<Medicion> {
  const { data } = await apiClient.post("/progreso", cuerpo);
  return aMedicion(medicionApiSchema.parse(data));
}

/** Mismas validaciones que al registrar. 403 a la profesora (404 a la propietaria) si ya no existe. */
export async function corregirMedicion(idRegistro: number, cuerpo: CorregirMedicionBody): Promise<Medicion> {
  const { data } = await apiClient.patch(`/progreso/${encodeURIComponent(idRegistro)}`, cuerpo);
  return aMedicion(medicionApiSchema.parse(data));
}

/** Baja lógica: deja de aparecer en el historial del alumno y ya no se puede corregir. */
export async function darDeBajaMedicion(idRegistro: number): Promise<void> {
  await apiClient.delete(`/progreso/${encodeURIComponent(idRegistro)}`);
}
