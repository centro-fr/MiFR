import { delay, http, HttpResponse } from "msw";
import { db, siguienteId, type ClaseAsistenciaMock } from "@/mocks/db";
import { errorApi, idDeRuta, verificarAcceso } from "@/mocks/handlers/respuestas";

interface SuplenciaMock {
  id_clase: number;
  id_prof_ausente: number;
  id_prof_suplente: number;
  fecha_clase: string;
  id_horario: number;
  motivo: string | null;
}

const suplencias: SuplenciaMock[] = [
  { id_clase: 1, id_prof_ausente: 1, id_prof_suplente: 2, fecha_clase: "2026-10-16", id_horario: 11, motivo: "Capacitación" },
];

function profesora(id: number) {
  const fila = db.profesoras.find((profesora) => profesora.id_profesora === id);
  const usuario = db.usuarios.find((usuario) => usuario.id_usuario === fila?.id_usuario);
  return { id_profesora: id, usuario: { nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "" } };
}

function horario(id: number) {
  return db.horarios.find((horario) => horario.id_horario === id);
}

function estado(fecha: string): ClaseAsistenciaMock["estado"] {
  return fecha < new Date().toISOString().slice(0, 10) ? "DICTADA" : "PROGRAMADA";
}

function serializar(suplencia: SuplenciaMock) {
  const clase = horario(suplencia.id_horario);
  const actividad = db.actividades.find((item) => item.id_actividad === clase?.id_actividad);
  const registro = db.clases.find((item) => item.id_clase === suplencia.id_clase);
  return {
    id_clase: suplencia.id_clase,
    id_prof_ausente: suplencia.id_prof_ausente,
    motivo: suplencia.motivo,
    fecha_registro: "2026-10-01",
    id_usuario_registra: 3,
    clase: {
      id_horario: suplencia.id_horario,
      fecha_clase: suplencia.fecha_clase,
      id_prof_dictante: suplencia.id_prof_suplente,
      estado: registro?.estado ?? estado(suplencia.fecha_clase),
      horario: {
        dia_semana: clase?.dia_semana ?? 1,
        hora_inicio: clase?.hora_inicio ?? "09:00",
        hora_fin: clase?.hora_fin ?? "10:00",
        actividad: { id_actividad: clase?.id_actividad ?? 1, nombre: actividad?.nombre ?? "Actividad" },
      },
      profesora: profesora(suplencia.id_prof_suplente),
    },
    profesora_ausente: profesora(suplencia.id_prof_ausente),
  };
}

function buscar(id: string | readonly string[] | undefined) {
  const numero = idDeRuta(id);
  return numero === null ? undefined : suplencias.find((suplencia) => suplencia.id_clase === numero);
}

export const suplenciasHandlers = [
  http.get("*/api/v1/suplencias", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HONORARIOS_VER_TODOS" });
    if (denegado) return denegado;
    return HttpResponse.json([...suplencias].sort((a, b) => b.fecha_clase.localeCompare(a.fecha_clase)).map(serializar));
  }),
  http.post("*/api/v1/suplencias", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HONORARIOS_LIQUIDAR" });
    if (denegado) return denegado;
    const cuerpo = (await request.json()) as { id_horario: number; fecha_clase: string; id_profesora_suplente: number; motivo?: string };
    const horarioElegido = horario(cuerpo.id_horario);
    if (!horarioElegido) return errorApi(404, "HORARIO_NO_ENCONTRADO", "El horario no existe");
    if (suplencias.some((suplencia) => suplencia.id_horario === cuerpo.id_horario && suplencia.fecha_clase === cuerpo.fecha_clase)) return errorApi(409, "SUPLENCIA_DUPLICADA", "La clase ya tiene una suplencia");
    if (horarioElegido.id_profesora === cuerpo.id_profesora_suplente) return errorApi(400, "MISMA_PROFESORA", "La suplente tiene que ser otra profesora");
    const nueva: SuplenciaMock = {
      id_clase: siguienteId(suplencias.map((suplencia) => suplencia.id_clase)),
      id_prof_ausente: horarioElegido.id_profesora,
      id_prof_suplente: cuerpo.id_profesora_suplente,
      fecha_clase: cuerpo.fecha_clase,
      id_horario: cuerpo.id_horario,
      motivo: cuerpo.motivo ?? null,
    };
    suplencias.push(nueva);
    return HttpResponse.json({ suplencia: serializar(nueva), advertencia: cuerpo.fecha_clase > new Date().toISOString().slice(0, 10) ? "La clase todavía no se dictó: si la titular finalmente viene, eliminá la suplencia" : null }, { status: 201 });
  }),
  http.patch("*/api/v1/suplencias/:idClase", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HONORARIOS_LIQUIDAR" });
    if (denegado) return denegado;
    const suplencia = buscar(params.idClase);
    if (!suplencia) return errorApi(404, "NOT_FOUND", "La suplencia no existe");
    Object.assign(suplencia, (await request.json()) as Partial<SuplenciaMock>);
    return HttpResponse.json(serializar(suplencia));
  }),
  http.delete("*/api/v1/suplencias/:idClase", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HONORARIOS_LIQUIDAR" });
    if (denegado) return denegado;
    const indice = suplencias.findIndex((suplencia) => suplencia.id_clase === idDeRuta(params.idClase));
    if (indice < 0) return errorApi(404, "NOT_FOUND", "La suplencia no existe");
    suplencias.splice(indice, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
