import { delay, http, HttpResponse } from "msw";
import { db } from "@/mocks/db";
import { hoyEnArgentina, precioVigenteDePlan } from "@/mocks/precios";
import { errorApi, verificarAcceso } from "@/mocks/handlers/respuestas";
import { promociones } from "@/mocks/handlers/promociones";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";

// Mock de GET /reportes/planes (US-36), /ocupacion (US-37), /cobranza y /cuotas-vencidas (US-34),
// con el contrato del back (reportes/generador-informes): mismos filtros, orden y paginación.

const ACCESO = { rol: "PROPIETARIA", permiso: "REPORTES_COBRANZA_VER" } as const;

function numero(valor: string | null): number | undefined {
  if (valor === null || valor === "") return undefined;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : Number.NaN;
}

function pagina(params: URLSearchParams) {
  const limit = Math.min(Number(params.get("limit") ?? 50) || 50, 100);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);
  return { limit, offset };
}

function persona(idUsuario: number) {
  const usuario = db.usuariosPersonas.find((u) => u.id_usuario === idUsuario) ?? db.usuarios.find((u) => u.id_usuario === idUsuario);
  return { nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "", telefono: usuario?.telefono ?? null, email: usuario?.email ?? null };
}

function profesoraDe(idProfesora: number) {
  const profesora = db.profesoras.find((p) => p.id_profesora === idProfesora);
  const { nombre, apellido } = persona(profesora?.id_usuario ?? 0);
  return { id_profesora: idProfesora, nombre, apellido };
}

function alumnoDe(idAlumno: number) {
  const alumno = db.alumnos.find((a) => a.id_alumno === idAlumno);
  return { id_alumno: idAlumno, ...persona(alumno?.id_usuario ?? 0) };
}

const redondear = (valor: number) => Math.round(valor * 100) / 100;
const activas = () => db.inscripciones.filter((i) => i.estado === "ACTIVA");

function nivelDe(inscriptos: number, cupo: number | null) {
  if (!cupo) return "SIN_CUPO" as const;
  if (inscriptos * 100 >= 100 * cupo) return "COMPLETO" as const;
  if (inscriptos * 100 >= 85 * cupo) return "CASI_LLENO" as const;
  if (inscriptos * 100 >= 60 * cupo) return "MODERADO" as const;
  return "LIBRE" as const;
}

