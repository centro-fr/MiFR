export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "El recurso ya existe") {
    super(409, message, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tiene permisos para esta acción") {
    super(403, message, "FORBIDDEN");
  }
}

export class UsuarioNoRegistradoError extends AppError {
  constructor(
    message = "No estás registrado en el sistema. Pedile a quien administra el centro que te dé de alta.",
  ) {
    super(403, message, "USUARIO_NO_REGISTRADO");
  }
}

export class PermisoCriticoInmutableError extends AppError {
  constructor(codigoPermiso: string) {
    super(
      400,
      `El permiso ${codigoPermiso} es crítico y no se le puede quitar a la propietaria`,
      "PERMISO_CRITICO_INMUTABLE",
    );
  }
}

export class PermisoExclusivoPropietariaError extends AppError {
  constructor(codigoPermiso: string) {
    super(
      400,
      `El permiso ${codigoPermiso} es exclusivo de la propietaria y no se puede otorgar a otro rol`,
      "PERMISO_EXCLUSIVO_PROPIETARIA",
    );
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Datos inválidos",
    public readonly details?: unknown,
  ) {
    super(400, message, "VALIDATION_ERROR");
  }
}

// US-15 y US-17: un monto distinto del esperado se acepta solo si quien lo carga lo confirma. El
// mensaje dice cuál era el esperado para que el front pueda mostrarlo y pedir la confirmación.
export class MontoDistintoError extends AppError {
  constructor(esperado: number) {
    super(
      409,
      `El monto no coincide con el esperado (${esperado}). Para registrarlo igual, confirmá el monto distinto`,
      "MONTO_DISTINTO",
    );
  }
}

// US-05: el front muestra la advertencia y ofrece abrir la ficha del alumno que ya existe.
export class AlumnoExistenteError extends AppError {
  constructor(idAlumno: number) {
    super(409, `Ya hay un alumno registrado con ese DNI (alumno ${idAlumno})`, "ALUMNO_EXISTENTE");
  }
}

// El pedido no pasó por Netlify: llegó directo a la URL de Render, sin la firma del reenvío.
export class OrigenNoPermitidoError extends AppError {
  constructor() {
    super(403, "El pedido tiene que llegar a través del sitio", "ORIGEN_NO_PERMITIDO");
  }
}
