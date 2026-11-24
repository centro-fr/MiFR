import type { Prisma, PrismaClient } from "@prisma/client";
import type { CierreMensualHonorariosService } from "../../../modules/gestion-honorarios/cierre-mensual-honorarios/cierre-mensual-honorarios.service.js";
import type { CierreMensualInsigniasService } from "../../../modules/gestion-insignias/cierre-mensual-insignias/cierre-mensual-insignias.service.js";
import type { PlanificadorNotificacionesService } from "../../../modules/gestion-notificaciones/planificador-notificaciones/planificador-notificaciones.service.js";
import { fechaActualArgentina } from "../../utils/fecha-argentina.js";
import {
  ACTIVIDADES,
  ALUMNOS,
  CAMBIO_DE_PLAN_PROGRAMADO,
  CANCELACIONES,
  CUPO_TRAINING_VIERNES,
  GRILLA,
  MARINA,
  PLANES,
  PROFESORAS,
  SUPLENCIAS,
  TUTORES,
  type AlumnoDelElenco,
  type InscripcionDelElenco,
  type PlanDelElenco,
} from "./elenco.js";
import {
  crearAzar,
  diaDeLaSemana,
  enteroAlAzar,
  hora,
  instante,
  planearPagos,
  primerDiaDelMes,
  sumarDias,
  unaHoraDespues,
  type Azar,
  type PagoPlaneado,
} from "./historia.js";
import { alumnosHistoricos, inicioDeLaHistoria } from "./historicos.js";
import { cargarRutinasYProgreso } from "./rutinas.js";

// Carga en una base vacía (con el catálogo de seguridad, las insignias y los parámetros ya cargados) el
// centro de la presentación: profesoras, grilla, planes, alumnos con meses de cuotas, pagos, clases y
// asistencias. Lo que la API deriva de esos hechos (liquidaciones de honorarios, insignias del mes,
// avisos de cuota) no se escribe a mano: lo generan sus propios procesos, con la fecha que corresponde,
// así queda calculado con las mismas reglas que en el uso real.

export interface ProcesosDeLaPresentacion {
  cierreMensualHonorarios: Pick<CierreMensualHonorariosService, "cerrarMesAnterior">;
  cierreMensualInsignias: Pick<CierreMensualInsigniasService, "cerrarMesAnterior">;
  planificadorNotificaciones: Pick<PlanificadorNotificacionesService, "generarAvisosDelDia">;
}

export interface ResumenPresentacion {
  profesoras: number;
  alumnos: number;
  inscripciones: number;
  cuotas: number;
  pagos: number;
  clases: number;
  asistencias: number;
  liquidaciones: number;
  insignias: number;
  avisos: number;
}

const PROMO_AMIGAS = "Promo amigas";
// El valor inicial de DIA_CIERRE_HONORARIOS: la carga parte de una base nueva.
const DIA_CIERRE_HONORARIOS = 5;

interface HorarioCargado {
  id_horario: number;
  id_profesora: number;
  codigoActividad: string;
  dia: number;
  hora: string;
}

interface Contexto {
  prisma: PrismaClient;
  hoy: Date;
  ahora: Date;
  // Los ids de usuario y de profesora por email de la profesora.
  usuarioDeProfesora: Map<string, number>;
  idProfesora: Map<string, number>;
  horarios: HorarioCargado[];
  planes: Map<string, { id_plan: number; definicion: PlanDelElenco; precios: PrecioCargado[] }>;
  promoAmigas: { id_promocion: number; desde: Date; hasta: Date; porcentaje: number; planes: Set<number> };
  rendiciones: Date[];
  idMarina: number;
}

interface PrecioCargado {
  id_plan_precio: number;
  precio: number;
  desde: Date;
  hasta: Date | null;
}

// Una inscripción ya cargada, con lo que hace falta para su asistencia.
export interface InscripcionCargada {
  id_inscripcion: number;
  id_alumno: number;
  alumno: AlumnoDelElenco;
  idsHorarios: number[];
  desde: Date;
  // El primer día que ya no cursa: el de la baja.
  hasta: Date | null;
  preinscripta: boolean;
  definicion: InscripcionDelElenco;
  id_profesora: number;
  emailProfesora: string;
}

export async function cargarPresentacion(
  prisma: PrismaClient,
  procesos: ProcesosDeLaPresentacion,
  ahora: Date = new Date(),
): Promise<ResumenPresentacion> {
  const hoy = fechaActualArgentina(ahora);
  const contexto = await cargarElCentro(prisma, hoy, ahora);
  const inscripciones = await cargarAlumnos(contexto);
  await cargarCambioDePlan(contexto, inscripciones);
  await cargarClases(contexto, inscripciones);
  await cargarRutinasYProgreso(prisma, hoy, inscripciones, contexto.idProfesora);
  await cargarSeguimientos(contexto, inscripciones);
  await correrLosProcesos(prisma, procesos, hoy);
  return resumir(prisma);
}

