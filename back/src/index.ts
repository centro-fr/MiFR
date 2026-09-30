import "dotenv/config";
import { createApp } from "./app.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { SesionService } from "./modules/gestion-usuarios/sesion/sesion.service.js";
import { PermisoRepository } from "./modules/gestion-usuarios/permiso/permiso.repository.js";
import { PermisoService } from "./modules/gestion-usuarios/permiso/permiso.service.js";
import { UsuarioRepository } from "./modules/gestion-usuarios/usuario/user.repository.js";
import { UsuarioService } from "./modules/gestion-usuarios/usuario/user.service.js";

// Composition root: único lugar donde se instancian las clases concretas.
const usuarioRepositorio = new UsuarioRepository();
const permisoService = new PermisoService(new PermisoRepository());
const usuarioService = new UsuarioService(usuarioRepositorio, permisoService);

const googleAutenticacion = new GoogleAutenticacion(process.env.GOOGLE_CLIENT_ID as string);
const jwtService = new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN ?? "8h");
const autenticacion = new SesionService(usuarioRepositorio, googleAutenticacion, jwtService);

const app = createApp({ usuarioService, autenticacion });

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
