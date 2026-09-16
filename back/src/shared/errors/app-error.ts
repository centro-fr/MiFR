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

export class ValidationError extends AppError {
  constructor(
    message = "Datos inválidos",
    public readonly details?: unknown,
  ) {
    super(400, message, "VALIDATION_ERROR");
  }
}