async function cargarElCentro(prisma: PrismaClient, hoy: Date, ahora: Date): Promise<Contexto> {
  // Desde que el centro empezó a usar el sistema: las altas de profesoras, horarios y precios.
  const altaDelCentro = inicioDeLaHistoria(hoy);
  await cargarDatosBancarios(prisma);
  const { usuarioDeProfesora, idProfesora } = await cargarProfesoras(prisma, altaDelCentro);
  const horarios = await cargarGrilla(prisma, idProfesora, altaDelCentro);
  const planes = await cargarPlanes(prisma, hoy, altaDelCentro);
  const promoAmigas = await cargarPromociones(prisma, hoy, planes);
  await cargarTarifas(prisma, idProfesora, altaDelCentro);
  return {
    prisma,
    hoy,
    ahora,
    usuarioDeProfesora,
    idProfesora,
    horarios,
    planes,
    promoAmigas,
    rendiciones: fechasDeRendicion(hoy, altaDelCentro),
    idMarina: usuarioDeProfesora.get(MARINA) as number,
  };
}

async function cargarDatosBancarios(prisma: PrismaClient): Promise<void> {
  const datos: [string, string][] = [
    ["DATOS_BANCARIOS_ALIAS", "fr.entrenamiento.perico"],
    ["DATOS_BANCARIOS_TITULAR", "Marina Sosa"],
  ];
  for (const [clave, valor] of datos) {
    await prisma.parametros_sistema.update({ where: { clave }, data: { valor } });
  }
}

async function cargarProfesoras(prisma: PrismaClient, alta: Date) {
  const roles = new Map((await prisma.roles.findMany()).map(({ codigo, id_rol }) => [codigo, id_rol]));
  const usuarioDeProfesora = new Map<string, number>();
  const idProfesora = new Map<string, number>();
  for (const { roles: codigos, especialidad, fecha_nacimiento, ...datos } of PROFESORAS) {
    const usuario = await prisma.usuarios.create({
      data: { ...datos, fecha_nacimiento: new Date(fecha_nacimiento), estado: "ACTIVO", fecha_alta: alta },
    });
    await prisma.usuario_roles.createMany({
      data: codigos.map((codigo) => ({
        id_usuario: usuario.id_usuario,
        id_rol: roles.get(codigo) as number,
        fecha_asignacion: alta,
      })),
    });
    const profesora = await prisma.profesoras.create({
      data: { id_usuario: usuario.id_usuario, especialidad, fecha_alta: alta },
    });
    usuarioDeProfesora.set(datos.email, usuario.id_usuario);
    idProfesora.set(datos.email, profesora.id_profesora);
  }
  return { usuarioDeProfesora, idProfesora };
}

async function cargarGrilla(
  prisma: PrismaClient,
  idProfesora: Map<string, number>,
  alta: Date,
): Promise<HorarioCargado[]> {
  const idActividad = new Map<string, number>();
  for (const actividad of ACTIVIDADES) {
    const creada = await prisma.actividades.create({ data: { ...actividad, activo: true } });
    idActividad.set(actividad.codigo, creada.id_actividad);
  }

  const horarios: HorarioCargado[] = [];
  for (const [dia, bloques] of Object.entries(GRILLA)) {
    for (const bloque of bloques) {
      const id_profesora = idProfesora.get(bloque.emailProfesora) as number;
      const conCupoPropio = bloque.codigoActividad === "TRAINING" && dia === "5";
      const creado = await prisma.horarios.create({
        data: {
          id_actividad: idActividad.get(bloque.codigoActividad) as number,
          id_profesora,
          dia_semana: Number(dia),
          hora_inicio: hora(bloque.hora),
          hora_fin: hora(unaHoraDespues(bloque.hora)),
          cupo_maximo: conCupoPropio ? CUPO_TRAINING_VIERNES : null,
          fecha_alta: alta,
        },
      });
      horarios.push({
        id_horario: creado.id_horario,
        id_profesora,
        codigoActividad: bloque.codigoActividad,
        dia: Number(dia),
        hora: bloque.hora,
      });
    }
  }
  return horarios;
}

// El aumento rige desde el primer día de hace dos meses; el precio programado, desde el mes que viene.
function vigenciasDePrecio(hoy: Date) {
  return { aumento: primerDiaDelMes(hoy, -2), programado: primerDiaDelMes(hoy, 1) };
}

async function cargarPlanes(prisma: PrismaClient, hoy: Date, alta: Date): Promise<Contexto["planes"]> {
  const { aumento, programado } = vigenciasDePrecio(hoy);
  const actividades = new Map(
    (await prisma.actividades.findMany()).map(({ codigo, id_actividad }) => [codigo, id_actividad]),
  );
  const planes: Contexto["planes"] = new Map();
  for (const definicion of PLANES) {
    const { codigoActividadExclusiva, precioAnterior, precioActual, precioProgramado, ...plan } = definicion;
    const creado = await prisma.planes.create({
      data: {
        ...plan,
        id_actividad_exclusiva: codigoActividadExclusiva ? actividades.get(codigoActividadExclusiva) : null,
        fecha_alta: alta,
      },
    });
    const tramos: Omit<PrecioCargado, "id_plan_precio">[] = [
      { precio: precioAnterior, desde: alta, hasta: sumarDias(aumento, -1) },
      { precio: precioActual, desde: aumento, hasta: precioProgramado ? sumarDias(programado, -1) : null },
      ...(precioProgramado ? [{ precio: precioProgramado, desde: programado, hasta: null }] : []),
    ];
    const precios: PrecioCargado[] = [];
    for (const tramo of tramos) {
      const { id_plan_precio } = await prisma.plan_precios.create({
        data: {
          id_plan: creado.id_plan,
          precio: tramo.precio,
          fecha_vigencia_desde: tramo.desde,
          fecha_vigencia_hasta: tramo.hasta,
        },
      });
      precios.push({ ...tramo, id_plan_precio });
    }
    planes.set(definicion.nombre, { id_plan: creado.id_plan, definicion, precios });
  }
  return planes;
}

