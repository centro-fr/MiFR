import type { PrismaClient } from "@prisma/client";
import { CalculadorHabilitacion } from "../../modules/calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.js";
import { CalculadorVencimientoCuota } from "../../modules/calculos-del-negocio/calculador-vencimiento-cuota/calculador-vencimiento-cuota.js";
import { CuotaRepository } from "../../modules/gestion-cuotas-y-pagos/cuota/cuota.repository.js";
import { CuotaService } from "../../modules/gestion-cuotas-y-pagos/cuota/cuota.service.js";
import { GestionCuotasYPagosService } from "../../modules/gestion-cuotas-y-pagos/gestion-cuotas-y-pagos.service.js";
import { PagoRepository } from "../../modules/gestion-cuotas-y-pagos/pago/pago.repository.js";
import { PagoService } from "../../modules/gestion-cuotas-y-pagos/pago/pago.service.js";
import type { IInfoInscripciones } from "../../modules/gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import { ProfesorRepository } from "../../modules/gestion-personas/profesor/profesor.repository.js";
import { ProfesorService } from "../../modules/gestion-personas/profesor/profesor.service.js";
import { ActividadRepository } from "../../modules/gestion-servicio-entrenamiento/actividad/actividad.repository.js";
import { ActividadService } from "../../modules/gestion-servicio-entrenamiento/actividad/actividad.service.js";
import { ParametrosSistemaRepository } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.repository.js";
import { ParametrosSistemaService } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.service.js";
import { PlanRepository } from "../../modules/gestion-servicio-entrenamiento/plan/plan.repository.js";
import { PromocionRepository } from "../../modules/gestion-servicio-entrenamiento/promocion/promocion.repository.js";
import { PromocionService } from "../../modules/gestion-servicio-entrenamiento/promocion/promocion.service.js";
import { PlanService } from "../../modules/gestion-servicio-entrenamiento/plan/plan.service.js";
import { RolRepository } from "../../modules/gestion-usuarios/rol/rol.repository.js";
import { RolService } from "../../modules/gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "../../modules/gestion-usuarios/usuario/usuario.repository.js";
import { UsuarioService } from "../../modules/gestion-usuarios/usuario/usuario.service.js";
import { UnidadDeTrabajoPrisma } from "../../shared/db/transaccion.js";

export const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

// Repite el cableado de composicion.ts para poder cambiarle el repositorio de pagos: así PI-35 hace
// fallar el guardado del pago después del alta y comprueba que la transacción no deja nada.

export interface CuotasYPagosArmado {
  gestion: GestionCuotasYPagosService;
  // IInfoCuotas, lo que consumen los otros subsistemas.
  cuotas: CuotaService;
}

export function armarCuotasYPagos(
  prisma: PrismaClient,
  infoInscripciones: IInfoInscripciones,
  pagoRepositorio: PagoRepository = new PagoRepository(prisma),
): CuotasYPagosArmado {
  const rolService = new RolService(new RolRepository(prisma));
  const usuarioService = new UsuarioService(new UsuarioRepository(prisma), rolService);
  const profesorService = new ProfesorService(new ProfesorRepository(prisma), usuarioService, rolService);
  const planService = new PlanService(
    new PlanRepository(prisma),
    new ActividadService(new ActividadRepository(prisma)),
    new PromocionService(new PromocionRepository(prisma)),
  );
  const cuotaService = new CuotaService(
    new CuotaRepository(prisma),
    infoInscripciones,
    planService,
    new CalculadorVencimientoCuota(),
    new CalculadorHabilitacion(),
    new ParametrosSistemaService(new ParametrosSistemaRepository(prisma)),
  );
  const gestion = new GestionCuotasYPagosService(
    cuotaService,
    new PagoService(pagoRepositorio, profesorService),
    new UnidadDeTrabajoPrisma(prisma),
  );
  return { gestion, cuotas: cuotaService };
}
