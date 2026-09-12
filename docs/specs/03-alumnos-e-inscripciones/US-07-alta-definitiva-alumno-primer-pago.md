# US-07 – Alta definitiva de alumno al confirmarse el primer pago

## 1. Información general
- **Épica:** Alumnos e Inscripciones
- **Prioridad:** Alta
- **Actor principal:** Propietaria (o el sistema de forma automática)
- **Sprint sugerido:** Sprint 2

## 2. Objetivo
Convertir una pre-inscripción en un alumno activo cuando se confirma el primer pago, reutilizando todos los datos ya cargados sin tener que volver a ingresarlos.

## 3. Descripción
Como propietaria, quiero dar de alta el registro definitivo del alumno y activarlo en el plan y horario ya elegidos al confirmarse el primer pago de su pre-inscripción, para no volver a cargar sus datos.

## 4. Estados de la pantalla / flujo
- [ ] Lista de pre-inscripciones pendientes
- [ ] Detalle de una pre-inscripción
- [ ] Confirmación de pago asociada
- [ ] Procesando alta definitiva
- [ ] Éxito (alumno queda activo)
- [ ] Error

## 5. Datos que necesita
### Datos que se reutilizan de la pre-inscripción:
- Datos personales del alumno
- Datos del tutor (si corresponde)
- Plan elegido
- Horarios / profesora elegidos
- Peso y talla (si se cargaron)

### Datos que se generan al confirmar:
- Estado del alumno: `activo`
- Fecha de alta definitiva
- Usuario de acceso (si corresponde)
- Estado de la cuota: `al día`

## 6. Acciones del usuario
- Ver pre-inscripciones pendientes de pago
- Confirmar el primer pago (manual o desde el módulo de pagos)
- El sistema realiza el alta definitiva automáticamente al confirmarse el pago
- (Opcional) Forzar alta manual si el pago se registró por fuera

## 7. Reglas de negocio
- El alumno pasa de estado **“pendiente”** a **“activo”** únicamente cuando el primer pago queda confirmado.
- Se reutilizan todos los datos cargados en la pre-inscripción (no se duplica información).
- Al activarse, el alumno queda inscripto en el plan y horarios que se habían elegido.
- Si el pago es por transferencia, el alta definitiva ocurre cuando la propietaria **aprueba** la transferencia (US-17).
- Si el pago es en efectivo, el alta ocurre al registrarse el cobro (US-15).

## 8. Criterios de aceptación
- [ ] Confirmación de pago de una pre-inscripción → el alumno pasa a estado “activo”
- [ ] Una pre-inscripción sin pago confirmado no debe quedar activa
- [ ] Los datos de la pre-inscripción se mantienen y no se piden de nuevo
- [ ] El alumno queda correctamente asociado al plan y horarios elegidos

## 9. Casos borde / Errores
- Pre-inscripción que ya fue cancelada o venció
- Pago confirmado pero el horario ya no tiene cupo (especialmente en personalizadas)
- Error al crear el usuario de acceso
- Doble confirmación de pago (evitar duplicar el alta)

## 10. Dependencias
- US-05 (pre-inscripción)
- US-15 y US-16 / US-17 (registro y confirmación de pagos)
- US-18 (cálculo del estado de habilitación)
- Backend: transición de estado pendiente → activo

## 11. Notas de implementación (Front)
- Gran parte de esta lógica puede ser automática (disparada por el evento de pago confirmado)
- Complejidad: Media
- En el frontend se necesita:
  - Vista de pre-inscripciones pendientes
  - Indicador claro de que el alumno pasó a activo
  - Posibilidad de ver el historial de la pre-inscripción