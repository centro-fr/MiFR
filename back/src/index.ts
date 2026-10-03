import "dotenv/config";
import { createApp } from "./app.js";
import { GestionUsuariosService } from "./modules/gestion-usuarios/gestion-usuarios.service.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
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
import { HorarioRepository } from "./modules/gestion-servicio-entrenamiento/horario/horario.repository.js";
import { HorarioService } from "./modules/gestion-servicio-entrenamiento/horario/horario.service.js";
import { generarDocumentoOpenApi } from "./openapi.js";

// Composition root: único lugar donde se instancian las clases concretas.
const usuarioRepositorio = new UsuarioRepository();
const rolService = new RolService(new RolRepository());
const usuarioService = new UsuarioService(usuarioRepositorio, rolService);

const googleAutenticacion = new GoogleAutenticacion(process.env.GOOGLE_CLIENT_ID as string);
const jwtService = new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN ?? "8h");
const autenticacion = new SesionService(usuarioRepositorio, googleAutenticacion, jwtService, rolService);

const gestionUsuarios = new GestionUsuariosService(usuarioService, autenticacion, rolService);

const actividadRepository = new ActividadRepository();
const actividadService = new ActividadService(actividadRepository);
const profesorService = new ProfesorService(new ProfesorRepository(), usuarioService, rolService);
const horarioService = new HorarioService(new HorarioRepository(), actividadService, profesorService);
const gestionServicioEntrenamiento = new GestionServicioEntrenamientoService(
  actividadService,
  horarioService,
);
const gestionPersonas = new GestionPersonasService(profesorService, horarioService);

const esProduccion = process.env.NODE_ENV === "production";

const app = createApp(
  {
    gestionUsuarios,
    gestionPersonas,
    gestionServicioEntrenamiento,
    autenticacion,
    autorizacion: rolService,
  },
  { documentacionApi: esProduccion ? undefined : generarDocumentoOpenApi() },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
