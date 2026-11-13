# Alumnos
 - [ ] Verificar el caso en el que un alumno tenga mas de un plan contratado. En las vistas (verificar si esta contemplado):
   Contemplado en la ficha del alumno: `HistorialPlanesAlumno` lista todas las inscripciones (tanto activas como finalizadas) con su estado, horarios, fechas y profesora. En la pestaña Plan se visualiza el plan vigente y el historial completo. Tambien en las vistas de propietaria y profesora.
 
 # Tutor - Hijos
 - [ ] Verificar si contempla la vista en caso de que un tutor tenga mas de un alumno a cargo:
   Contemplado en `mi-progreso-page.tsx` con el componente `SelectorDeAlumno`, permitiendo al tutor alternar fluidamente entre sus distintos menores a cargo para consultar rutinas, mediciones y asistencias.

# Otro

- [ ] Verifica estos [actualizar-schema.mjs] y [montar-honorarios.msj] para que estan y si deberian estar ahi. A mi me parece que no, y si no va fijate como deberia ser la forma correcta de esto.



# Página pública: pulido visual

- [ ] Instalar las skills de diseño y revisarlas antes de usarlas (bajan y ejecutan código de terceros): `npx skills add emilkowalski/skills`, `npx skills add Leonxlnx/taste-skill` y `npx impeccable install`.
- [ ] Entrada de la portada coreografiada: el título línea por línea, la foto con un zoom suave y al final el botón "Quiero empezar", en menos de un segundo y sin movimiento para quien pidió reducirlo.
- [ ] Pulir las 7 transiciones con la curva genérica `ease`: curvas más naturales, una respuesta chica al tocar los botones y efectos de hover solo en computadoras (en el celular quedan "pegados").
- [ ] Que se sienta nativa en el celular (se abre mucho desde Instagram y WhatsApp): la portada que salta cuando se esconde la barra del navegador, el destello gris al tocar, el contenido debajo del notch y el color de la barra de estado.
- [ ] Revisar dónde sumar movimiento y dónde no: por ejemplo, que las tarjetas de actividades aparezcan al hacer scroll.
- [ ] Probarla con datos extremos: nombres de actividades muy largos, una sola actividad o ninguna.
- [ ] Pulido general: tipografía, espacios y estados de los botones. Con taste-skill e impeccable, una revisión "anti-genérica" completa en un navegador real.

# Antes de desplegar

- [ ] `GET /alumnos/mi-panel`: el portal del alumno lo pide, pero el back no tiene la ruta (solo existe en los mocks) y responde 403.
- [ ] Cargar las actividades reales del centro en `front/src/features/publico/utils/actividades-del-centro.ts`.
- [ ] Actualizar `docs/diagrams/enterprise_architect/MiFR.eap` a mano: sin DifusionPublica ni ResumenDiarioPropietaria, con SuscripcionPush.
- [ ] Probar los avisos push en un celular real (Android y iPhone con la app agregada a inicio) después del deploy: ver `docs/DESPLIEGUE.md`, paso 9.