async function cargarPromociones(
  prisma: PrismaClient,
  hoy: Date,
  planes: Contexto["planes"],
): Promise<Contexto["promoAmigas"]> {
  const idDe = (nombre: string) => planes.get(nombre)?.id_plan as number;
  const grupales = ["Básico", "Intermedio", "Full"].map(idDe);
  const promociones = [
    {
      nombre: PROMO_AMIGAS,
      tipo_descuento: "PORCENTAJE" as const,
      valor: 10,
      fecha_desde: sumarDias(hoy, -120),
      fecha_hasta: sumarDias(primerDiaDelMes(hoy, 2), -1),
      planes: grupales,
    },
    {
      nombre: "Vuelta al entrenamiento",
      tipo_descuento: "MONTO_FIJO" as const,
      valor: 5000,
      fecha_desde: sumarDias(hoy, -200),
      fecha_hasta: sumarDias(hoy, -150),
      planes: grupales.slice(0, 2),
    },
    {
      nombre: "Verano en FR",
      tipo_descuento: "PORCENTAJE" as const,
      valor: 15,
      fecha_desde: primerDiaDelMes(hoy, 1),
      fecha_hasta: sumarDias(primerDiaDelMes(hoy, 3), -1),
      planes: [...grupales, idDe("Kid Fit")],
    },
  ];
  const creadas = [];
  for (const { planes: idsPlanes, ...promocion } of promociones) {
    creadas.push(
      await prisma.promociones.create({
        data: { ...promocion, activo: true, planes: { create: idsPlanes.map((id_plan) => ({ id_plan })) } },
      }),
    );
  }
  const [amigas] = creadas;
  return {
    id_promocion: amigas.id_promocion,
    desde: amigas.fecha_desde,
    hasta: amigas.fecha_hasta,
    porcentaje: 10,
    planes: new Set(grupales),
  };
}

// Regla vigente (Sprint 5): cada profesora cobra el 50 % de lo que pagan sus alumnos y un fijo por hora
// de suplencia. La propietaria no se liquida honorarios a sí misma.
async function cargarTarifas(
  prisma: PrismaClient,
  idProfesora: Map<string, number>,
  desde: Date,
): Promise<void> {
  const tarifas: Prisma.tarifas_honorarioCreateManyInput[] = [];
  for (const [email, id_profesora] of idProfesora) {
    if (email === MARINA) continue;
    tarifas.push(
      {
        id_profesora,
        concepto: "ALUMNO_A_CARGO",
        tipo_valor: "PORCENTAJE",
        valor: 50,
        fecha_vigencia_desde: desde,
      },
      {
        id_profesora,
        concepto: "HORA_SUPLENCIA",
        tipo_valor: "MONTO_FIJO",
        valor: 4000,
        fecha_vigencia_desde: desde,
      },
    );
  }
  await prisma.tarifas_honorario.createMany({ data: tarifas });
}

// Las profesoras rinden el efectivo un viernes cada dos semanas, desde que el centro usa el sistema. La
// última rendición fue hace al menos una semana: lo cobrado después queda como efectivo a rendir (US-19).
function fechasDeRendicion(hoy: Date, desde: Date): Date[] {
  let ultima = sumarDias(hoy, -7);
  while (diaDeLaSemana(ultima) !== 5) ultima = sumarDias(ultima, -1);
  const fechas: Date[] = [];
  for (let viernes = ultima; viernes >= desde; viernes = sumarDias(viernes, -14)) fechas.push(viernes);
  return fechas.reverse();
}

async function cargarAlumnos(contexto: Contexto): Promise<InscripcionCargada[]> {
  const { prisma } = contexto;
  const roles = new Map((await prisma.roles.findMany()).map(({ codigo, id_rol }) => [codigo, id_rol]));
  const tutores = new Map<string, { id_usuario: number; nombre: string }>();
  for (const { fecha_nacimiento, ...tutor } of TUTORES) {
    const usuario = await prisma.usuarios.create({
      data: { ...tutor, fecha_nacimiento: new Date(fecha_nacimiento), estado: "INACTIVO" },
    });
    tutores.set(tutor.dni, { id_usuario: usuario.id_usuario, nombre: `${tutor.nombre} ${tutor.apellido}` });
  }

  const cargadas: InscripcionCargada[] = [];
  // Primero los adultos: un alumno que también es tutor tiene que existir antes que sus menores.
  const ordenados = [...ALUMNOS, ...alumnosHistoricos(contexto.hoy)].sort(
    (a, b) => Number(Boolean(a.dniTutor)) - Number(Boolean(b.dniTutor)),
  );
  for (const alumno of ordenados) {
    cargadas.push(...(await cargarAlumno(contexto, alumno, tutores, roles)));
  }
  verificarCupos(contexto, cargadas);
  return cargadas;
}

