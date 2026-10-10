import type { PrismaClient } from "@prisma/client";
import type { ICalculoHabilitacion } from "../../modules/calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.js";
import type { ICalculoVencimiento } from "../../modules/calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.js";
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
import type { IInfoParametros } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import { PlanRepository } from "../../modules/gestion-servicio-entrenamiento/plan/plan.repository.js";
import { PlanService } from "../../modules/gestion-servicio-entrenamiento/plan/plan.service.js";
import { RolRepository } from "../../modules/gestion-usuarios/rol/rol.repository.js";
import { RolService } from "../../modules/gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "../../modules/gestion-usuarios/usuario/usuario.repository.js";
import { UsuarioService } from "../../modules/gestion-usuarios/usuario/usuario.service.js";
import { UnidadDeTrabajoPrisma } from "../../shared/db/transaccion.js";

const UN_MES_EN_MS = 30 * 24 * 60 * 60 * 1000;

// Los calculadores (capa no persistente) todavía no están implementados, así que el subsistema no se
// arma en composicion.ts. El test lo arma con los componentes reales y reemplaza solo los cálculos
// puros, que no tocan la base y no cambian lo que se prueba acá: qué queda guardado.
const vencimientos: ICalculoVencimiento = {
  calcularVencimiento: ({ desde }) => new Date(desde.getTime() + UN_MES_EN_MS),
};
const habilitaciones: ICalculoHabilitacion = {
  calcular: () => ({ estado: "AL_DIA", fechaVencimiento: null, diasRestantes: null, puedeAsistir: true }),
};
const parametros = { obtener: async () => true } as unknown as IInfoParametros;

export function armarCuotasYPagos(
  prisma: PrismaClient,
  infoInscripciones: IInfoInscripciones,
  pagoRepositorio: PagoRepository = new PagoRepository(prisma),
): GestionCuotasYPagosService {
  const rolService = new RolService(new RolRepository(prisma));
  const usuarioService = new UsuarioService(new UsuarioRepository(prisma), rolService);
  const profesorService = new ProfesorService(new ProfesorRepository(prisma), usuarioService, rolService);
  const planService = new PlanService(
    new PlanRepository(prisma),
    new ActividadService(new ActividadRepository(prisma)),
  );
  const cuotaService = new CuotaService(
    new CuotaRepository(prisma),
    infoInscripciones,
    planService,
    vencimientos,
    habilitaciones,
    parametros,
  );
  return new GestionCuotasYPagosService(
    cuotaService,
    new PagoService(pagoRepositorio, profesorService),
    new UnidadDeTrabajoPrisma(prisma),
  );
}
