import { describe, expect, it } from "vitest";
import { db } from "@/mocks/db";
import { liquidarPeriodo } from "@/mocks/calculo-honorarios";

describe("Sincronización de Honorarios con Base en Memoria", () => {
  it("calcula los honorarios de octubre con las inscripciones y pagos de la base dinámica", () => {
    // Liquidar octubre 2026
    liquidarPeriodo(db, "2026-10", [1, 2, 3]);

    const liqLucia = db.liquidaciones.find((l) => l.id_profesora === 1 && l.periodo_desde === "2026-10-01");
    expect(liqLucia).toBeDefined();
    expect(liqLucia!.monto_total).toBeGreaterThan(0);

    const detallesLucia = db.liquidacionDetalles.filter((d) => d.id_liquidacion === liqLucia!.id_liquidacion);
    expect(detallesLucia.length).toBeGreaterThan(0);

    // Verificar que los alumnos corresponden a db.alumnos y db.usuariosPersonas
    for (const detalle of detallesLucia.filter((d) => d.concepto === "ALUMNO_A_CARGO")) {
      const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === detalle.id_inscripcion);
      expect(inscripcion).toBeDefined();
      expect(inscripcion!.id_profesora).toBe(1);

      const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion!.id_alumno);
      expect(alumno).toBeDefined();

      const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno!.id_usuario);
      expect(persona).toBeDefined();
      expect(persona!.nombre).toBeTruthy();
    }
  });

  it("agrega un alumno nuevo con cobro y se refleja dinámicamente al recalcular", () => {
    // 1. Agregar nuevo alumno en db
    const nuevoUsuario = {
      id_usuario: 999,
      nombre: "Agustina",
      apellido: "PruebaHonorarios",
      dni: "99888777",
      email: "agustina@example.com",
      telefono: "1199998888",
      fecha_nacimiento: "1995-05-10",
      direccion: "Calle Falsa 123",
      estado: "ACTIVO" as const,
    };
    db.usuariosPersonas.push(nuevoUsuario);

    const nuevoAlumno = {
      id_alumno: 999,
      id_usuario: 999,
      id_usuario_responsable: null,
      cont_emerg_nombre: "Emergencia",
      cont_emerg_telefono: "1199998888",
      apto_medico: true,
      fecha_apto_medico: "2026-01-01",
      observaciones: null,
      estado: "ACTIVO" as const,
      fecha_alta: "2026-10-15T00:00:00.000Z",
      fecha_baja: null,
    };
    db.alumnos.push(nuevoAlumno);

    // 2. Inscribir con Profesora 1 (Lucía Gómez)
    const nuevaInscripcion = {
      id_inscripcion: 999,
      id_alumno: 999,
      id_plan: 1,
      id_plan_precio: 1,
      id_profesora: 1,
      id_promocion: null,
      sin_cargo: false,
      fecha_inicio: "2026-10-15T00:00:00.000Z",
      fecha_fin_estimado: null,
      estado: "ACTIVA" as const,
      motivo_baja: null,
      detalle_baja: null,
      observaciones: null,
      fecha_alta: "2026-10-15T00:00:00.000Z",
      fecha_baja: null,
      ids_horarios: [1],
    };
    db.inscripciones.push(nuevaInscripcion);

    // 3. Registrar cobro de $25.000 en octubre
    const nuevoPago = {
      id_pago: 999,
      id_cuota: 999,
      id_inscripcion: 999,
      forma_pago: "EFECTIVO" as const,
      estado: "CONFIRMADO" as const,
      monto: 25000,
      fecha_pago: "2026-10-15T12:00:00.000Z",
      titular_cuenta_origen: null,
      fecha_hora_transferencia: null,
      id_usuario_registra: 1,
      id_profesora_cobra: 1,
      rendido: true,
      fecha_rendicion: null,
      id_usuario_confirma: 1,
      fecha_confirmacion: "2026-10-15T12:00:00.000Z",
      motivo_rechazo: null,
      observaciones: null,
    };
    db.pagos.push(nuevoPago);

    // 4. Recalcular liquidaciones
    liquidarPeriodo(db, "2026-10", [1]);

    const liqLucia = db.liquidaciones.find((l) => l.id_profesora === 1 && l.periodo_desde === "2026-10-01");
    const detalleNuevo = db.liquidacionDetalles.find(
      (d) => d.id_liquidacion === liqLucia!.id_liquidacion && d.id_inscripcion === 999,
    );

    expect(detalleNuevo).toBeDefined();
    // 50% de 25000 = 12500
    expect(detalleNuevo!.monto).toBe(12500);
  });
});