async function cargarAlumno(
  contexto: Contexto,
  alumno: AlumnoDelElenco,
  tutores: Map<string, { id_usuario: number; nombre: string }>,
  roles: Map<string, number>,
): Promise<InscripcionCargada[]> {
  const { prisma, hoy } = contexto;
  const azar = crearAzar(alumno.dni);
  const historias = alumno.inscripciones.map((inscripcion) => planear(contexto, inscripcion, azar));
  const activas = historias.filter(({ inscripcion }) => !inscripcion.preinscripta);
  const todasDeBaja = activas.length > 0 && activas.every(({ inscripcion }) => inscripcion.baja);
  const estado = activas.length === 0 ? "INACTIVO" : todasDeBaja ? "BAJA" : "ACTIVO";
  const altaDelAlumno = historias.reduce((minimo, { alta }) => (alta < minimo ? alta : minimo), hoy);
  const baja = todasDeBaja
    ? sumarDias(hoy, -Math.min(...activas.map(({ inscripcion }) => inscripcion.baja?.haceDias ?? 0)))
    : null;

  const usuario = await prisma.usuarios.create({
    data: {
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
      email: alumno.email,
      telefono: alumno.telefono,
      direccion: alumno.direccion,
      fecha_nacimiento: new Date(alumno.fecha_nacimiento),
      estado: estado === "ACTIVO" ? "ACTIVO" : "INACTIVO",
      fecha_alta: instante(altaDelAlumno, "10:00"),
    },
  });
  const tutor = alumno.dniTutor ? (tutores.get(alumno.dniTutor) ?? null) : null;
  const creado = await prisma.alumnos.create({
    data: {
      id_usuario: usuario.id_usuario,
      id_usuario_responsable: tutor?.id_usuario ?? null,
      cont_emerg_nombre: alumno.contacto[0],
      cont_emerg_telefono: alumno.contacto[1],
      apto_medico: alumno.aptoMedico ?? false,
      fecha_apto_medico: alumno.aptoMedico ? sumarDias(altaDelAlumno, -10) : null,
      observaciones: alumno.observaciones ?? null,
      estado,
      fecha_alta: instante(altaDelAlumno, "10:00"),
      fecha_baja: baja && instante(baja, "19:30"),
    },
  });
  if (alumno.email)
    tutores.set(alumno.dni, {
      id_usuario: usuario.id_usuario,
      nombre: `${alumno.nombre} ${alumno.apellido}`,
    });

  if (activas.length > 0) {
    await prisma.usuario_roles.create({
      data: {
        id_usuario: usuario.id_usuario,
        id_rol: roles.get("ALUMNO") as number,
        fecha_asignacion: instante(altaDelAlumno, "10:00"),
      },
    });
    if (tutor) await activarTutor(prisma, tutor.id_usuario, roles.get("TUTOR") as number, altaDelAlumno);
  }

  // Quien paga: el propio alumno o, si es menor, su tutor.
  const pagador = tutor ?? { id_usuario: usuario.id_usuario, nombre: `${alumno.nombre} ${alumno.apellido}` };
  const cargadas: InscripcionCargada[] = [];
  for (const historia of historias) {
    cargadas.push(await cargarInscripcion(contexto, alumno, creado.id_alumno, historia, pagador, azar));
  }
  return cargadas;
}

// El primer pago del menor da de alta a su tutor y le da el rol (US-07); si ya lo tenía, queda igual.
async function activarTutor(
  prisma: PrismaClient,
  idUsuario: number,
  idRol: number,
  desde: Date,
): Promise<void> {
  await prisma.usuarios.update({ where: { id_usuario: idUsuario }, data: { estado: "ACTIVO" } });
  await prisma.usuario_roles.createMany({
    data: [{ id_usuario: idUsuario, id_rol: idRol, fecha_asignacion: instante(desde, "10:00") }],
    skipDuplicates: true,
  });
}

interface InscripcionPlaneada {
  inscripcion: InscripcionDelElenco;
  inicio: Date;
  // Cuándo se cargó: el inicio, o el día de la pre-inscripción.
  alta: Date;
  pagos: PagoPlaneado[];
  horarios: HorarioCargado[];
}

function planear(contexto: Contexto, inscripcion: InscripcionDelElenco, azar: Azar): InscripcionPlaneada {
  const { hoy } = contexto;
  const horarios = horariosDe(contexto, inscripcion);
  if (inscripcion.preinscripta) {
    return {
      inscripcion,
      inicio: hoy,
      alta: sumarDias(hoy, -inscripcion.inicioHaceDias),
      pagos: [],
      horarios,
    };
  }
  const limite = inscripcion.baja ? sumarDias(hoy, -inscripcion.baja.haceDias) : null;
  const pedido = sumarDias(hoy, -inscripcion.inicioHaceDias);
  // La primera clase cae en uno de sus días: se arranca el día de cursada más cercano.
  const { inicio, pagos } = planearPagos(
    alPrimerDiaDeCursada(pedido, horarios),
    hoy,
    inscripcion.pago,
    azar,
    limite,
  );
  return { inscripcion, inicio, alta: inicio, pagos, horarios };
}

function alPrimerDiaDeCursada(dia: Date, horarios: HorarioCargado[]): Date {
  let candidato = dia;
  while (!horarios.some(({ dia: diaDelHorario }) => diaDelHorario === diaDeLaSemana(candidato))) {
    candidato = sumarDias(candidato, 1);
  }
  return candidato;
}

