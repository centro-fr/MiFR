# US-31 – Insignias y racha de asistencia

## 1. Información general

- **Épica:** Portal del Alumno
- **Prioridad:** Baja
- **Actor principal:** Alumno
- **Sprint sugerido:** Sprint 5

## 2. Objetivo

Permitir al alumno recibir insignias y ver su racha de asistencia en su panel, para sentirse motivado a sostener su rutina.

## 3. Descripción

Como alumno, quiero recibir insignias y ver mi racha de asistencia en mi panel, para sentirme motivado a sostener mi rutina.

## 4. Estados de la pantalla / flujo

- [ ] Loading (cargando racha e insignias)
- [ ] Vista de racha actual
- [ ] Listado de insignias obtenidas
- [ ] Insignias bloqueadas / por obtener
- [ ] Notificación al obtener una nueva insignia (opcional)
- [ ] Éxito
- [ ] Error
- [ ] Empty (alumno sin racha activa ni insignias)

## 5. Datos que necesita

### Datos que muestra (racha)

- Racha actual (cantidad de clases consecutivas asistidas)
- Fecha de inicio de la racha
- Mejor racha histórica
- Próximo hito (por ejemplo: "3 clases para llegar a 10")

### Datos que muestra (insignias)

- Insignias obtenidas (con fecha de obtención)
- Insignias bloqueadas (con descripción de cómo obtenerlas)
- Progreso hacia la próxima insignia (opcional)

### Datos de configuración

- Criterios de otorgamiento de insignias (definidos con la propietaria durante el desarrollo)
- Tipos de insignias (por racha, por asistencia perfecta, por hitos especiales, etc.)

### Datos que se generan

- Racha actualizada automáticamente al registrar asistencia
- Insignias otorgadas automáticamente según criterios
- Historial de rachas e insignias

## 6. Acciones del usuario

- Ver su racha actual
- Ver su mejor racha histórica
- Ver sus insignias obtenidas
- Ver las insignias bloqueadas y cómo obtenerlas
- Compartir una insignia (opcional)
- Ver el detalle de una insignia

## 7. Reglas de negocio

- La racha se calcula sobre **clases seguidas sin faltar**, según historial de asistencia.
- Una **inasistencia corta la racha** y la reinicia a cero.
- Criterios de otorgamiento (definidos en el Sprint 5):
  - **Racha de 10 y de 25 clases**: clases seguidas sin faltar.
  - **50 y 100 clases**: total de clases asistidas.
  - **Mes perfecto**: asistió a todas sus clases dictadas del mes, con al menos `RANKING_MINIMO_CLASES` clases (4 por defecto).
  - **Podio del mes**: los tres primeros del ranking de asistencia del mes (US-30), con el mismo mínimo y al menos una clase asistida.
- Racha y total se calculan sobre el historial de clases dictadas y la insignia queda con la fecha de la clase en que se alcanzó el umbral. Las mensuales se otorgan al cerrar el mes, desde el día 1 del mes siguiente, una vez por mes (pueden repetirse en otros meses).
- Una clase cuenta para la racha recién cuando se cierra su asistencia: mientras está abierta, sus marcas todavía pueden cambiar.
- Las insignias se otorgan automáticamente al cumplirse los criterios.
- El alumno **solo ve sus propias** rachas e insignias (no las de otros).
- Si el alumno es menor de edad, el **tutor** accede a esta información.
- Las rachas se calculan por período continuo (no se resetean por mes calendario).
- Las clases canceladas no cuentan ni a favor ni en contra de la racha. Una clase dictada por una suplente (US-24) cuenta como cualquier otra.
- Las clases personalizadas también cuentan para la racha.
- Las clases sueltas cuentan para la racha como cualquier otra clase dictada con marca: la racha sigue el orden en el tiempo de las clases del alumno.
- Las insignias se muestran con íconos distintivos y colores de la marca, que resuelve el front según el tipo: la base no los guarda.

## 8. Criterios de aceptación

- [ ] Racha activa tras varias asistencias consecutivas → incrementa correctamente
- [ ] Corte de racha tras una inasistencia → la racha vuelve a cero
- [ ] Obtención de insignia al cumplir el criterio → se otorga automáticamente
- [ ] El alumno ve solo sus propias insignias y racha
- [ ] El tutor de un alumno menor accede a la información
- [ ] Las insignias bloqueadas muestran cómo obtenerlas
- [ ] La mejor racha histórica se conserva

## 9. Casos borde / Errores

- Alumno recién inscripto sin racha ni insignias → estados vacíos claros
- Alumno con racha de 0 (nunca asistió) → mostrar mensaje motivacional
- Alumno con racha cortada recientemente → mostrar mensaje de ánimo
- Clases canceladas en medio de una racha → no la cortan ni la suman (no tienen marcas)
- Error de red al cargar la racha o insignias
- Insignia otorgada pero no visible por error → registrar log y reintentar

## 10. Dependencias

- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica: un alumno dado de baja no accede)
- US-20, US-21 (asistencia e inasistencias, base para el cálculo de racha)
- US-29 (panel del alumno, donde se accede)
- US-30 (ranking de asistencia, que puede mostrar insignias)
- US-01, US-02 (permisos: el alumno solo ve lo suyo)
- Backend: servicio de cálculo de racha + servicio de otorgamiento de insignias

## 11. Notas de implementación (Front)

- Se puede implementar completamente con mocks
- Complejidad: Media
- Recomendación de UI (mobile-first):
  - Acceso desde el panel del alumno (US-29) sección "Mi comunidad" o "Mis logros"
  - Vista con dos secciones:
    1. "Mi racha":
       - Número grande y destacado (por ejemplo, "🔥 12 clases seguidas")
       - Fecha de inicio de la racha
       - Mejor racha histórica
       - Próximo hito ("3 clases para llegar a 15")
    2. "Mis insignias":
       - Grid de insignias obtenidas (con íconos y colores de marca)
       - Insignias bloqueadas en gris con descripción de cómo obtenerlas
       - Al tocar una insignia, mostrar detalle (nombre, descripción, fecha de obtención)
  - Animación al obtener una nueva insignia (opcional para MVP)
  - Notificación in-app al obtener una insignia (opcional para MVP)
  - Los criterios de otorgamiento se definen con la propietaria durante el desarrollo
  - Colores de la marca: #E91E82, #BC1266, #181C26
  - Estados vacíos bien diseñados con mensajes motivacionales
  - Considerar la posibilidad de compartir insignias en redes sociales (fuera del MVP)
