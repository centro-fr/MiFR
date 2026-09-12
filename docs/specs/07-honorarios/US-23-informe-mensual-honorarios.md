# US-23 – Informe mensual automático de honorarios

## 1. Información general
- **Épica:** Honorarios
- **Prioridad:** Media
- **Actor principal:** Propietaria
- **Sprint sugerido:** Sprint 4

## 2. Objetivo
Generar automáticamente un informe mensual con los honorarios de cada profesora según sus alumnos a cargo, para agilizar la liquidación sin cálculos manuales.

## 3. Descripción
Como propietaria, quiero generar un informe mensual automático con los honorarios de cada profesora según sus alumnos a cargo para agilizar la liquidación sin cálculos manuales.

## 4. Estados de la pantalla / flujo
- [ ] Loading (cargando informe)
- [ ] Selección de mes / período
- [ ] Informe generado con detalle por profesora
- [ ] Detalle expandido de una profesora
- [ ] Exportar informe (PDF / Excel)
- [ ] Éxito
- [ ] Error
- [ ] Empty (sin datos para el período seleccionado)

## 5. Datos que necesita
### Datos que muestra (informe):
- Período del informe (mes)
- Total general de honorarios
- Por profesora:
  - Nombre
  - Cantidad de alumnos a cargo
  - Detalle de alumnos (nombre, plan, estado)
  - Honorario calculado
  - Suplencias registradas (US-24) si aplica
  - Total a liquidar

### Datos de configuración:
- Valor del honorario por inscripto (configurable por la propietaria)
- Reglas de cálculo (por inscripto, asista o no)

### Datos que se generan:
- Informe mensual consolidado
- Exportación a PDF / Excel
- Historial de informes generados (opcional)

## 6. Acciones del usuario
- Seleccionar el mes / período del informe
- Ver el informe consolidado
- Expandir el detalle por profesora
- Exportar el informe (PDF / Excel)
- Ver informes de períodos anteriores
- (Opcional) Ajustar manualmente un honorario

## 7. Reglas de negocio
- **Se cobra por inscripto, asista o no.**
- El informe es **solo informativo** y **visible únicamente por la propietaria**.
- Se calcula por período mensual (mes calendario o el período configurado).
- Se consideran los alumnos **activos** al cierre del período.
- Los alumnos dados de baja durante el mes se cuentan según la política (por defecto, si estuvieron activos al menos una parte del mes, se cuentan; configurable).
- Las **suplencias** (US-24) se descuentan de la profesora titular y se suman a la suplente.
- El honorario por inscripto es configurable (puede variar por profesora o por actividad, según política del centro).
- El informe **no genera pagos automáticos**, solo muestra el cálculo.
- La propietaria puede ajustar manualmente un honorario, dejando trazabilidad.
- Los alumnos de prueba o inactivos no se cuentan.
- Los alumnos con clase suelta también se cuentan (según política).

## 8. Criterios de aceptación
- [ ] Cálculo de honorarios de una profesora con alumnos inscriptos que faltaron → se cuentan igual
- [ ] Acceso de una profesora al informe de honorarios → falla (acceso restringido)
- [ ] El informe muestra el detalle por profesora y por alumno
- [ ] Se puede exportar el informe a PDF / Excel
- [ ] Las suplencias se descuentan correctamente
- [ ] El total general coincide con la suma de los honorarios individuales
- [ ] El informe refleja solo el período seleccionado

## 9. Casos borde / Errores
- Profesora sin alumnos a cargo en el período → honorario cero
- Alumno que cambió de profesora en el medio del mes → definir política (por defecto, se cuenta donde estuvo más tiempo)
- Alumno que se dio de baja durante el mes → definir política (configurable)
- Suplencia no registrada → el informe no la refleja (requiere que US-24 esté completa)
- Error al exportar el informe → reintentar
- Error de red al cargar el informe

## 10. Dependencias
- US-03, US-04 (actividades y horarios)
- US-05, US-07 (alumnos e inscripciones)
- US-08 (baja lógica, para excluir alumnos dados de baja)
- US-24 (suplencias, que ajustan el cálculo)
- US-01, US-02 (permisos: solo la propietaria accede)
- Backend: job de cálculo mensual + endpoint de informe + exportación

## 11. Notas de implementación (Front)
- Se puede implementar completamente con mocks
- Complejidad: Media-Alta (por el cálculo y las reglas de negocio)
- Recomendación de UI:
  - Acceso desde el panel de la propietaria (sección "Honorarios")
  - Selector de mes / período (dropdown o date picker de mes)
  - Vista de acordeón por profesora:
    - Nombre, cantidad de alumnos, total a liquidar
    - Al expandir: tabla con detalle por alumno (nombre, plan, estado)
    - Subtotal de suplencias (si aplica)
  - Total general visible al pie
  - Botón "Exportar" con opciones PDF / Excel
  - Los honorarios se muestran con formato de moneda consistente
  - Indicar claramente si el informe está "cerrado" o "en revisión" (opcional)
  - Historial de informes anteriores accesible desde un selector de período
  - Restricción de acceso: solo propietaria (reforzado por permisos)
  - Manejar el caso de "sin datos" para el período seleccionado