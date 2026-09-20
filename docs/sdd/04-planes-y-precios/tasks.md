# Tareas de Implementación: Planes y Precios

Tareas técnicas, secuenciales y verificables para la épica **Planes y Precios** (US-11 a US-14).

---

## Fase 1: Base de Datos y Semillas

- [ ] **1.1. Tablas `planes`, `plan_precios`, `promociones` y `promocion_planes`**
  - Crear script de migración SQL para las entidades y claves foráneas.
  - Asegurar constraints de valores no negativos en `precio` y `valor`, y rangos válidos de fechas.
  - *Criterio de verificación*: Ejecución limpia de migraciones e integridad de claves foráneas.

- [ ] **1.2. Datos semilla de catálogo**
  - Insertar planes de ejemplo (Pase Libre, Básico 2 días, Personalizada Pilates 3 días).
  - Insertar precios con vigencias y una promoción activa del 15% de descuento por apertura.
  - *Criterio de verificación*: Query SQL que recupere el precio vigente de cada plan al día de la fecha.

---

## Fase 2: Backend – Lógica de Negocio y Precios Temporales

- [ ] **2.1. CRUD de Planes y Helper de Precios Vigentes (US-11)**
  - Implementar endpoints para planes y vincular la inserción del precio inicial.
  - Crear función utilitaria `obtenerPrecioVigente(idPlan, fecha)` en repositorio de precios.
  - *Criterio de verificación*: Test unitario que simula consulta de precios a distintas fechas históricas y futuras.

- [ ] **2.2. Versionado de Precios y Cierre de Vigencia (US-12)**
  - Implementar endpoint `POST /planes/:id/precios`: cierra la vigencia del precio anterior (`fecha_vigencia_hasta = fecha_nueva - 1 día`) e inserta el nuevo valor.
  - *Criterio de verificación*: Probar actualización de precio y verificar que cuotas previamente creadas no cambien su monto.

- [ ] **2.3. Motor de Promociones y Descuentos (US-13)**
  - Implementar CRUD de promociones asociando array de planes.
  - Desarrollar servicio de cálculo de descuento (porcentaje o monto fijo).
  - *Criterio de verificación*: Cálculo matemático unitario con 10%, 25% y montos fijos.

- [ ] **2.4. Flujo de Cambio de Plan (US-14)**
  - Desarrollar servicio transaccional para cerrar inscripción vigente y dar de alta la nueva con validación de cupos.
  - *Criterio de verificación*: Test que intente cambiar a un plan con cupo lleno y verifique el rechazo de la operación.

---

## Fase 3: Frontend – Catálogo Comercial y Administración

- [ ] **3.1. Pantalla de Planes y Tarifas (US-11 y US-12)**
  - Construir vista `/admin/planes` con tarjetas comerciales y badge de precio vigente.
  - Modal para "Actualizar Precio" indicando nuevo valor y fecha a partir de cuándo rige.
  - *Criterio de verificación*: Al cargar un nuevo precio futuro, la UI muestra el precio actual y aclara la fecha del próximo aumento.

- [ ] **3.2. Gestión de Promociones (US-13)**
  - Construir vista `/admin/promociones` con listado y estado de vigencia.
  - Formulario modal con selector de tipo de descuento y checkboxes de planes alcanzados.
  - *Criterio de verificación*: Creación de promoción exitosa y visualización en el listado.

- [ ] **3.3. Modal de Cambio de Plan en Ficha de Alumno (US-14)**
  - En la ficha del alumno, agregar botón "Cambiar de Plan".
  - Mostrar selector de nuevo plan, horarios disponibles y fecha efectiva.
  - *Criterio de verificación*: Ejecutar cambio de plan desde la interfaz y comprobar actualización en la ficha.

---

## Fase 4: Validación End-to-End y Criterios de Aceptación

- [ ] **4.1. Verificación CA-01 y CA-02**: Crear plan, actualizar precio futuro y verificar que no altere cuotas pasadas.
- [ ] **4.2. Verificación CA-03**: Aplicar descuento promocional y comprobar monto liquidado.
- [ ] **4.3. Verificación CA-04**: Realizar cambio de plan y validar verificación de cupos.
