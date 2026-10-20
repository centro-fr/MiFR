import type { PrismaClient } from "@prisma/client";
import { GestionNotificacionesService } from "./modules/gestion-notificaciones/gestion-notificaciones.service.js";
import { NotificacionRepository } from "./modules/gestion-notificaciones/notificacion/notificacion.repository.js";
import { NotificacionService } from "./modules/gestion-notificaciones/notificacion/notificacion.service.js";
import { PlanificadorNotificacionesService } from "./modules/gestion-notificaciones/planificador-notificaciones/planificador-notificaciones.service.js";
import { DetectorInactividadService } from "./modules/reportes/detector-inactividad/detector-inactividad.service.js";
import { GeneradorInformesService } from "./modules/reportes/generador-informes/generador-informes.service.js";
import { ReportesService } from "./modules/reportes/reportes.service.js";
import { ResumenDiarioPropietariaService } from "./modules/gestion-notificaciones/resumen-diario-propietaria/resumen-diario-propietaria.service.js";
import type { AppDependencies } from "./app.js";
import { GestionUsuariosService } from "./modules/gestion-usuarios/gestion-usuarios.service.js";
import type { IAutenticacionGoogleAuth } from "./modules/gestion-usuarios/sesion/interface/i-autenticacion-google-auth.js";
import type { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { SesionService } from "./modules/gestion-usuarios/sesion/sesion.service.js";
import { RolRepository } from "./modules/gestion-usuarios/rol/rol.repository.js";
import { RolService } from "./modules/gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "./modules/gestion-usuarios/usuario/usuario.repository.js";
import { UsuarioService } from "./modules/gestion-usuarios/usuario/usuario.service.js";
import { ActividadRepository } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.repository.js";
import { ActividadService } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.service.js";
import { GestionServicioEntrenamientoService } from "./modules/gestion-servicio-entrenamiento/gestion-servicio-entrenamiento.service.js";
import { GestionHonorariosService } from "./modules/gestion-honorarios/gestion-honorarios.service.js";
import { TarifaHonorarioRepository } from "./modules/gestion-honorarios/tarifa-honorario/tarifa-honorario.repository.js";
import { TarifaHonorarioService } from "./modules/gestion-honorarios/tarifa-honorario/tarifa-honorario.service.js";
import { ProfesorRepository } from "./modules/gestion-personas/profesor/profesor.repository.js";
import { ProfesorService } from "./modules/gestion-personas/profesor/profesor.service.js";
import { GestionPersonasService } from "./modules/gestion-personas/gestion-personas.service.js";
import { AlumnoRepository } from "./modules/gestion-personas/alumno/alumno.repository.js";
import { AlumnoService } from "./modules/gestion-personas/alumno/alumno.service.js";
import { HorarioRepository } from "./modules/gestion-servicio-entrenamiento/horario/horario.repository.js";
import { HorarioService } from "./modules/gestion-servicio-entrenamiento/horario/horario.service.js";
import { PlanRepository } from "./modules/gestion-servicio-entrenamiento/plan/plan.repository.js";
import { ParametrosSistemaRepository } from "./modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.repository.js";
import { ParametrosSistemaService } from "./modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.service.js";
import { PlanService } from "./modules/gestion-servicio-entrenamiento/plan/plan.service.js";
import { PromocionRepository } from "./modules/gestion-servicio-entrenamiento/promocion/promocion.repository.js";
import { PromocionService } from "./modules/gestion-servicio-entrenamiento/promocion/promocion.service.js";
import { InscripcionRepository } from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.repository.js";
import { InscripcionService } from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.service.js";
import { RegistroProgresoRepository } from "./modules/gestion-rutinas-y-progreso/registro-progreso/registro-progreso.repository.js";
import { RegistroProgresoService } from "./modules/gestion-rutinas-y-progreso/registro-progreso/registro-progreso.service.js";
import { UnidadDeTrabajoPrisma } from "./shared/db/transaccion.js";
import { GestionInscripcionesYClasesService } from "./modules/gestion-inscripciones-y-clases/gestion-inscripciones-y-clases.service.js";
import { CalculadorHabilitacion } from "./modules/calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.js";
import { CalculadorVencimientoCuota } from "./modules/calculos-del-negocio/calculador-vencimiento-cuota/calculador-vencimiento-cuota.js";
import { CuotaRepository } from "./modules/gestion-cuotas-y-pagos/cuota/cuota.repository.js";
import { CuotaService } from "./modules/gestion-cuotas-y-pagos/cuota/cuota.service.js";
import { GestionCuotasYPagosService } from "./modules/gestion-cuotas-y-pagos/gestion-cuotas-y-pagos.service.js";
import { PagoRepository } from "./modules/gestion-cuotas-y-pagos/pago/pago.repository.js";
import { PagoService } from "./modules/gestion-cuotas-y-pagos/pago/pago.service.js";
import { DifusionPublicaService } from "./modules/difusion-publica/difusion-publica.service.js";
import { PanelDisponibilidadService } from "./modules/difusion-publica/panel-disponibilidad/panel-disponibilidad.service.js";
import type { IInfoInscripciones } from "./modules/gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoClases } from "./modules/gestion-inscripciones-y-clases/clase/interface/i-info-clases.js";
import { ClaseRepository } from "./modules/gestion-inscripciones-y-clases/clase/clase.repository.js";
import { ClaseService } from "./modules/gestion-inscripciones-y-clases/clase/clase.service.js";
import { AsistenciaRepository } from "./modules/gestion-inscripciones-y-clases/asistencia/asistencia.repository.js";
import { AsistenciaService } from "./modules/gestion-inscripciones-y-clases/asistencia/asistencia.service.js";
import { CierreAsistenciaService } from "./modules/gestion-inscripciones-y-clases/cierre-asistencia/cierre-asistencia.service.js";
import { SuplenciaRepository } from "./modules/gestion-inscripciones-y-clases/suplencia/suplencia.repository.js";
import { SuplenciaService } from "./modules/gestion-inscripciones-y-clases/suplencia/suplencia.service.js";
import { CalculadorHonorarios } from "./modules/calculos-del-negocio/calculador-honorarios/calculador-honorarios.js";
import { LiquidacionRepository } from "./modules/gestion-honorarios/liquidacion/liquidacion.repository.js";
import { LiquidacionService } from "./modules/gestion-honorarios/liquidacion/liquidacion.service.js";

export interface PiezasDeInfraestructura {
  prisma: PrismaClient;
  googleAuth: IAutenticacionGoogleAuth;
  jwtService: JwtService;
}

// Lo que arma el composition root: las dependencias de la API; IInfoInscripciones, con la que los
// tests de integración dan el alta definitiva sin pasar por un cobro; y los dos procesos que index.ts
// corre con un intervalo y los tests con la hora que necesitan: el cierre automático de la asistencia
// (US-21) y los avisos de cuota (US-25).
export interface Sistema {
  dependencias: AppDependencies;
  infoInscripciones: IInfoInscripciones;
  infoClases: IInfoClases;
  cierreAsistencia: CierreAsistenciaService;
  planificadorNotificaciones: PlanificadorNotificacionesService;
  resumenDiario: ResumenDiarioPropietariaService;
}

// Parte del composition root: arma el grafo de componentes sobre las piezas de infraestructura
// que recibe. Está separado de index.ts, que lee el entorno y levanta el servidor, para que los
// tests de integración usen este mismo cableado con una base de prueba y Google simulado.
export function construirDependencias(piezas: PiezasDeInfraestructura): AppDependencies {
  return construirSistema(piezas).dependencias;
}

export function construirSistema({ prisma, googleAuth, jwtService }: PiezasDeInfraestructura): Sistema {
  const rolService = new RolService(new RolRepository(prisma));
  const usuarioService = new UsuarioService(new UsuarioRepository(prisma), rolService);
  const autenticacion = new SesionService(usuarioService, googleAuth, jwtService, rolService);
  const gestionUsuarios = new GestionUsuariosService(usuarioService, autenticacion, rolService);

  const actividadService = new ActividadService(new ActividadRepository(prisma));
  const profesorService = new ProfesorService(new ProfesorRepository(prisma), usuarioService, rolService);
  const horarioService = new HorarioService(new HorarioRepository(prisma), actividadService, profesorService);
  const promocionService = new PromocionService(new PromocionRepository(prisma));
  const planService = new PlanService(new PlanRepository(prisma), actividadService, promocionService);
  const parametrosService = new ParametrosSistemaService(new ParametrosSistemaRepository(prisma));
  const alumnoService = new AlumnoService(new AlumnoRepository(prisma), usuarioService, rolService);
  const unidadDeTrabajo = new UnidadDeTrabajoPrisma(prisma);
  const inscripcionService = new InscripcionService(
    new InscripcionRepository(prisma),
    alumnoService,
    planService,
    horarioService,
    profesorService,
    new RegistroProgresoService(new RegistroProgresoRepository(prisma)),
    parametrosService,
    unidadDeTrabajo,
  );
  const gestionServicioEntrenamiento = new GestionServicioEntrenamientoService(
    actividadService,
    horarioService,
    planService,
    parametrosService,
    inscripcionService,
    promocionService,
  );
  const cuotaService = new CuotaService(
    new CuotaRepository(prisma),
    inscripcionService,
    planService,
    new CalculadorVencimientoCuota(),
    new CalculadorHabilitacion(),
    parametrosService,
  );
  const pagoService = new PagoService(new PagoRepository(prisma), profesorService);
  const gestionCuotasYPagos = new GestionCuotasYPagosService(cuotaService, pagoService, unidadDeTrabajo);
  const claseService = new ClaseService(new ClaseRepository(prisma), horarioService, profesorService);
  const asistenciaService = new AsistenciaService(
    new AsistenciaRepository(prisma),
    claseService,
    inscripcionService,
    unidadDeTrabajo,
  );
  const cierreAsistencia = new CierreAsistenciaService(
    claseService,
    asistenciaService,
    parametrosService,
    unidadDeTrabajo,
  );
  const gestionInscripcionesYClases = new GestionInscripcionesYClasesService(
    inscripcionService,
    cuotaService,
    claseService,
    asistenciaService,
    cierreAsistencia,
    unidadDeTrabajo,
    new SuplenciaService(new SuplenciaRepository(prisma), claseService, profesorService, unidadDeTrabajo),
  );
  const notificacionService = new NotificacionService(new NotificacionRepository(prisma));
  const planificadorNotificaciones = new PlanificadorNotificacionesService(
    cuotaService,
    parametrosService,
    notificacionService,
  );
  const gestionPersonas = new GestionPersonasService(
    profesorService,
    horarioService,
    alumnoService,
    inscripcionService,
    cuotaService,
  );

  const resumenDiario = new ResumenDiarioPropietariaService(
    pagoService,
    cuotaService,
    parametrosService,
    usuarioService,
    notificacionService,
  );

  const tarifaHonorarioService = new TarifaHonorarioService(
    new TarifaHonorarioRepository(prisma),
    profesorService,
    planService,
  );
  const liquidacionService = new LiquidacionService(
    new LiquidacionRepository(prisma),
    tarifaHonorarioService,
    new CalculadorHonorarios(),
    inscripcionService,
    claseService,
    cuotaService,
    profesorService,
  );
  const gestionHonorarios = new GestionHonorariosService(tarifaHonorarioService, liquidacionService);
  return {
    dependencias: {
      gestionUsuarios,
      gestionPersonas,
      gestionServicioEntrenamiento,
      gestionInscripcionesYClases,
      gestionCuotasYPagos,
      gestionNotificaciones: new GestionNotificacionesService(
        resumenDiario,
        notificacionService,
        planificadorNotificaciones,
      ),
      reportes: new ReportesService(
        new DetectorInactividadService(
          inscripcionService,
          asistenciaService,
          cuotaService,
          alumnoService,
          parametrosService,
        ),
        new GeneradorInformesService(
          cuotaService,
          pagoService,
          planService,
          inscripcionService,
          alumnoService,
        ),
      ),
      gestionHonorarios,
      difusionPublica: new DifusionPublicaService(new PanelDisponibilidadService(horarioService)),
      autenticacion,
      autorizacion: rolService,
    },
    infoInscripciones: inscripcionService,
    infoClases: claseService,
    cierreAsistencia,
    planificadorNotificaciones,
    resumenDiario,
  };
}
