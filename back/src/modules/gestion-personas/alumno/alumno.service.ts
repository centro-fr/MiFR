import {
  AlumnoExistenteError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type {
  AlumnoRepository,
  CambioDeTutor,
  DatosFichaAlumno,
  DatosUsuarioAlumno,
} from "./alumno.repository.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, TutorInput } from "./alumno.schemas.js";
import type { Alumno, FiltroAlumno, PaginaAlumnos, TutorResuelto } from "./alumno.types.js";
import type { IInfoAlumnos } from "./interface/i-info-alumnos.js";

// US-06: la edad de corte. Pasa a parametros_sistema cuando exista ese componente.
const MAYORIA_DE_EDAD = 18;

export function esMenorDeEdad(fechaNacimiento: Date, hoy: Date): boolean {
  const cumpleMayoria = new Date(
    Date.UTC(
      fechaNacimiento.getUTCFullYear() + MAYORIA_DE_EDAD,
      fechaNacimiento.getUTCMonth(),
      fechaNacimiento.getUTCDate(),
    ),
  );
  return cumpleMayoria > hoy;
}

function separarDatos(input: CrearAlumnoInput | ActualizarAlumnoInput): {
  usuario: DatosUsuarioAlumno;
  ficha: DatosFichaAlumno;
} {
  const {
    nombre,
    apellido,
    dni,
    email,
    telefono,
    fecha_nacimiento,
    direccion,
    tutor: _tutor,
    ...ficha
  } = input;
  return { usuario: { nombre, apellido, dni, email, telefono, fecha_nacimiento, direccion }, ficha };
}

// Componente "Alumno" de la vista arquitectónica (GestionPersonas). Los datos personales del alumno
// y de su tutor son filas de usuarios; acá se deciden las reglas de edad de US-05, US-06 y US-09.
// Un alumno pre-inscripto queda INACTIVO: lo "pendiente" se lee de su inscripción.
export class AlumnoService implements IInfoAlumnos {
  constructor(
    private readonly repositorio: AlumnoRepository,
    private readonly usuarios: IInfoUsuarios,
    private readonly autorizacion: IAutorizacion,
  ) {}

  async crear(input: CrearAlumnoInput): Promise<Alumno> {
    const menor = esMenorDeEdad(input.fecha_nacimiento, fechaActualArgentina());
    if (menor) {
      if (!input.tutor) throw new ValidationError("Un alumno menor de 18 años necesita un tutor");
      if (input.email) {
        throw new ValidationError("Un alumno menor de 18 años no lleva email: entra al sistema su tutor");
      }
    } else {
      if (input.tutor) throw new ValidationError("Un alumno mayor de edad no lleva tutor");
      if (!input.email) {
        throw new ValidationError("El email es obligatorio para un alumno mayor de edad: lo usa para entrar");
      }
    }
    await this.validarIdentidadLibre(input.dni, input.email);

    const tutor = input.tutor ? await this.resolverTutor(input.tutor, { dniAlumno: input.dni }) : null;
    const { usuario, ficha } = separarDatos(input);
    return this.repositorio.crear(
      {
        ...usuario,
        nombre: input.nombre,
        apellido: input.apellido,
        fecha_nacimiento: input.fecha_nacimiento,
      },
      ficha,
      tutor,
    );
  }

  async listar(filtro: FiltroAlumno): Promise<PaginaAlumnos> {
    const { datos, total } = await this.repositorio.listar(filtro);
    return { datos, total, limit: filtro.limit, offset: filtro.offset };
  }

  async obtenerPorId(id: number): Promise<Alumno> {
    const alumno = await this.repositorio.buscarPorId(id);
    if (!alumno) throw new NotFoundError("Alumno no encontrado");
    return alumno;
  }

  buscarPorId(id: number): Promise<Alumno | null> {
    return this.repositorio.buscarPorId(id);
  }

  buscarPorIds(ids: number[]): Promise<Alumno[]> {
    return ids.length > 0 ? this.repositorio.buscarPorIds(ids) : Promise.resolve([]);
  }

  // US-09: se revisa la edad con los datos que resultan del cambio. Si el alumno ya es mayor, el
  // tutor se quita y pasa a necesitar su propio email.
  async actualizar(id: number, input: ActualizarAlumnoInput): Promise<Alumno> {
    const alumno = await this.obtenerPorId(id);
    const fechaNacimiento = input.fecha_nacimiento ?? alumno.usuario.fecha_nacimiento;
    const menor = esMenorDeEdad(fechaNacimiento, fechaActualArgentina());

    let tutor: CambioDeTutor;
    if (menor) {
      if (input.email) {
        throw new ValidationError("Un alumno menor de 18 años no lleva email: entra al sistema su tutor");
      }
      if (!input.tutor && !alumno.id_usuario_responsable) {
        throw new ValidationError("Un alumno menor de 18 años necesita un tutor");
      }
    } else {
      if (input.tutor) throw new ValidationError("Un alumno mayor de edad no lleva tutor");
      if (!(input.email ?? alumno.usuario.email)) {
        throw new ValidationError("El email es obligatorio para un alumno mayor de edad: lo usa para entrar");
      }
      if (alumno.id_usuario_responsable) tutor = null;
    }
    await this.validarIdentidadLibre(input.dni, input.email, alumno.id_usuario);
    if (input.tutor) {
      tutor = await this.resolverTutor(input.tutor, {
        dniAlumno: input.dni ?? alumno.usuario.dni ?? undefined,
        idUsuarioAlumno: alumno.id_usuario,
      });
    }

    const { usuario, ficha } = separarDatos(input);
    return this.repositorio.actualizar(id, usuario, ficha, tutor);
  }

  async activar(id: number): Promise<Alumno> {
    const alumno = await this.obtenerPorId(id);
    if (alumno.estado === "BAJA") {
      throw new ConflictError("El alumno está dado de baja: primero hay que reactivarlo");
    }
    // Ya dado de alta: no se reactivan su cuenta ni la del tutor, que la propietaria pudo haber desactivado.
    if (alumno.estado === "ACTIVO") return alumno;

    const activado = await this.repositorio.activar(alumno);
    const idDestinatario = alumno.id_usuario_responsable ?? alumno.id_usuario;
    const rol = alumno.id_usuario_responsable ? "TUTOR" : "ALUMNO";
    const destinatario = await this.usuarios.obtenerPorId(idDestinatario);
    if (!this.autorizacion.tieneRol(destinatario, rol)) {
      await this.autorizacion.asignarRol(idDestinatario, rol);
    }
    return activado;
  }

  async darDeBaja(id: number): Promise<Alumno> {
    const alumno = await this.obtenerPorId(id);
    if (alumno.estado === "BAJA") throw new ConflictError("El alumno ya está dado de baja");
    return this.repositorio.darDeBaja(alumno);
  }

  async reactivar(id: number): Promise<Alumno> {
    const alumno = await this.obtenerPorId(id);
    if (alumno.estado !== "BAJA") throw new ConflictError("Solo se reactiva un alumno dado de baja");
    return this.repositorio.reactivar(alumno);
  }

  // El DNI ya registrado en un alumno tiene su propio código, para que el front ofrezca abrir esa
  // ficha en lugar de cargarlo dos veces (US-05).
  private async validarIdentidadLibre(dni?: string, email?: string, idUsuarioPropio?: number): Promise<void> {
    if (dni) {
      const conEseDni = await this.usuarios.buscarPorDni(dni);
      if (conEseDni && conEseDni.id_usuario !== idUsuarioPropio) {
        const alumno = await this.repositorio.buscarPorIdUsuario(conEseDni.id_usuario);
        if (alumno) throw new AlumnoExistenteError(alumno.id_alumno);
        throw new ConflictError("Ya existe un usuario con ese DNI");
      }
    }
    if (email) {
      const conEseEmail = await this.usuarios.buscarPorEmail(email);
      if (conEseEmail && conEseEmail.id_usuario !== idUsuarioPropio) {
        throw new ConflictError("Ya existe un usuario con ese email");
      }
    }
  }

  // US-06: un tutor que ya existe (por id, DNI o email) se reutiliza: así un mismo tutor queda a
  // cargo de varios hermanos sin duplicarse.
  private async resolverTutor(
    tutor: TutorInput,
    { dniAlumno, idUsuarioAlumno }: { dniAlumno?: string; idUsuarioAlumno?: number },
  ): Promise<TutorResuelto> {
    if ("id_usuario" in tutor) {
      const existente = await this.usuarios.buscarPorId(tutor.id_usuario);
      if (!existente) throw new ValidationError("El tutor indicado no existe");
      this.validarTutor(existente.fecha_nacimiento, existente.id_usuario === idUsuarioAlumno);
      return { id_usuario: existente.id_usuario };
    }

    this.validarTutor(tutor.fecha_nacimiento, tutor.dni !== undefined && tutor.dni === dniAlumno);
    const porDni = tutor.dni ? await this.usuarios.buscarPorDni(tutor.dni) : null;
    const porEmail = await this.usuarios.buscarPorEmail(tutor.email);
    const existente = porDni ?? porEmail;
    if (!existente) return { nuevo: tutor };

    // Se reusa solo si el DNI y el email cargados son de la misma cuenta: si no, con el DNI de otra
    // persona quedaría a cargo del menor una cuenta que no es la del tutor que se quiso cargar.
    const sonLaMismaCuenta = porDni
      ? porDni.id_usuario === porEmail?.id_usuario
      : !(tutor.dni && porEmail?.dni);
    if (!sonLaMismaCuenta) {
      throw new ConflictError("El DNI y el email del tutor corresponden a cuentas distintas");
    }

    this.validarTutor(existente.fecha_nacimiento, existente.id_usuario === idUsuarioAlumno);
    return { id_usuario: existente.id_usuario };
  }

  private validarTutor(fechaNacimiento: Date, esElMismoAlumno: boolean): void {
    if (esElMismoAlumno) throw new ValidationError("El alumno no puede ser su propio tutor");
    if (esMenorDeEdad(fechaNacimiento, fechaActualArgentina())) {
      throw new ValidationError("El tutor tiene que ser mayor de edad");
    }
  }
}
