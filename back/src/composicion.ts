import type { PrismaClient } from "@prisma/client";
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
import { ProfesorRepository } from "./modules/gestion-personas/profesor/profesor.repository.js";
import { ProfesorService } from "./modules/gestion-personas/profesor/profesor.service.js";
import { GestionPersonasService } from "./modules/gestion-personas/gestion-personas.service.js";
import { AlumnoRepository } from "./modules/gestion-personas/alumno/alumno.repository.js";
import { AlumnoService } from "./modules/gestion-personas/alumno/alumno.service.js";
import { HorarioRepository } from "./modules/gestion-servicio-entrenamiento/horario/horario.repository.js";
import { HorarioService } from "./modules/gestion-servicio-entrenamiento/horario/horario.service.js";
import { PlanRepository } from "./modules/gestion-servicio-entrenamiento/plan/plan.repository.js";
import { PlanService } from "./modules/gestion-servicio-entrenamiento/plan/plan.service.js";
import { InscripcionRepository } from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.repository.js";
import { InscripcionService } from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.service.js";
import { GestionInscripcionesYClasesService } from "./modules/gestion-inscripciones-y-clases/gestion-inscripciones-y-clases.service.js";

export interface PiezasDeInfraestructura {
  prisma: PrismaClient;
  googleAuth: IAutenticacionGoogleAuth;
  jwtService: JwtService;
}

// Parte del composition root: arma el grafo de componentes sobre las piezas de infraestructura
// que recibe. Está separado de index.ts, que lee el entorno y levanta el servidor, para que los
// tests de integración usen este mismo cableado con una base de prueba y Google simulado.
export function construirDependencias({
  prisma,
  googleAuth,
  jwtService,
}: PiezasDeInfraestructura): AppDependencies {
  const rolService = new RolService(new RolRepository(prisma));
  const usuarioService = new UsuarioService(new UsuarioRepository(prisma), rolService);
  const autenticacion = new SesionService(usuarioService, googleAuth, jwtService, rolService);
  const gestionUsuarios = new GestionUsuariosService(usuarioService, autenticacion, rolService);

  const actividadService = new ActividadService(new ActividadRepository(prisma));
  const profesorService = new ProfesorService(new ProfesorRepository(prisma), usuarioService, rolService);
  const horarioService = new HorarioService(new HorarioRepository(prisma), actividadService, profesorService);
  const planService = new PlanService(new PlanRepository(prisma), actividadService);
  const alumnoService = new AlumnoService(new AlumnoRepository(prisma), usuarioService, rolService);
  const inscripcionService = new InscripcionService(
    new InscripcionRepository(prisma),
    alumnoService,
    planService,
    horarioService,
    profesorService,
  );
  const gestionInscripcionesYClases = new GestionInscripcionesYClasesService(inscripcionService);
  const gestionServicioEntrenamiento = new GestionServicioEntrenamientoService(
    actividadService,
    horarioService,
    planService,
    gestionInscripcionesYClases,
  );
  const gestionPersonas = new GestionPersonasService(profesorService, horarioService, alumnoService);

  return {
    gestionUsuarios,
    gestionPersonas,
    gestionServicioEntrenamiento,
    gestionInscripcionesYClases,
    autenticacion,
    autorizacion: rolService,
  };
}
