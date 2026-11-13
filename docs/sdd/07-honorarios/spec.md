# Especificación Funcional: Honorarios

## 1. Origen

Esta especificación consolida las User Stories de la épica **Honorarios**:

- **US-23**: Informe mensual automático de honorarios (`docs/specs/07-honorarios/US-23-informe-mensual-honorarios.md`)
- **US-24**: Registro de suplencias entre profesoras (`docs/specs/07-honorarios/US-24-registro-suplencias-profesoras.md`)

---

## 2. Objetivo

Automatizar el cálculo y la liquidación periódica de honorarios profesionales de las instructoras del centro MiFR: computar los montos devengados como el 50 % de los ingresos por cuotas de los alumnos a cargo de cada profesora (sin mínimo de alumnos y con independencia de su asistencia efectiva a clases), incorporar los ajustes y compensaciones por suplencias de clases cubiertas entre docentes, y brindar a la Propietaria reportes consolidados y descargables con máxima privacidad frente al resto del personal.

---

## 3. Roles Involucrados

| Rol | Alcance en esta Épica |
| :--- | :--- |
| **Propietaria** | Acceso exclusivo a la configuración del porcentaje de honorarios, cálculo mensual consolidado de todas las profesoras, registro/validación de suplencias y cierre de liquidaciones. |
| **Profesora** | Registro o consulta de suplencias en las que intervino (como ausente o como suplente) y visualización **únicamente de su propia liquidación individual**, sin acceso a datos de otras profesoras. |

---

## 4. Requisitos

### 4.1. Requisitos Funcionales (RF)

#### RF-01: Motor de Cálculo Mensual de Honorarios (US-23)

- Generar el informe mensual de honorarios para un período calendario determinado (mes/año).
- Regla base de negocio: cada profesora recibe el **50 % de los ingresos por cuotas atribuibles a sus alumnos inscriptos**, asistan o no a las clases. No hay un mínimo de alumnos.
- Los ingresos del período son los **pagos confirmados** dentro del mes calendario. Los pagos pendientes o rechazados no cuentan. Un pago tardío cuenta en el mes en que se confirma, y un pago parcial cuenta por el monto efectivamente confirmado.
- Cuentan las inscripciones activas, o dadas de baja que hayan cobrado. Se excluyen las preinscripciones y las inscripciones sin cargo. Los ingresos de cada inscripción se atribuyen a la profesora de esa inscripción.
- La fórmula de cálculo base para cada profesora titular $P$, con porcentaje $\pi$ (50 % por defecto, configurable):
  $$\text{HonorarioBase}(P) = \pi \times \sum_{a \in \text{Inscripciones}(P)} \text{PagosConfirmadosEnElMes}(a)$$
- Ejemplo: ingresos por cuotas de $200.000 → honorario base de $200.000 × 50 % = $100.000.
- Aislabilidad de la información: El informe consolidado de todas las profesoras es estrictamente confidencial y visible **únicamente por la Propietaria**.

#### RF-02: Gestión y Ajuste por Suplencias (US-24)

- Registrar la cobertura de una clase dictada por una profesora suplente ante la ausencia justificada de la titular:
  - Clase afectada (`id_clase`), profesora ausente (`id_prof_ausente`), profesora suplente (`id_prof_dictante`) y motivo.
- Regla contable de suplencia:
  - Se descuenta el valor proporcional de la clase a la profesora titular ausente (`DESCUENTO_AUSENCIA`).
  - Se acredita el valor correspondiente a la profesora suplente (`CLASE_SUPLIDA`).
  - Estos ajustes se aplican sobre el honorario base calculado por cuotas.
- No es posible registrar como suplente a la misma profesora titular de la clase.
- No se pueden editar suplencias asociadas a períodos con liquidación en estado `CERRADA` o `PAGADA`.

#### RF-03: Detalle y Exportación de Liquidaciones

- La Propietaria puede expandir el desglose de cada profesora: lista de alumnos a cargo con el monto cobrado de cada uno, detalle de suplencias cubiertas y descuentos aplicados.
- Capacidad de exportar el informe del período a formato PDF y hoja de cálculo (Excel / CSV).

---

### 4.2. Requisitos No Funcionales (RNF)

- **RNF-01**: Precisión y consistencia contable: la suma de las liquidaciones individuales debe coincidir con precisión decimal con el total general del centro.
- **RNF-02**: Seguridad y autorización estricta en backend: denegación total a solicitudes de consulta cruzada de honorarios.

---

## 5. Criterios de Aceptación

- **CA-01 (Cálculo por ingresos)**: Una profesora con ingresos por cuotas de $200.000 en el mes recibe honorarios base de $100.000 (50 %), con independencia de la cantidad de alumnos y de sus asistencias.
- **CA-02 (Ajuste por suplencia)**: Profesora A se ausenta a una clase y la cubre Profesora B. La liquidación descuenta la clase a A y la adiciona a B.
- **CA-03 (Privacidad de datos financieros)**: Una profesora que intenta acceder a la API de liquidación global recibe HTTP 403 Forbidden.
- **CA-04 (Exportación correcta)**: Generación de archivo descargable con el formato y los totales del período seleccionado.

---

## 6. Casos Borde y Errores

- Alumno dado de baja a mitad de mes: cuenta si cobró en el período (política configurable por el centro).
- Pagos pendientes o rechazados, o confirmados fuera del mes liquidado: no suman a los ingresos del período.
- Registro de suplencia sobre una clase ya cerrada o liquidada: el sistema bloquea la operación.

---

## 7. Fuera de Alcance

- Emisión de recibos de sueldo bajo legislación laboral formal (MiFR gestiona honorarios de prestadores independientes/monotributistas).