function horariosDe(contexto: Contexto, inscripcion: InscripcionDelElenco): HorarioCargado[] {
  const plan = contexto.planes.get(inscripcion.plan);
  if (!plan) throw new Error(`El plan "${inscripcion.plan}" no existe en el elenco`);
  const candidatos = contexto.horarios.filter(
    (horario) =>
      horario.codigoActividad === inscripcion.actividad &&
      horario.hora === inscripcion.hora &&
      (!inscripcion.dias || inscripcion.dias.includes(horario.dia)),
  );
  const cantidad = plan.definicion.clases_por_semana ?? candidatos.length;
  const elegidos = candidatos.slice(0, cantidad);
  if (elegidos.length !== cantidad || new Set(elegidos.map(({ id_profesora }) => id_profesora)).size !== 1) {
    throw new Error(
      `${inscripcion.actividad} ${inscripcion.hora}: no hay ${cantidad} horarios de una misma profesora`,
    );
  }
  return elegidos;
}

function precioEn(contexto: Contexto, nombrePlan: string, dia: Date): PrecioCargado {
  const plan = contexto.planes.get(nombrePlan);
  const precio = plan?.precios.find(({ desde, hasta }) => desde <= dia && (hasta === null || dia <= hasta));
  if (!precio) throw new Error(`El plan "${nombrePlan}" no tiene precio el ${dia.toISOString()}`);
  return precio;
}

// Mismo cálculo que PlanService.precioACobrar: el precio vigente ese día, con el descuento si la
// promoción está vigente y alcanza al plan.
function montoEn(contexto: Contexto, nombrePlan: string, dia: Date, conPromocion: boolean): number {
  const { precio } = precioEn(contexto, nombrePlan, dia);
  const promo = contexto.promoAmigas;
  const idPlan = contexto.planes.get(nombrePlan)?.id_plan as number;
  const vigente = conPromocion && promo.planes.has(idPlan) && promo.desde <= dia && dia <= promo.hasta;
  return vigente ? Math.round(precio * (100 - promo.porcentaje)) / 100 : precio;
}

async function cargarInscripcion(
  contexto: Contexto,
  alumno: AlumnoDelElenco,
  idAlumno: number,
  { inscripcion, inicio, alta, pagos, horarios }: InscripcionPlaneada,
  pagador: { id_usuario: number; nombre: string },
  azar: Azar,
): Promise<InscripcionCargada> {
  const { prisma, hoy } = contexto;
  const plan = contexto.planes.get(inscripcion.plan);
  const emailProfesora = PROFESORAS.find(
    ({ email }) => contexto.idProfesora.get(email) === horarios[0].id_profesora,
  )?.email as string;
  const baja = inscripcion.baja ? sumarDias(hoy, -inscripcion.baja.haceDias) : null;

  const creada = await prisma.inscripciones.create({
    data: {
      id_alumno: idAlumno,
      id_plan: plan?.id_plan as number,
      id_plan_precio: precioEn(contexto, inscripcion.plan, inicio).id_plan_precio,
      id_profesora: horarios[0].id_profesora,
      id_promocion: inscripcion.promocion ? contexto.promoAmigas.id_promocion : null,
      sin_cargo: false,
      fecha_inicio: inicio,
      estado: inscripcion.preinscripta ? "PREINSCRIPTA" : baja ? "BAJA" : "ACTIVA",
      motivo_baja: inscripcion.baja?.motivo ?? null,
      // El DER guarda el detalle solo con motivo OTRO; con los demás queda en las observaciones.
      detalle_baja: inscripcion.baja?.motivo === "OTRO" ? inscripcion.baja.detalle : null,
      observaciones: inscripcion.baja && inscripcion.baja.motivo !== "OTRO" ? inscripcion.baja.detalle : null,
      fecha_alta: instante(alta, "11:30", enteroAlAzar(azar, 0, 300)),
      fecha_baja: baja && instante(baja, "19:30"),
      horarios: {
        create: horarios.map(({ id_horario }) => ({ id_horario, fecha_desde: inicio, fecha_hasta: baja })),
      },
    },
  });

  for (const [indice, pago] of pagos.entries()) {
    await cargarCuota(contexto, creada.id_inscripcion, indice + 1, pago, {
      inscripcion,
      emailProfesora,
      pagador,
      azar,
      esElAlta: indice === 0,
    });
  }

  return {
    id_inscripcion: creada.id_inscripcion,
    id_alumno: idAlumno,
    alumno,
    idsHorarios: horarios.map(({ id_horario }) => id_horario),
    desde: inicio,
    hasta: baja,
    preinscripta: Boolean(inscripcion.preinscripta),
    definicion: inscripcion,
    id_profesora: horarios[0].id_profesora,
    emailProfesora,
  };
}

interface DatosDelCobro {
  inscripcion: InscripcionDelElenco;
  emailProfesora: string;
  pagador: { id_usuario: number; nombre: string };
  azar: Azar;
  // El primer pago lo cobra el centro: el alumno todavía no puede entrar al sistema para informarlo.
  esElAlta: boolean;
}