export const reportesCentroHandlers = [
  http.get("*/api/v1/reportes/planes", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const params = new URL(request.url).searchParams;
    const idActividad = numero(params.get("id_actividad"));
    const idProfesora = numero(params.get("id_profesora"));
    if (Number.isNaN(idActividad) || Number.isNaN(idProfesora)) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const inscripciones = activas().filter(
      (i) =>
        (idProfesora === undefined || i.id_profesora === idProfesora) &&
        (idActividad === undefined || i.ids_horarios.some((id) => db.horarios.find((h) => h.id_horario === id)?.id_actividad === idActividad)),
    );
    const total = inscripciones.length;
    const planes = db.planes
      .filter((plan) => plan.fecha_baja === null)
      .map((plan) => {
        const cantidad = inscripciones.filter((i) => i.id_plan === plan.id_plan).length;
        const precio = precioVigenteDePlan(plan.id_plan)?.precio ?? null;
        const actividad = db.actividades.find((a) => a.id_actividad === plan.id_actividad_exclusiva);
        return {
          id_plan: plan.id_plan,
          nombre: plan.nombre,
          tipo: plan.tipo,
          actividad_exclusiva: actividad ? { id_actividad: actividad.id_actividad, nombre: actividad.nombre } : null,
          cantidad_alumnos: cantidad,
          porcentaje: total > 0 ? redondear((cantidad * 100) / total) : 0,
          precio_vigente: precio,
          ingreso_estimado: plan.tipo === "MENSUAL" && precio !== null ? precio * cantidad : 0,
        };
      })
      .sort((a, b) => b.cantidad_alumnos - a.cantidad_alumnos || a.nombre.localeCompare(b.nombre));

    return HttpResponse.json({
      resumen: { total_alumnos_activos: total, ingreso_estimado_total: planes.reduce((s, p) => s + p.ingreso_estimado, 0), total_planes: planes.length },
      planes,
    });
  }),

  http.get("*/api/v1/reportes/ocupacion", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const params = new URL(request.url).searchParams;
    const idActividad = numero(params.get("id_actividad"));
    const idProfesora = numero(params.get("id_profesora"));
    const modalidad = params.get("modalidad");
    if (Number.isNaN(idActividad) || Number.isNaN(idProfesora)) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const datos = db.horarios
      .filter((h) => h.fecha_baja === null)
      .map((h) => ({ horario: h, actividad: db.actividades.find((a) => a.id_actividad === h.id_actividad) }))
      .filter(
        ({ horario, actividad }) =>
          (idActividad === undefined || horario.id_actividad === idActividad) &&
          (idProfesora === undefined || horario.id_profesora === idProfesora) &&
          (!modalidad || actividad?.modalidad === modalidad),
      )
      .map(({ horario, actividad }) => {
        const cupo = horario.cupo_maximo ?? actividad?.cupo_maximo ?? null;
        const inscriptos = activas().filter((i) => i.ids_horarios.includes(horario.id_horario)).length;
        return {
          id_horario: horario.id_horario,
          dia_semana: horario.dia_semana,
          hora_inicio: horario.hora_inicio,
          hora_fin: horario.hora_fin,
          actividad: { id_actividad: horario.id_actividad, nombre: actividad?.nombre ?? "", modalidad: actividad?.modalidad ?? "GRUPAL" },
          profesora: profesoraDe(horario.id_profesora),
          cupo_maximo: cupo,
          inscriptos,
          porcentaje_ocupacion: cupo ? redondear((inscriptos * 100) / cupo) : null,
          nivel: nivelDe(inscriptos, cupo),
        };
      });
    const conCupo = datos.filter((d) => d.cupo_maximo);
    const cupos = conCupo.reduce((s, d) => s + (d.cupo_maximo ?? 0), 0);
    const porNivel = { LIBRE: 0, MODERADO: 0, CASI_LLENO: 0, COMPLETO: 0, SIN_CUPO: 0 };
    for (const d of datos) porNivel[d.nivel] += 1;
    return HttpResponse.json({
      resumen: {
        total_horarios: datos.length,
        ocupacion_total: cupos > 0 ? redondear((conCupo.reduce((s, d) => s + d.inscriptos, 0) * 100) / cupos) : 0,
        por_nivel: porNivel,
      },
      datos,
    });
  }),

  http.get("*/api/v1/reportes/cobranza", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const params = new URL(request.url).searchParams;
    const hoy = hoyEnArgentina();
    const hasta = params.get("hasta") ?? hoy;
    const desde = params.get("desde") ?? `${hasta.slice(0, 8)}01`;
    const forma = params.get("forma_pago");
    const idProfesora = numero(params.get("id_profesora"));
    if (Number.isNaN(idProfesora) || desde > hasta) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const { limit, offset } = pagina(params);

    const pagos = db.pagos
      .filter(
        (p) =>
          p.estado === "CONFIRMADO" &&
          p.fecha_pago.slice(0, 10) >= desde &&
          p.fecha_pago.slice(0, 10) <= hasta &&
          (!forma || p.forma_pago === forma) &&
          (idProfesora === undefined || p.id_profesora_cobra === idProfesora),
      )
      .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
    const datos = pagos.map((p) => {
      const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === p.id_inscripcion);
      const plan = db.planes.find((pl) => pl.id_plan === inscripcion?.id_plan);
      const idPromo = p.id_promocion ?? inscripcion?.id_promocion;
      const promo = idPromo ? promociones.find((pr) => pr.id_promocion === idPromo) : null;
      let monto = p.monto;
      if (promo && plan) {
        const precioBase = db.planPrecios.find((pp) => pp.id_plan === plan.id_plan)?.precio;
        if (precioBase !== undefined && p.monto === precioBase) {
          const descuento =
            promo.tipo_descuento === "PORCENTAJE"
              ? precioBase * (promo.valor / 100)
              : Math.min(precioBase, promo.valor);
          monto = Math.round((precioBase - descuento) * 100) / 100;
        }
      }
      return {
        id_pago: p.id_pago,
        id_cuota: p.id_cuota,
        monto,
        forma_pago: p.forma_pago,
        fecha_pago: p.fecha_pago,
        alumno: alumnoDe(inscripcion?.id_alumno ?? 0),
        plan: { id_plan: plan?.id_plan ?? 0, nombre: plan?.nombre ?? "" },
        profesora_cobra: p.id_profesora_cobra ? profesoraDe(p.id_profesora_cobra) : null,
        promocion: promo ? { id_promocion: promo.id_promocion, codigo: promo.codigo, nombre: promo.nombre } : null,
      };
    });
    const suma = (lista: typeof datos) => lista.reduce((s, p) => s + p.monto, 0);
    const efectivo = suma(datos.filter((p) => p.forma_pago === "EFECTIVO"));
    const transferencia = suma(datos.filter((p) => p.forma_pago === "TRANSFERENCIA"));
    return HttpResponse.json({
      periodo: { desde, hasta },
      resumen: { total_cobrado: efectivo + transferencia, total_efectivo: efectivo, total_transferencia: transferencia, cantidad_pagos: pagos.length },
      por_forma_pago: [],
      datos: datos.slice(offset, offset + limit),
      total: datos.length,
      limit,
      offset,
    });
  }),

  http.get("*/api/v1/reportes/cuotas-vencidas", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const params = new URL(request.url).searchParams;
    const idProfesora = numero(params.get("id_profesora"));
    const idPlan = numero(params.get("id_plan"));
    if (Number.isNaN(idProfesora) || Number.isNaN(idPlan)) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const { limit, offset } = pagina(params);

    const vencidas = activas()
      .filter((i) => (idProfesora === undefined || i.id_profesora === idProfesora) && (idPlan === undefined || i.id_plan === idPlan))
      .map((i) => ({ inscripcion: i, situacion: situacionCuotaDe(i) }))
      .filter(({ situacion }) => situacion.estado === "VENCIDA" || situacion.estado === "CLASE_SUELTA_VENCIDA")
      .map(({ inscripcion, situacion }) => {
        const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
        return {
          id_inscripcion: inscripcion.id_inscripcion,
          alumno: alumnoDe(inscripcion.id_alumno),
          plan: { id_plan: inscripcion.id_plan, nombre: plan?.nombre ?? "" },
          profesora: profesoraDe(inscripcion.id_profesora),
          fecha_vencimiento: situacion.fecha_vencimiento?.slice(0, 10) ?? "",
          dias_vencida: Math.abs(situacion.dias_restantes ?? 0),
          monto_adeudado: precioVigenteDePlan(inscripcion.id_plan)?.precio ?? 0,
        };
      })
      .sort((a, b) => b.dias_vencida - a.dias_vencida || b.monto_adeudado - a.monto_adeudado);

    const total = vencidas.reduce((s, v) => s + v.monto_adeudado, 0);
    const porProfesora = [...new Set(vencidas.map((v) => v.profesora.id_profesora))].map((id) => {
      const propias = vencidas.filter((v) => v.profesora.id_profesora === id);
      return { ...profesoraDe(id), cantidad_alumnos: propias.length, monto_total: propias.reduce((s, v) => s + v.monto_adeudado, 0) };
    });
    return HttpResponse.json({
      periodo: { desde: null, hasta: null },
      resumen: {
        total_alumnos_vencidos: vencidas.length,
        monto_total_adeudado: total,
        promedio_deuda_alumno: vencidas.length > 0 ? redondear(total / vencidas.length) : 0,
      },
      por_profesora: porProfesora,
      datos: vencidas.slice(offset, offset + limit),
      total: vencidas.length,
      limit,
      offset,
    });
  }),
];
