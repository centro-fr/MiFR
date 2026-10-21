import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { IInfoAsistencia } from "../../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoAlumnos } from "../../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoInscripciones } from "../../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoPlanes } from "../../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import { GeneradorInformesService } from "../generador-informes.service.js";

describe("GeneradorInformesService", () => {
  let cuotas: { cuotasVencidasDetalladas: ReturnType<typeof vi.fn> };
  let pagos: { obtenerCobranza: ReturnType<typeof vi.fn> };
  let planes: { listarVigentes: ReturnType<typeof vi.fn>; precioVigente: ReturnType<typeof vi.fn> };
  let inscripciones: {
    contarActivasPorPlan: ReturnType<typeof vi.fn>;
    contarInscriptosParaAsistencia: ReturnType<typeof vi.fn>;
  };
  let alumnos: { contarAltasPorMes: ReturnType<typeof vi.fn> };
  let asistencias: {
    resumirPorAlumno: ReturnType<typeof vi.fn>;
    resumirPorProfesora: ReturnType<typeof vi.fn>;
  };
  let horarios: { listarVigentes: ReturnType<typeof vi.fn> };
  let servicio: GeneradorInformesService;

  beforeEach(() => {
    cuotas = { cuotasVencidasDetalladas: vi.fn() };
    pagos = { obtenerCobranza: vi.fn() };
    planes = { listarVigentes: vi.fn(), precioVigente: vi.fn() };
    inscripciones = { contarActivasPorPlan: vi.fn(), contarInscriptosParaAsistencia: vi.fn() };
    alumnos = { contarAltasPorMes: vi.fn() };
    asistencias = {
      resumirPorAlumno: vi.fn().mockResolvedValue([]),
      resumirPorProfesora: vi.fn().mockResolvedValue([]),
    };
    horarios = { listarVigentes: vi.fn().mockResolvedValue([]) };

    servicio = new GeneradorInformesService(
      cuotas as unknown as IInfoCuotas,
      pagos as unknown as IInfoPagos,
      planes as unknown as IInfoPlanes,
      inscripciones as unknown as IInfoInscripciones,
      alumnos as unknown as IInfoAlumnos,
      asistencias as unknown as IInfoAsistencia,
      horarios as unknown as IInfoHorarios,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("informeCuotasVencidas (US-34)", () => {
    it("devuelve estructura vacía y totales en 0 cuando no hay cuotas vencidas", async () => {
      cuotas.cuotasVencidasDetalladas.mockResolvedValue([]);

      const resultado = await servicio.informeCuotasVencidas({ limit: 50, offset: 0 });

      expect(resultado).toEqual({
        periodo: { desde: null, hasta: null },
        resumen: {
          total_alumnos_vencidos: 0,
          monto_total_adeudado: 0,
          promedio_deuda_alumno: 0,
        },
        por_profesora: [],
        datos: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it("filtra por fechas, profesora, alumno, plan y calcula agregaciones y paginación con desempate por monto", async () => {
      const mockVencidas = [
        {
          id_inscripcion: 1,
          alumno: {
            id_alumno: 10,
            nombre: "Juan",
            apellido: "Pérez",
            telefono: "1111",
            email: "juan@test.com",
          },
          plan: { id_plan: 2, nombre: "Plan A" },
          profesora: { id_profesora: 1, nombre: "Ana", apellido: "García" },
          fecha_vencimiento: new Date("2026-09-10T00:00:00Z"),
          dias_vencida: 20,
          monto_adeudado: 30000,
        },
        {
          id_inscripcion: 2,
          alumno: {
            id_alumno: 10,
            nombre: "Juan",
            apellido: "Pérez",
            telefono: "1111",
            email: "juan@test.com",
          },
          plan: { id_plan: 2, nombre: "Plan A" },
          profesora: { id_profesora: 1, nombre: "Ana", apellido: "García" },
          fecha_vencimiento: new Date("2026-09-15T00:00:00Z"),
          dias_vencida: 15,
          monto_adeudado: 20000,
        },
        {
          id_inscripcion: 3,
          alumno: {
            id_alumno: 11,
            nombre: "María",
            apellido: "López",
            telefono: "2222",
            email: "maria@test.com",
          },
          plan: { id_plan: 3, nombre: "Plan B" },
          profesora: { id_profesora: 1, nombre: "Ana", apellido: "García" },
          fecha_vencimiento: new Date("2026-09-15T00:00:00Z"),
          dias_vencida: 15,
          monto_adeudado: 50000,
        },
        {
          id_inscripcion: 4,
          alumno: {
            id_alumno: 12,
            nombre: "Carlos",
            apellido: "Sosa",
            telefono: null,
            email: null,
          },
          plan: { id_plan: 2, nombre: "Plan A" },
          profesora: { id_profesora: 2, nombre: "Carla", apellido: "Díaz" },
          fecha_vencimiento: new Date("2026-09-20T00:00:00Z"),
          dias_vencida: 45,
          monto_adeudado: 25000,
        },
      ];
      cuotas.cuotasVencidasDetalladas.mockResolvedValue(mockVencidas);

      const resultado = await servicio.informeCuotasVencidas({
        id_profesora: 1,
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-30T00:00:00Z"),
        limit: 10,
        offset: 0,
      });

      expect(resultado.total).toBe(3);
      expect(resultado.datos.length).toBe(3);
      expect(resultado.datos[0].id_inscripcion).toBe(1);
      expect(resultado.datos[1].id_inscripcion).toBe(3);
      expect(resultado.datos[2].id_inscripcion).toBe(2);
      expect(resultado.resumen.total_alumnos_vencidos).toBe(2);
      expect(resultado.resumen.monto_total_adeudado).toBe(100000);
      expect(resultado.resumen.promedio_deuda_alumno).toBe(50000);
      expect(resultado.por_profesora).toEqual([
        {
          id_profesora: 1,
          nombre: "Ana",
          apellido: "García",
          cantidad_alumnos: 2,
          monto_total: 100000,
        },
      ]);
    });

    it("filtra específicamente por id_alumno e id_plan y excluye cuotas fuera de rango de fechas", async () => {
      const mockVencidas = [
        {
          id_inscripcion: 1,
          alumno: { id_alumno: 10, nombre: "Juan", apellido: "Pérez", telefono: null, email: null },
          plan: { id_plan: 2, nombre: "Plan A" },
          profesora: { id_profesora: 1, nombre: "Ana", apellido: "García" },
          fecha_vencimiento: new Date("2026-09-10T00:00:00Z"),
          dias_vencida: 20,
          monto_adeudado: 30000,
        },
        {
          id_inscripcion: 2,
          alumno: { id_alumno: 20, nombre: "Otro", apellido: "Alumno", telefono: null, email: null },
          plan: { id_plan: 3, nombre: "Plan B" },
          profesora: { id_profesora: 1, nombre: "Ana", apellido: "García" },
          fecha_vencimiento: new Date("2026-09-10T00:00:00Z"),
          dias_vencida: 50,
          monto_adeudado: 30000,
        },
      ];
      cuotas.cuotasVencidasDetalladas.mockResolvedValue(mockVencidas);

      const porAlumno = await servicio.informeCuotasVencidas({
        id_alumno: 10,
        limit: 10,
        offset: 0,
      });
      expect(porAlumno.total).toBe(1);
      expect(porAlumno.datos[0].id_inscripcion).toBe(1);

      const porPlan = await servicio.informeCuotasVencidas({
        id_plan: 2,
        limit: 10,
        offset: 0,
      });
      expect(porPlan.total).toBe(1);
      expect(porPlan.datos[0].id_inscripcion).toBe(1);

      const porFechaHasta = await servicio.informeCuotasVencidas({
        hasta: new Date("2026-09-01T00:00:00Z"),
        limit: 10,
        offset: 0,
      });
      expect(porFechaHasta.total).toBe(0);

      const porFechaDesde = await servicio.informeCuotasVencidas({
        desde: new Date("2026-10-01T00:00:00Z"),
        limit: 10,
        offset: 0,
      });
      expect(porFechaDesde.total).toBe(0);
    });
  });

  describe("informeCobranza", () => {
    it("obtiene pagos confirmados y calcula totales y porcentajes por forma de pago", async () => {
      pagos.obtenerCobranza.mockResolvedValue({
        pagos: [
          {
            id_pago: 101,
            id_cuota: 1,
            monto: 30000,
            forma_pago: "TRANSFERENCIA",
            fecha_pago: new Date("2026-10-10T12:00:00Z"),
            alumno: { id_alumno: 1, nombre: "Ana", apellido: "P" },
            plan: { id_plan: 2, nombre: "Plan A" },
            profesora_cobra: null,
          },
        ],
        total: 1,
        totalesPorForma: [
          { forma_pago: "TRANSFERENCIA", total: 30000, cantidad: 1 },
          { forma_pago: "EFECTIVO", total: 10000, cantidad: 1 },
        ],
      });

      const resultado = await servicio.informeCobranza({
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-31T00:00:00Z"),
        limit: 50,
        offset: 0,
      });

      expect(resultado.resumen.total_cobrado).toBe(40000);
      expect(resultado.resumen.total_transferencia).toBe(30000);
      expect(resultado.resumen.total_efectivo).toBe(10000);
      expect(resultado.resumen.cantidad_pagos).toBe(2);
      expect(resultado.por_forma_pago).toEqual([
        { forma_pago: "TRANSFERENCIA", total: 30000, cantidad: 1, porcentaje: 75 },
        { forma_pago: "EFECTIVO", total: 10000, cantidad: 1, porcentaje: 25 },
      ]);
      expect(resultado.datos[0].fecha_pago).toBe("2026-10-10T12:00:00.000Z");
    });

    it("utiliza fechas por defecto y maneja recaudación vacía con porcentajes en cero", async () => {
      pagos.obtenerCobranza.mockResolvedValue({
        pagos: [],
        total: 0,
        totalesPorForma: [{ forma_pago: "EFECTIVO", total: 0, cantidad: 0 }],
      });

      const resultado = await servicio.informeCobranza({ limit: 10, offset: 0 });

      expect(resultado.total).toBe(0);
      expect(resultado.resumen.total_cobrado).toBe(0);
      expect(resultado.resumen.total_efectivo).toBe(0);
      expect(resultado.resumen.total_transferencia).toBe(0);
      expect(resultado.por_forma_pago).toEqual([
        { forma_pago: "EFECTIVO", total: 0, cantidad: 0, porcentaje: 0 },
      ]);
      expect(pagos.obtenerCobranza).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: expect.any(Date),
          hasta: expect.any(Date),
        }),
        { limit: 10, offset: 0 },
      );
    });
  });

  describe("estadisticasPlanes (US-36)", () => {
    it("computa alumnos activos por plan, porcentajes e ingreso estimado mensual", async () => {
      planes.listarVigentes.mockResolvedValue([
        {
          id_plan: 1,
          nombre: "Plan Pase Libre",
          tipo: "MENSUAL",
          actividad_exclusiva: { id_actividad: 3, nombre: "Crossfit" },
        },
        { id_plan: 2, nombre: "Plan 2 Días", tipo: "MENSUAL", actividad_exclusiva: null },
        { id_plan: 3, nombre: "Plan Sin Alumnos", tipo: "MENSUAL", actividad_exclusiva: null },
      ]);

      inscripciones.contarActivasPorPlan.mockResolvedValue(
        new Map([
          [1, 30],
          [2, 10],
        ]),
      );

      planes.precioVigente.mockImplementation(async (idPlan: number) => {
        if (idPlan === 1) return { precio: 30000 };
        if (idPlan === 2) return { precio: 20000 };
        return null;
      });

      const resultado = await servicio.estadisticasPlanes({ id_actividad: 3, id_profesora: 2 });

      expect(planes.listarVigentes).toHaveBeenCalledWith({ id_actividad_exclusiva: 3 });
      expect(inscripciones.contarActivasPorPlan).toHaveBeenCalledWith({
        id_actividad: 3,
        id_profesora: 2,
      });

      expect(resultado.resumen.total_alumnos_activos).toBe(40);
      expect(resultado.resumen.ingreso_estimado_total).toBe(30 * 30000 + 10 * 20000);
      expect(resultado.resumen.total_planes).toBe(3);

      expect(resultado.planes[0]).toEqual({
        id_plan: 1,
        nombre: "Plan Pase Libre",
        tipo: "MENSUAL",
        actividad_exclusiva: { id_actividad: 3, nombre: "Crossfit" },
        cantidad_alumnos: 30,
        porcentaje: 75,
        precio_vigente: 30000,
        ingreso_estimado: 900000,
      });

      expect(resultado.planes[1]).toEqual({
        id_plan: 2,
        nombre: "Plan 2 Días",
        tipo: "MENSUAL",
        actividad_exclusiva: null,
        cantidad_alumnos: 10,
        porcentaje: 25,
        precio_vigente: 20000,
        ingreso_estimado: 200000,
      });

      expect(resultado.planes[2]).toEqual({
        id_plan: 3,
        nombre: "Plan Sin Alumnos",
        tipo: "MENSUAL",
        actividad_exclusiva: null,
        cantidad_alumnos: 0,
        porcentaje: 0,
        precio_vigente: null,
        ingreso_estimado: 0,
      });
    });

    it("desempata por nombre y maneja total de alumnos en cero", async () => {
      planes.listarVigentes.mockResolvedValue([
        { id_plan: 1, nombre: "Plan Z", tipo: "MENSUAL", actividad_exclusiva: null },
        { id_plan: 2, nombre: "Plan A", tipo: "MENSUAL", actividad_exclusiva: null },
      ]);
      inscripciones.contarActivasPorPlan.mockResolvedValue(new Map());
      planes.precioVigente.mockResolvedValue(null);

      const resultado = await servicio.estadisticasPlanes({});

      expect(resultado.resumen.total_alumnos_activos).toBe(0);
      expect(resultado.planes[0].nombre).toBe("Plan A");
      expect(resultado.planes[1].nombre).toBe("Plan Z");
      expect(resultado.planes[0].porcentaje).toBe(0);
      expect(resultado.planes[1].porcentaje).toBe(0);
    });
  });

  describe("estadisticasInscripciones (US-35)", () => {
    it("genera los meses del período con diferencias intermensuales y mes pico", async () => {
      alumnos.contarAltasPorMes.mockResolvedValue([
        { anio: 2026, mes: 1, total: 10 },
        { anio: 2026, mes: 2, total: 15 },
        { anio: 2026, mes: 3, total: 5 },
      ]);

      const resultado = await servicio.estadisticasInscripciones({
        desde: new Date("2026-01-01T00:00:00Z"),
        hasta: new Date("2026-03-31T00:00:00Z"),
      });

      expect(resultado.resumen.total_altas).toBe(30);
      expect(resultado.resumen.promedio_mensual).toBe(10);
      expect(resultado.resumen.mes_pico).toEqual({
        mes: 2,
        anio: 2026,
        nombre_mes: "Febrero",
        cantidad: 15,
      });

      expect(resultado.meses).toHaveLength(3);
      expect(resultado.meses[0].diferencia_mes_anterior).toBeNull();
      expect(resultado.meses[1].diferencia_mes_anterior).toBe(5);
      expect(resultado.meses[1].porcentaje_variacion).toBe(50);
      expect(resultado.meses[2].diferencia_mes_anterior).toBe(-10);
      expect(resultado.meses[2].porcentaje_variacion).toBe(-66.67);
    });

    it("soporta filtrado solo por anio y conserva anioSeleccionado cuando se envian desde, hasta y anio", async () => {
      alumnos.contarAltasPorMes.mockResolvedValue([{ anio: 2025, mes: 6, total: 20 }]);

      const porAnio = await servicio.estadisticasInscripciones({ anio: 2025 });
      expect(porAnio.periodo.anio).toBe(2025);
      expect(porAnio.periodo.desde).toBe("2025-01-01");
      expect(porAnio.periodo.hasta).toBe("2025-12-31");

      const conTodo = await servicio.estadisticasInscripciones({
        desde: new Date("2025-01-01T00:00:00Z"),
        hasta: new Date("2025-06-30T00:00:00Z"),
        anio: 2025,
      });
      expect(conTodo.periodo.anio).toBe(2025);
    });

    it("utiliza anio actual por defecto cuando no se especifican filtros", async () => {
      alumnos.contarAltasPorMes.mockResolvedValue([]);

      const resultado = await servicio.estadisticasInscripciones({});

      expect(resultado.periodo.anio).toBe(new Date().getUTCFullYear());
      expect(resultado.resumen.total_altas).toBe(0);
      expect(resultado.resumen.promedio_mensual).toBe(0);
      expect(resultado.resumen.mes_pico).toBeNull();
    });

    it("avanza de anio al cruzar de diciembre a enero en rangos multianuales", async () => {
      alumnos.contarAltasPorMes.mockResolvedValue([
        { anio: 2025, mes: 12, total: 5 },
        { anio: 2026, mes: 1, total: 8 },
      ]);

      const resultado = await servicio.estadisticasInscripciones({
        desde: new Date("2025-11-01T00:00:00Z"),
        hasta: new Date("2026-02-01T00:00:00Z"),
      });

      expect(resultado.meses).toHaveLength(4);
      expect(resultado.meses[0]).toMatchObject({ anio: 2025, mes: 11, cantidad: 0 });
      expect(resultado.meses[1]).toMatchObject({ anio: 2025, mes: 12, cantidad: 5 });
      expect(resultado.meses[2]).toMatchObject({ anio: 2026, mes: 1, cantidad: 8 });
      expect(resultado.meses[3]).toMatchObject({ anio: 2026, mes: 2, cantidad: 0 });
      expect(resultado.meses[1].porcentaje_variacion).toBeNull(); // mes anterior tenía 0
    });

    it("devuelve promedio 0 si el rango no genera meses", async () => {
      alumnos.contarAltasPorMes.mockResolvedValue([]);

      const resultado = await servicio.estadisticasInscripciones({
        desde: new Date("2026-05-01T00:00:00Z"),
        hasta: new Date("2026-04-01T00:00:00Z"),
      });

      expect(resultado.meses).toHaveLength(0);
      expect(resultado.resumen.promedio_mensual).toBe(0);
    });
  });

  describe("informeAsistencia (US-33)", () => {
    const filtroBase = { incluir_bajas: false, limit: 50, offset: 0 };

    function alumno(id_alumno: number, apellido: string, clases_previstas: number, clases_asistidas: number) {
      return {
        id_alumno,
        id_usuario: id_alumno * 10,
        id_usuario_responsable: null,
        nombre: "Nombre",
        apellido,
        estado: "ACTIVO" as const,
        clases_previstas,
        clases_asistidas,
      };
    }

    it("por defecto consulta el mes en curso hasta hoy, sin datos responde en cero", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));

      const informe = await servicio.informeAsistencia(filtroBase);

      const consulta = {
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-20T00:00:00Z"),
        id_alumno: undefined,
        id_profesora: undefined,
        id_actividad: undefined,
        incluir_bajas: false,
      };
      expect(asistencias.resumirPorAlumno).toHaveBeenCalledWith(consulta);
      expect(asistencias.resumirPorProfesora).toHaveBeenCalledWith(consulta);
      expect(informe).toEqual({
        periodo: { desde: "2026-10-01", hasta: "2026-10-20" },
        resumen: { clases_dictadas: 0, asistencias: 0, inasistencias: 0, porcentaje_asistencia: 0 },
        por_profesora: [],
        datos: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it("con solo hasta, arranca el primer día de ese mes y pasa los filtros combinados", async () => {
      await servicio.informeAsistencia({
        ...filtroBase,
        hasta: new Date("2026-09-15T00:00:00Z"),
        id_alumno: 5,
        id_profesora: 2,
        id_actividad: 3,
        incluir_bajas: true,
      });

      expect(asistencias.resumirPorAlumno).toHaveBeenCalledWith({
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-15T00:00:00Z"),
        id_alumno: 5,
        id_profesora: 2,
        id_actividad: 3,
        incluir_bajas: true,
      });
    });

    it("suma totales del período entero, calcula porcentajes y pagina el detalle por alumno", async () => {
      asistencias.resumirPorAlumno.mockResolvedValue([
        alumno(5, "Paz", 4, 3),
        alumno(6, "Ruiz", 3, 2),
        alumno(7, "Sosa", 2, 0),
      ]);
      asistencias.resumirPorProfesora.mockResolvedValue([
        {
          id_profesora: 2,
          nombre: "Lía",
          apellido: "Gómez",
          clases_dictadas: 3,
          alumnos: 2,
          clases_previstas: 6,
          clases_asistidas: 4,
        },
        {
          id_profesora: 4,
          nombre: "Ana",
          apellido: "Vera",
          clases_dictadas: 1,
          alumnos: 2,
          clases_previstas: 3,
          clases_asistidas: 1,
        },
      ]);

      const informe = await servicio.informeAsistencia({
        ...filtroBase,
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-31T00:00:00Z"),
        limit: 2,
        offset: 1,
      });

      expect(informe.resumen).toEqual({
        clases_dictadas: 4,
        asistencias: 5,
        inasistencias: 4,
        porcentaje_asistencia: 55.56,
      });
      expect(informe.por_profesora).toEqual([
        {
          id_profesora: 2,
          nombre: "Lía",
          apellido: "Gómez",
          clases_dictadas: 3,
          cantidad_alumnos: 2,
          asistencias: 4,
          porcentaje_promedio: 66.67,
        },
        {
          id_profesora: 4,
          nombre: "Ana",
          apellido: "Vera",
          clases_dictadas: 1,
          cantidad_alumnos: 2,
          asistencias: 1,
          porcentaje_promedio: 33.33,
        },
      ]);
      expect(informe.datos).toEqual([
        {
          id_alumno: 6,
          nombre: "Nombre",
          apellido: "Ruiz",
          estado: "ACTIVO",
          clases_previstas: 3,
          asistencias: 2,
          inasistencias: 1,
          porcentaje_asistencia: 66.67,
        },
        {
          id_alumno: 7,
          nombre: "Nombre",
          apellido: "Sosa",
          estado: "ACTIVO",
          clases_previstas: 2,
          asistencias: 0,
          inasistencias: 2,
          porcentaje_asistencia: 0,
        },
      ]);
      expect(informe).toMatchObject({ total: 3, limit: 2, offset: 1 });
      expect(informe.datos[0]).not.toHaveProperty("id_usuario");
    });
  });

  describe("informeOcupacion (US-37)", () => {
    const HORA = new Date("1970-01-01T18:00:00Z");

    function horario(id_horario: number, cupo: number | null, extra: Record<string, unknown> = {}) {
      return {
        id_horario,
        id_actividad: 3,
        id_profesora: 2,
        dia_semana: 1,
        hora_inicio: HORA,
        hora_fin: HORA,
        cupo_maximo_efectivo: cupo,
        actividad: { id_actividad: 3, nombre: "Funcional", modalidad: "GRUPAL" },
        profesora: { id_profesora: 2, usuario: { nombre: "Lía", apellido: "Gómez" } },
        ...extra,
      };
    }

    it("cuenta los inscriptos activos de hoy y clasifica cada horario por su ocupación", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
      horarios.listarVigentes.mockResolvedValue([
        horario(1, 20),
        horario(2, 20),
        horario(3, 20),
        horario(4, 20),
        horario(5, 20),
        horario(6, 20),
        horario(7, null),
      ]);
      inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(
        new Map([
          [1, 11],
          [2, 12],
          [3, 16],
          [4, 17],
          [5, 19],
          [6, 21],
          [7, 8],
        ]),
      );

      const informe = await servicio.informeOcupacion({});

      expect(inscripciones.contarInscriptosParaAsistencia).toHaveBeenCalledWith(
        [1, 2, 3, 4, 5, 6, 7],
        new Date("2026-10-20T00:00:00Z"),
      );
      expect(informe.datos.map(({ nivel, porcentaje_ocupacion }) => [nivel, porcentaje_ocupacion])).toEqual([
        ["LIBRE", 55],
        ["MODERADO", 60],
        ["MODERADO", 80],
        ["CASI_LLENO", 85],
        ["CASI_LLENO", 95],
        ["COMPLETO", 105],
        ["SIN_CUPO", null],
      ]);
      expect(informe.datos[0]).toEqual({
        id_horario: 1,
        dia_semana: 1,
        hora_inicio: HORA,
        hora_fin: HORA,
        actividad: { id_actividad: 3, nombre: "Funcional", modalidad: "GRUPAL" },
        profesora: { id_profesora: 2, nombre: "Lía", apellido: "Gómez" },
        cupo_maximo: 20,
        inscriptos: 11,
        porcentaje_ocupacion: 55,
        nivel: "LIBRE",
      });
      expect(informe.resumen).toEqual({
        total_horarios: 7,
        ocupacion_total: 80,
        por_nivel: { LIBRE: 1, MODERADO: 2, CASI_LLENO: 2, COMPLETO: 1, SIN_CUPO: 1 },
      });
    });

    it("un horario sin inscriptos queda en 0 y sin horarios la ocupación total es 0", async () => {
      horarios.listarVigentes.mockResolvedValue([horario(1, 10)]);
      inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map());

      const informe = await servicio.informeOcupacion({});
      expect(informe.datos[0]).toMatchObject({ inscriptos: 0, porcentaje_ocupacion: 0, nivel: "LIBRE" });

      horarios.listarVigentes.mockResolvedValue([]);
      await expect(servicio.informeOcupacion({})).resolves.toEqual({
        resumen: {
          total_horarios: 0,
          ocupacion_total: 0,
          por_nivel: { LIBRE: 0, MODERADO: 0, CASI_LLENO: 0, COMPLETO: 0, SIN_CUPO: 0 },
        },
        datos: [],
      });
    });

    it("filtra por actividad, profesora y modalidad", async () => {
      horarios.listarVigentes.mockResolvedValue([
        horario(1, 10),
        horario(2, 10, { id_actividad: 9 }),
        horario(3, 10, { id_profesora: 8 }),
        horario(4, 10, { actividad: { id_actividad: 3, nombre: "Funcional", modalidad: "PERSONALIZADA" } }),
      ]);
      inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map());

      const informe = await servicio.informeOcupacion({
        id_actividad: 3,
        id_profesora: 2,
        modalidad: "GRUPAL",
      });

      expect(informe.datos.map(({ id_horario }) => id_horario)).toEqual([1]);
      expect(inscripciones.contarInscriptosParaAsistencia).toHaveBeenCalledWith([1], expect.any(Date));
    });
  });
});
