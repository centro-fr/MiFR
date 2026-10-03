import "dotenv/config";
import { createApp } from "./app.js";
import { GestionUsuariosService } from "./modules/gestion-usuarios/gestion-usuarios.service.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { SesionService } from "./modules/gestion-usuarios/sesion/sesion.service.js";
import { RolRepository } from "./modules/gestion-usuarios/rol/rol.repository.js";
import { RolService } from "./modules/gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "./modules/gestion-usuarios/usuario/user.repository.js";
import { UsuarioService } from "./modules/gestion-usuarios/usuario/user.service.js";

// Composition root: único lugar donde se instancian las clases concretas.
const usuarioRepositorio = new UsuarioRepository();
const rolService = new RolService(new RolRepository());
const usuarioService = new UsuarioService(usuarioRepositorio, rolService);

const googleAutenticacion = new GoogleAutenticacion(process.env.GOOGLE_CLIENT_ID as string);
const jwtService = new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN ?? "8h");
const autenticacion = new SesionService(usuarioRepositorio, googleAutenticacion, jwtService, rolService);

const gestionUsuarios = new GestionUsuariosService(usuarioService, autenticacion, rolService);

const app = createApp({ gestionUsuarios, autenticacion, autorizacion: rolService });

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