async function cargarCuota(
  contexto: Contexto,
  idInscripcion: number,
  numero: number,
  pago: PagoPlaneado,
  datos: DatosDelCobro,
): Promise<void> {
  const diaDelCobro = pago.tipo === "rechazado_y_efectivo" ? sumarDias(pago.dia, 1) : pago.dia;
  const monto = montoEn(contexto, datos.inscripcion.plan, diaDelCobro, Boolean(datos.inscripcion.promocion));
  const pagos = pagosDeLaCuota(contexto, pago, diaDelCobro, monto, datos);
  // La cuota se genera al cobrarla (CuotaService): nace con su primer pago.
  await contexto.prisma.cuotas.create({
    data: {
      id_inscripcion: idInscripcion,
      numero_cuota: numero,
      fecha_generacion: pagos[0].fecha_pago,
      fecha_vencimiento: pago.vencimiento,
      monto,
      pagos: { create: pagos },
    },
  });
}

type PagoACargar = Omit<Prisma.pagosCreateManyInput, "id_cuota">;

function pagosDeLaCuota(
  contexto: Contexto,
  pago: PagoPlaneado,
  diaDelCobro: Date,
  monto: number,
  datos: DatosDelCobro,
): PagoACargar[] {
  if (pago.tipo === "rechazado_y_efectivo") {
    return [
      transferencia(contexto, monto, pago.dia, datos, "RECHAZADO"),
      efectivo(contexto, monto, diaDelCobro, datos),
    ];
  }
  if (pago.tipo === "pendiente") return [transferencia(contexto, monto, pago.dia, datos, "PENDIENTE")];
  if (datos.inscripcion.forma === "transferencia") {
    return [transferencia(contexto, monto, pago.dia, datos, "CONFIRMADO")];
  }
  return [efectivo(contexto, monto, pago.dia, datos)];
}

// Un pago de hoy se registró hace un rato: nunca queda en el futuro.
function momentoDelPago(contexto: Contexto, dia: Date, azar: Azar): Date {
  const momento = instante(
    dia,
    `${String(enteroAlAzar(azar, 9, 20)).padStart(2, "0")}:00`,
    enteroAlAzar(azar, 0, 59),
  );
  return momento < contexto.ahora
    ? momento
    : new Date(contexto.ahora.getTime() - enteroAlAzar(azar, 20, 90) * 60_000);
}

// El efectivo lo cobra la profesora a cargo y queda a rendir hasta la rendición siguiente. Lo que cobra
// la propietaria ya está en sus manos (PagoService.prepararEfectivo).
function efectivo(contexto: Contexto, monto: number, dia: Date, datos: DatosDelCobro): PagoACargar {
  const fecha = momentoDelPago(contexto, dia, datos.azar);
  const esDeLaPropietaria = datos.emailProfesora === MARINA;
  const idUsuario = contexto.usuarioDeProfesora.get(datos.emailProfesora) as number;
  const rendicion = esDeLaPropietaria
    ? null
    : (contexto.rendiciones.find((viernes) => viernes >= dia) ?? null);
  return {
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    monto,
    fecha_pago: fecha,
    id_usuario_registra: idUsuario,
    id_profesora_cobra: esDeLaPropietaria ? null : (contexto.idProfesora.get(datos.emailProfesora) as number),
    rendido: esDeLaPropietaria || rendicion !== null,
    fecha_rendicion: rendicion && instante(rendicion, "19:00"),
    id_usuario_confirma: idUsuario,
    fecha_confirmacion: fecha,
  };
}

// La primera la carga la propietaria cuando ve el ingreso; las siguientes las informa quien paga y la
// propietaria las revisa en el día (US-16, US-17).
function transferencia(
  contexto: Contexto,
  monto: number,
  dia: Date,
  datos: DatosDelCobro,
  estado: "CONFIRMADO" | "PENDIENTE" | "RECHAZADO",
): PagoACargar {
  const fecha = momentoDelPago(contexto, dia, datos.azar);
  const registra = datos.esElAlta ? contexto.idMarina : datos.pagador.id_usuario;
  const revisada = estado !== "PENDIENTE";
  const revision = datos.esElAlta
    ? fecha
    : new Date(fecha.getTime() + enteroAlAzar(datos.azar, 2, 9) * 3_600_000);
  return {
    forma_pago: "TRANSFERENCIA",
    estado,
    monto,
    fecha_pago: fecha,
    titular_cuenta_origen: datos.pagador.nombre,
    fecha_hora_transferencia: new Date(fecha.getTime() - enteroAlAzar(datos.azar, 5, 40) * 60_000),
    id_usuario_registra: registra,
    id_profesora_cobra: null,
    rendido: true,
    id_usuario_confirma: revisada ? contexto.idMarina : null,
    fecha_confirmacion: revisada ? (revision < contexto.ahora ? revision : contexto.ahora) : null,
    motivo_rechazo: estado === "RECHAZADO" ? "No figura el ingreso en la cuenta del centro" : null,
  };
}

function verificarCupos(contexto: Contexto, inscripciones: InscripcionCargada[]): void {
  const cupoDeActividad = new Map(ACTIVIDADES.map(({ codigo, cupo_maximo }) => [codigo, cupo_maximo]));
  for (const horario of contexto.horarios) {
    const vigentes = inscripciones.filter(
      ({ idsHorarios, hasta }) => hasta === null && idsHorarios.includes(horario.id_horario),
    ).length;
    const propio = horario.codigoActividad === "TRAINING" && horario.dia === 5 ? CUPO_TRAINING_VIERNES : null;
    const cupo = propio ?? (cupoDeActividad.get(horario.codigoActividad) as number);
    if (vigentes > cupo) {
      throw new Error(
        `${horario.codigoActividad} ${horario.hora} (día ${horario.dia}) supera el cupo: ${vigentes}/${cupo}`,
      );
    }
  }
}

