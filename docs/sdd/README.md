# Spec-Driven Development (SDD) – Sistema MiFR

Bienvenido a la documentación central de desarrollo basado en especificaciones (**Spec-Driven Development**) del sistema **MiFR** (gestión integral de centro de entrenamiento y gimnasio).

Este directorio organiza de manera estructurada y verificable todas las épicas del proyecto, estableciendo el puente riguroso entre los requisitos del negocio (User Stories de `docs/specs/`), las decisiones de arquitectura técnica y el desglose de tareas de ingeniería.

---

## Estructura por Épica

Cada una de las 12 épicas del sistema cuenta con tres artefactos fundamentales:

```text
docs/sdd/
└── <xx-nombre-epica>/
    ├── spec.md   # Especificación Funcional: origen (US), objetivo, requisitos RF/RNF, criterios de aceptación (CA), casos borde y alcance.
    ├── plan.md   # Plan Técnico: arquitectura, modelo relacional (DER), contratos de API REST, flujos e implicancias de seguridad.
    └── tasks.md  # Plan de Trabajo: checklist de tareas ordenadas, secuenciales y verificables con criterios de aceptación.
```

---

## Mapa de Épicas del Proyecto

| # | Épica | User Stories Agrupadas | Enlaces SDD |
| :---: | :--- | :--- | :---: |
| **01** | **Autenticación y Seguridad** | [US-01](../specs/01-autenticacion-y-seguridad/US-01-inicio-sesion-google-auth.md), [US-02](../specs/01-autenticacion-y-seguridad/US-02-definicion-permisos-por-rol.md) | [spec](./01-autenticacion-y-seguridad/spec.md) · [plan](./01-autenticacion-y-seguridad/plan.md) · [tasks](./01-autenticacion-y-seguridad/tasks.md) |
| **02** | **Configuración Base** | [US-03](../specs/02-actividades-cupos/US-03-alta-administracion-actividades-cupos.md), [US-04](../specs/02-actividades-cupos/US-04-asignacion-profesoras-horarios.md) | [spec](./02-configuracion-base/spec.md) · [plan](./02-configuracion-base/plan.md) · [tasks](./02-configuracion-base/tasks.md) |
| **03** | **Alumnos e Inscripciones** | [US-05](../specs/03-alumnos-e-inscripciones/US-05-pre-inscripcion-alumno-nuevo.md) al [US-10](../specs/03-alumnos-e-inscripciones/US-10-consulta-busqueda-alumnos.md) | [spec](./03-alumnos-e-inscripciones/spec.md) · [plan](./03-alumnos-e-inscripciones/plan.md) · [tasks](./03-alumnos-e-inscripciones/tasks.md) |
| **04** | **Planes y Precios** | [US-11](../specs/04-planes-y-precios/US-11-alta-edicion-planes-vigentes.md) al [US-14](../specs/04-planes-y-precios/US-14-renovacion-cambio-plan.md) | [spec](./04-planes-y-precios/spec.md) · [plan](./04-planes-y-precios/plan.md) · [tasks](./04-planes-y-precios/tasks.md) |
| **05** | **Pagos y Cuotas** | [US-15](../specs/05-pagos-y-cuotas/US-15-registro-cobro-efectivo.md) al [US-19](../specs/05-pagos-y-cuotas/US-19-control-efectivo-pendiente-rendicion.md) | [spec](./05-pagos-y-cuotas/spec.md) · [plan](./05-pagos-y-cuotas/plan.md) · [tasks](./05-pagos-y-cuotas/tasks.md) |
| **06** | **Asistencia** | [US-20](../specs/06-asistencia/US-20-registro-asistencia-por-clase.md) al [US-22](../specs/06-asistencia/US-22-deteccion-alumnos-inactivos.md) | [spec](./06-asistencia/spec.md) · [plan](./06-asistencia/plan.md) · [tasks](./06-asistencia/tasks.md) |
| **07** | **Honorarios** | [US-23](../specs/07-honorarios/US-23-informe-mensual-honorarios.md), [US-24](../specs/07-honorarios/US-24-registro-suplencias-profesoras.md) | [spec](./07-honorarios/spec.md) · [plan](./07-honorarios/plan.md) · [tasks](./07-honorarios/tasks.md) |
| **08** | **Notificaciones y Alertas** | [US-25](../specs/08-notificaciones-y-alertas/US-25-aviso-automatico-vencimiento-cuota.md), [US-26](../specs/08-notificaciones-y-alertas/US-26-resumen-diario-propietaria.md) | [spec](./08-notificaciones-y-alertas/spec.md) · [plan](./08-notificaciones-y-alertas/plan.md) · [tasks](./08-notificaciones-y-alertas/tasks.md) |
| **09** | **Rutina y Progreso** | [US-27](../specs/09-rutina-y-progreso/US-27-carga-rutina-evolucion-fisica.md), [US-28](../specs/09-rutina-y-progreso/US-28-consulta-rutina-progreso-fisico.md) | [spec](./09-rutina-y-progreso/spec.md) · [plan](./09-rutina-y-progreso/plan.md) · [tasks](./09-rutina-y-progreso/tasks.md) |
| **10** | **Portal del Alumno** | [US-29](../specs/10-portal-del-alumno/US-29-consulta-estado-plan-asistencias.md) al [US-31](../specs/10-portal-del-alumno/US-31-insignias-racha-asistencia.md) | [spec](./10-portal-del-alumno/spec.md) · [plan](./10-portal-del-alumno/plan.md) · [tasks](./10-portal-del-alumno/tasks.md) |
| **11** | **Difusión y Analítica** | [US-32](../specs/11-difusion-y-analitica/US-32-panel-publico-disponibilidad.md) | [spec](./11-difusion-y-analitica/spec.md) · [plan](./11-difusion-y-analitica/plan.md) · [tasks](./11-difusion-y-analitica/tasks.md) |
| **12** | **Reportes y Fidelización** | [US-33](../specs/12-reportes-y-fidelizacion/US-33-informe-asistencia.md) al [US-37](../specs/12-reportes-y-fidelizacion/US-37-mapa-calor-ocupacion-horarios.md) | [spec](./12-reportes-y-fidelizacion/spec.md) · [plan](./12-reportes-y-fidelizacion/plan.md) · [tasks](./12-reportes-y-fidelizacion/tasks.md) |

---

## Principios de Diseño en SDD

1. **Alineación con el DER (`docs/diagrams/puml/der.puml`)**: Todos los modelos de datos y esquemas relacionales planteados en los planes técnicos respetan los nombres de entidades, claves primarias y relaciones del diagrama formal.
2. **Control Basado en Roles (RBAC Multi-Rol)**: Los permisos se evalúan como la unión estricta de los roles asignados al usuario (`PROPIETARIA`, `PROFESORA`, `ALUMNO`, `TUTOR`).
3. **Defensa en Profundidad**: Toda restricción de interfaz gráfica tiene su correspondiente middleware de autorización en el backend.
4. **Preservación Histórica**: Se aplican bajas lógicas y versionado temporal de tarifas; nunca se eliminan registros contables ni asistencias pasadas.