// US-14: el cambio se aplica al terminar la gracia de la cuota vigente.
async function cargarCambioDePlan(contexto: Contexto, inscripciones: InscripcionCargada[]): Promise<void> {
  const { prisma } = contexto;
  const actual = inscripciones.find(({ alumno }) => alumno.dni === CAMBIO_DE_PLAN_PROGRAMADO.dniAlumno);
  if (!actual) throw new Error("Falta el alumno del cambio de plan programado");
  const ultima = await prisma.cuotas.findFirstOrThrow({
    where: { id_inscripcion: actual.id_inscripcion },
    orderBy: { numero_cuota: "desc" },
  });
  const plan = contexto.planes.get(CAMBIO_DE_PLAN_PROGRAMADO.plan);
  const horarios = horariosDe(contexto, {
    ...actual.definicion,
    ...CAMBIO_DE_PLAN_PROGRAMADO,
    dias: undefined,
  });
  await prisma.cambios_plan_programados.create({
    data: {
      id_inscripcion: actual.id_inscripcion,
      id_plan: plan?.id_plan as number,
      id_profesora: horarios[0].id_profesora,
      fecha_aplicacion: sumarDias(ultima.fecha_vencimiento, (plan?.definicion.dias_gracia ?? 0) + 1),
      fecha_alta: instante(sumarDias(contexto.hoy, -3), "18:40"),
      horarios: { create: horarios.map(({ id_horario }) => ({ id_horario })) },
    },
  });
}

// Desde el primer día de hace dos meses: alcanza para los dos meses que cierran las insignias.
function inicioDeLasClases(hoy: Date): Date {
  return primerDiaDelMes(hoy, -2);
}

async function cargarClases(contexto: Contexto, inscripciones: InscripcionCargada[]): Promise<void> {
  const { hoy } = contexto;
  const cursando = inscripciones.filter(({ preinscripta }) => !preinscripta);
  const ultimasClases = ultimasClasesDeCadaInscripcion(contexto, cursando);
  const azar = crearAzar("asistencia");

  for (let dia = inicioDeLasClases(hoy); dia < hoy; dia = sumarDias(dia, 1)) {
    for (const horario of contexto.horarios.filter(
      ({ dia: diaDelHorario }) => diaDelHorario === diaDeLaSemana(dia),
    )) {
      const inscriptos = cursando.filter(
        (inscripcion) =>
          inscripcion.idsHorarios.includes(horario.id_horario) &&
          inscripcion.desde <= dia &&
          (inscripcion.hasta === null || dia < inscripcion.hasta),
      );
      if (inscriptos.length === 0) continue;
      await cargarClase(contexto, horario, dia, inscriptos, ultimasClases, azar);
    }
  }
}

// Las últimas cuatro clases de quien dejó de venir: faltó a todas (US-22).
function ultimasClasesDeCadaInscripcion(
  contexto: Contexto,
  inscripciones: InscripcionCargada[],
): Map<number, Set<number>> {
  const resultado = new Map<number, Set<number>>();
  for (const inscripcion of inscripciones.filter(({ alumno }) => alumno.dejoDeVenir)) {
    const dias = new Set(
      contexto.horarios
        .filter(({ id_horario }) => inscripcion.idsHorarios.includes(id_horario))
        .map(({ dia }) => dia),
    );
    const fechas: number[] = [];
    for (let dia = sumarDias(contexto.hoy, -1); fechas.length < 4; dia = sumarDias(dia, -1)) {
      if (dias.has(diaDeLaSemana(dia))) fechas.push(dia.getTime());
    }
    resultado.set(inscripcion.id_inscripcion, new Set(fechas));
  }
  return resultado;
}

async function cargarClase(
  contexto: Contexto,
  horario: HorarioCargado,
  dia: Date,
  inscriptos: InscripcionCargada[],
  ultimasClases: Map<number, Set<number>>,
  azar: Azar,
): Promise<void> {
  const { prisma, hoy } = contexto;
  const cancelacion = CANCELACIONES.find(
    ({ haceDias, codigoActividad }) =>
      codigoActividad === horario.codigoActividad &&
      diaMasCercano(hoy, haceDias, horario.dia).getTime() === dia.getTime(),
  );
  const titular = PROFESORAS.find(({ email }) => contexto.idProfesora.get(email) === horario.id_profesora)
    ?.email as string;
  const suplencia = SUPLENCIAS.find(
    ({ haceDias, ausente }) =>
      ausente === titular && diaMasCercano(hoy, haceDias, horario.dia, true).getTime() === dia.getTime(),
  );
  const dictante = suplencia ? suplencia.suplente : titular;
  const fin = instante(dia, unaHoraDespues(horario.hora));

  const clase = await prisma.clases.create({
    data: {
      id_horario: horario.id_horario,
      fecha_clase: dia,
      id_prof_dictante: contexto.idProfesora.get(dictante) as number,
      estado: cancelacion ? "CANCELADA" : "DICTADA",
      fecha_cierre_asist: cancelacion ? null : fin,
      observaciones: cancelacion?.motivo ?? null,
    },
  });
  if (cancelacion) return;

  if (suplencia) {
    await prisma.suplencias.create({
      data: {
        id_clase: clase.id_clase,
        id_prof_ausente: horario.id_profesora,
        motivo: suplencia.motivo,
        fecha_registro: instante(sumarDias(dia, -1), "20:00"),
        id_usuario_registra: contexto.idMarina,
      },
    });
  }

  const registra = contexto.usuarioDeProfesora.get(dictante) as number;
  await prisma.asistencias.createMany({
    data: inscriptos.map((inscripcion) => ({
      id_clase: clase.id_clase,
      id_alumno: inscripcion.id_alumno,
      id_inscripcion: inscripcion.id_inscripcion,
      asistio: asistio(inscripcion, dia, ultimasClases, azar),
      fecha_registro: instante(dia, horario.hora, enteroAlAzar(azar, 3, 15)),
      id_usuario_registra: registra,
    })),
  });
}

function asistio(
  inscripcion: InscripcionCargada,
  dia: Date,
  ultimasClases: Map<number, Set<number>>,
  azar: Azar,
): boolean {
  if (ultimasClases.get(inscripcion.id_inscripcion)?.has(dia.getTime())) return false;
  return azar() < inscripcion.alumno.asistencia;
}

// El día de ese horario más cercano a "hace tantos días". Con todaLaJornada, el mismo día para todas
// las clases de la titular, sin importar el horario.
function diaMasCercano(hoy: Date, haceDias: number, diaDelHorario: number, todaLaJornada = false): Date {
  let dia = sumarDias(hoy, -haceDias);
  while (diaDeLaSemana(dia) > 5) dia = sumarDias(dia, -1);
  if (todaLaJornada) return dia;
  while (diaDeLaSemana(dia) !== diaDelHorario) dia = sumarDias(dia, -1);
  return dia;
}

// US-22: la propietaria ya contactó a uno de los que dejaron de venir; los otros siguen sin gestionar.
async function cargarSeguimientos(contexto: Contexto, inscripciones: InscripcionCargada[]): Promise<void> {
  const contactado = inscripciones.find(({ alumno }) => alumno.dni === "39888333");
  if (!contactado) return;
  await contexto.prisma.seguimientos_inactividad.create({
    data: {
      id_inscripcion: contactado.id_inscripcion,
      estado: "CONTACTADO",
      fecha_registro: new Date(contexto.ahora.getTime() - 26 * 3_600_000),
      id_usuario_registra: contexto.idMarina,
    },
  });
}

// Los meses ya terminados se cierran como lo hace la API: honorarios desde el día de cierre (los dos
// más viejos ya pagados) e insignias desde el día 1. Los avisos de cuota, con el día de hoy.
async function correrLosProcesos(
  prisma: PrismaClient,
  procesos: ProcesosDeLaPresentacion,
  hoy: Date,
): Promise<void> {
  for (const mesesAtras of [2, 1, 0]) {
    const diaDeCierre = sumarDias(primerDiaDelMes(hoy, -mesesAtras), DIA_CIERRE_HONORARIOS - 1);
    if (diaDeCierre <= hoy)
      await procesos.cierreMensualHonorarios.cerrarMesAnterior(instante(diaDeCierre, "12:00"));
  }
  await prisma.liquidaciones.updateMany({
    where: { estado: "CERRADA", periodo_hasta: { lt: primerDiaDelMes(hoy, -1) } },
    data: { estado: "PAGADA" },
  });
  for (const mesesAtras of [1, 0]) {
    await procesos.cierreMensualInsignias.cerrarMesAnterior(
      instante(primerDiaDelMes(hoy, -mesesAtras), "12:00"),
    );
  }
  await generarAvisosDelMes(prisma, procesos, hoy);
}

// El planificador corre una vez por día y guarda los avisos con la hora en que corre: se lo corre por
// cada día del último mes y cada aviso queda con la fecha de su día. Los de hace más de un día ya se
// leyeron.
async function generarAvisosDelMes(
  prisma: PrismaClient,
  procesos: ProcesosDeLaPresentacion,
  hoy: Date,
): Promise<void> {
  for (let atras = 30; atras >= 0; atras--) {
    const dia = sumarDias(hoy, -atras);
    const momento = instante(dia, "08:00");
    const antes = await prisma.notificaciones.aggregate({ _max: { id_notificacion: true } });
    await procesos.planificadorNotificaciones.generarAvisosDelDia(momento);
    await prisma.notificaciones.updateMany({
      where: { id_notificacion: { gt: antes._max.id_notificacion ?? 0 } },
      data: { fecha_generacion: momento, fecha_envio: momento, leida: atras > 1 },
    });
  }
}

async function resumir(prisma: PrismaClient): Promise<ResumenPresentacion> {
  const [
    profesoras,
    alumnos,
    inscripciones,
    cuotas,
    pagos,
    clases,
    asistencias,
    liquidaciones,
    insignias,
    avisos,
  ] = await Promise.all([
    prisma.profesoras.count(),
    prisma.alumnos.count(),
    prisma.inscripciones.count(),
    prisma.cuotas.count(),
    prisma.pagos.count(),
    prisma.clases.count(),
    prisma.asistencias.count(),
    prisma.liquidaciones.count(),
    prisma.alumno_insignias.count(),
    prisma.notificaciones.count(),
  ]);
  return {
    profesoras,
    alumnos,
    inscripciones,
    cuotas,
    pagos,
    clases,
    asistencias,
    liquidaciones,
    insignias,
    avisos,
  };
}
