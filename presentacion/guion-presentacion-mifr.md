# Guion y Speech de Presentación: MiFR (Centro de Entrenamiento FR)

> **Materia:** Seminario Integrador – UTN Facultad Regional Córdoba  
> **Tiempo Total Máximo:** 14:00 minutos  
> **Estructura del Equipo:** 7 integrantes  
> **Asignación:** 2 diapositivas y **exactamente 2 minutos por integrante** (roles anónimos / a definir por el equipo)  
> **Tono y Lenguaje:** Profesional, fluido y centrado en el negocio y la ingeniería. **Sin códigos de historias (sin nombrar "US" ni "users")**.  
> **Propietaria:** **Florencia Romero** (Centro de Entrenamiento FR).

---

## ⏱️ Tabla de Cronograma y Bloques (7 Integrantes)

| Bloque | Rol / Orador | Diapositivas | Eje Temático y Alcance | Tiempo Acumulado |
|---|---|---|---|---|
| **Bloque 1** | **Orador 1** *(A definir)* | **1 y 2** | Portada, justificación del proyecto y contexto real del Centro FR de Florencia Romero en Perico, Jujuy. | `00:00 – 02:00` |
| **Bloque 2** | **Orador 2** *(A definir)* | **3 y 4** | El problema del papel: los 3 registros aislados (el cuaderno de honorarios de Florencia, cuadernos de profes y tarjetas) y los problemas de gestión. | `02:00 – 04:00` |
| **Bloque 3** | **Orador 3** *(A definir)* | **5 y 6** | MiFR como fuente única de verdad y arquitectura de seguridad con control de accesos multi-rol. | `04:00 – 06:00` |
| **Bloque 4** | **Orador 4** *(A definir)* | **7 y 8** | Módulos clave: Cuotas de fecha a fecha (estados de habilitación, pagos duales) y Asistencia flexible en 1 toque. | `06:00 – 08:00` |
| **Bloque 5** | **Orador 5** *(A definir)* | **9 y 10** | Regla de cálculo e informe de Honorarios y Suplencias + Demostración interactiva en vivo del sistema. | `08:00 – 10:00` |
| **Bloque 6** | **Orador 6** *(A definir)* | **11 y 12** | Stack técnico (React 19, Node.js 22, Express, Prisma, PostgreSQL) y metodología de trabajo con entregas continuas. | `10:00 – 12:00` |
| **Bloque 7** | **Orador 7** *(A definir)* | **13 y 14** | Estado de avance funcional, roadmap de próximos pasos, impacto real y apertura a preguntas. | `12:00 – 14:00` |

---

## 🎤 Speech Detallado Diapositiva por Diapositiva

---

### ORADOR 1 (00:00 – 02:00)
**Foco:** Apertura institucional, motivación del proyecto y punto de inflexión del cliente.

#### Slide 1: Portada (00:00 – 00:55) · *~120 palabras*
* **Visual:** Título *"Centro de Entrenamiento FR · MiFR: Menos papeles, más entrenamiento"*, isotipo y fecha.
* **Speech:**
  > "Buenas tardes a los profesores y compañeros. Somos el equipo del proyecto **MiFR**, desarrollado en el marco del Seminario Integrador de la UTN Facultad Regional Córdoba.  
  > Nuestro desarrollo nace de un caso de vinculación directa con una organización real: el **Centro de Entrenamiento FR**.  
  > Su dueña y fundadora, **Florencia Romero**, administra la institución y al mismo tiempo es profesora activa. Bajo la premisa *'Menos papeles, más entrenamiento'*, identificamos que la operatoria diaria del centro estaba asfixiada por procesos manuales en papel que le impedían profesionalizar su gestión y brindar una mejor atención a su comunidad deportiva."

#### Slide 2: La Organización Hoy (00:55 – 01:50) · *~140 palabras*
* **Visual:** Perico, Jujuy · Sede única 240 m² · Rango 50 a 75 alumnos · 4 a 5 profesores · 6 actividades grupales + 1 personalizada.
* **Speech:**
  > "Para ponerlos en contexto sobre la organización: el Centro de Entrenamiento FR está ubicado en la ciudad de **Perico, en la provincia de Jujuy**, y opera en una sede única de aproximadamente 240 metros cuadrados.  
  > En su dinámica cotidiana, el centro maneja habitualmente un volumen que oscila en un **rango de entre 50 y 75 alumnos activos**, con un plantel docente de **entre 4 y 5 profesores**, ofreciendo 6 actividades grupales —como Funcional, GAP, Cross y Ritmos— además de un servicio de entrenamiento personalizado.  
  > Administrar este flujo de alumnos con múltiples docentes a cargo vuelve sumamente compleja la operatoria diaria: llevar el control de asistencias y el seguimiento de cuotas en papel resulta propenso a desajustes, y el cálculo manual de honorarios docentes se vuelve un proceso sumamente tedioso."
* **Pase de palabra (01:50 – 02:00):**
  > *"A continuación, le paso la palabra a mi compañero/a para que les explique detalladamente cómo opera hoy la organización y cuáles son los tres problemas críticos que diagnosticamos."*

---

### ORADOR 2 (02:00 – 04:00)
**Foco:** Radiografía del problema, los 3 registros en papel y los 3 problemas del negocio.

#### Slide 3: ¿Cómo funciona hoy? (02:00 – 02:55) · *~135 palabras*
* **Visual:** Tres registros desconectados: 01 Cuaderno de la propietaria, 02 Cuadernos de las profesoras, 03 Tarjeta de asistencia de los alumnos.
* **Speech:**
  > "Gracias. Al realizar el relevamiento nos encontramos con que la información crítica del centro no está centralizada, sino fragmentada en **tres soportes de papel completamente aislados entre sí**:  
  > Primero, el **cuaderno de la propietaria**, que Florencia utiliza principalmente para llevar el registro de sus profesores, asentar las suplencias y calcular a mano los honorarios a fin de mes.  
  > Segundo, los **cuadernos individuales de cada profesora**, donde cada docente anota día a día quién asiste a su clase y lleva su propia lista de alumnos a cargo.  
  > Y tercero, la **tarjeta física de asistencia**, el clásico cartón que cada alumno debe llevar en el bolso para que se lo sellen al ingresar.  
  > Estos tres registros no se comunican; cualquier control administrativo exige cruzar y cotejar manualmente cuadernos y cartones independientes."

#### Slide 4: ¿Qué problemas tiene? (02:55 – 03:50) · *~140 palabras*
* **Visual:** Tres problemas concretos: 1. ¿Quién está al día y a quién se le venció? (Cuotas) · 2. ¿Quién vino y quién está dejando de venir? (Asistencia y deserción) · 3. ¿Cuánto le corresponde a cada profesor? (Honorarios).
* **Speech:**
  > "Esa fragmentación se traduce en **tres problemas críticos** que impactan directamente en el negocio:  
  > En primer lugar, el **descontrol en el seguimiento de cuotas**. Al no vencer en una fecha fija de mes calendario sino de forma particular para cada alumno, hay personas que entrenan con la cuota vencida durante semanas sin que nadie lo note a tiempo, generando pérdidas de ingresos.  
  > En segundo lugar, la **falta de trazabilidad en la asistencia**. La pérdida o el olvido del cartón es habitual, y además, si un alumno deja de asistir durante 10 o 15 días, el centro no tiene forma de enterarse automáticamente para contactarlo antes de que abandone la actividad.  
  > Y en tercer lugar, el **cálculo manual de honorarios**. A fin de mes, Florencia tiene que sentarse con su cuaderno a cruzar las suplencias anotadas con las listas de cada profesora, un proceso tedioso que consume horas y suele generar dudas."
* **Pase de palabra (03:50 – 04:00):**
  > *"Frente a este escenario, le cedo la palabra a mi compañero/a para que presente la solución integral que diseñamos: la plataforma MiFR."*

---

### ORADOR 3 (04:00 – 06:00)
**Foco:** Concepción de MiFR como registro único, seguridad y modelo multi-rol adaptado a dispositivos.

#### Slide 5: MiFR (04:00 – 04:55) · *~125 palabras*
* **Visual:** Definición y mockups: Sistema web centralizado que unifica alumnos, planes, pagos, asistencia y honorarios en un único registro compartido.
* **Speech:**
  > "Gracias. Frente a esta problemática les presentamos **MiFR**, haciendo realidad la premisa con la que iniciamos: *'Menos papeles, más entrenamiento'*.  
  > **MiFR centraliza el manejo de las actividades del centro**, unificando alumnos, planes, pagos, asistencia y honorarios en un único registro compartido.  
  > El sistema reemplaza por completo los tres registros en papel aislados por una plataforma web integrada: cuando un alumno abona, se inscribe o asiste a clase, el dato impacta de inmediato en todo el sistema. Esto elimina la doble carga y garantiza que tanto Florencia como su equipo docente cuenten siempre con información certera y en tiempo real."

#### Slide 6: Cada rol ve solo lo suyo (04:55 – 05:50) · *~145 palabras*
* **Visual:** Matriz de roles y dispositivos: Propietaria (PC), Profesora (Celular), Alumno/Tutor (Celular), Visitante (Web pública). Soporte de Multi-Rol nativo.
* **Speech:**
  > "Para garantizar seguridad y simplicidad, implementamos un esquema estricto de **Control de Acceso Basado en Roles** con inicio de sesión seguro mediante Google y tokens de autenticación, adaptado al dispositivo que cada uno usa en su día a día:  
  > * La **Propietaria**, desde su computadora, administra el centro completo: configuración de tarifas y cupos, conciliación de pagos e informes de honorarios.  
  > * La **Profesora**, desde una interfaz móvil rápida, consulta las clases de su turno, ve a sus inscriptos y toma asistencia en segundos.  
  > * El **Alumno o Tutor**, desde su celular, accede a su portal para consultar el estado de la cuota de su plan, anotar su asistencia por su cuenta y seguir su constancia deportiva.  
  > * Y el **Visitante** puede consultar en la web pública las actividades que ofrece el centro y qué días se dictan antes de inscribirse.  
  > Un punto clave del negocio es el **soporte multi-rol nativo**: en la realidad de FR, Florencia es la propietaria del negocio pero a la vez dicta clases como profesora; el sistema unifica sus permisos sin exigirle cambiar de cuenta ni cerrar sesión."
* **Pase de palabra (05:50 – 06:00):**
  > *"A continuación, le paso la palabra a mi compañero/a para profundizar en el funcionamiento de dos de los módulos centrales: cuotas y asistencia."*

---

### ORADOR 4 (06:00 – 08:00)
**Foco:** Módulo de Cuotas dinámicas (estados de habilitación, pagos duales) y Asistencia flexible en sala.

#### Slide 7: Seguimiento de Cuotas (06:00 – 06:55) · *~135 palabras*
* **Visual:** Cuaderno vs Mi Cuota · Cuotas fecha a fecha · Tolerancia · Transferencias y Efectivo · Estados de habilitación.
* **Speech:**
  > "Gracias. El módulo de **Cuotas y Pagos** digitaliza una regla de negocio muy particular: en el Centro FR las cuotas no vencen un día fijo del mes, sino que corren **estrictamente de fecha a fecha** según el día en que el alumno inició su plan.  
  > El sistema calcula de forma autónoma el estado de habilitación de cada persona, distinguiendo con claridad si el alumno se encuentra *al día*, *por vencer* o *con cuota vencida*.  
  > Además, resuelve los dos canales habituales de cobro:  
  > * Para **transferencias bancarias**, el alumno o su tutor informa la transferencia desde su celular indicando monto y fecha —sin necesidad de adjuntar comprobantes—, y el aviso entra en una lista de espera para que Florencia lo verifique y confirme con un clic tras chequear su cuenta.  
  > * Para **cobros en efectivo en mano**, cualquier profesora puede recibir el dinero en el salón; el sistema lo registra como 'pendiente de rendición', permitiendo un arqueo diario exacto cuando se lo entrega a Florencia.  
  > Todo esto respaldado por días de gracia configurables y recordatorios automáticos previos al vencimiento."

#### Slide 8: Control de Asistencia (06:55 – 07:50) · *~145 palabras*
* **Visual:** Tarjeta en papel vs Mi Tarjeta · Marcado en 1 toque · Inclusión adultos mayores y tutores · Inasistencias automáticas · Rachas y medallas de constancia.
* **Speech:**
  > "Por su parte, el módulo de **Asistencia** transforma el viejo cartón de papel en una experiencia ágil e inclusiva:  
  > * En el celular de la profesora, cada clase habilita una ventana de asistencia donde la lista de inscriptos muestra de un vistazo el estado de la cuota de cada alumno y permite registrar el presente en un solo toque.  
  > * Para adaptarse a la realidad del centro —donde asisten menores de edad y también adultos mayores— el sistema ofrece flexibilidad total: el ingreso lo puede marcar el alumno desde su teléfono, su **tutor asociado**, o la propia profesora si el alumno no llevó su celular.  
  > * Al finalizar el horario de la clase, el sistema registra automáticamente como ausentes a quienes no asistieron.  
  > * Además, el motor de análisis detecta ausencias consecutivas y emite alertas preventivas para evitar que el alumno abandone.  
  > Y para motivar la concurrencia, incorporamos incentivos de constancia con rachas de días seguidos, medallas y rankings de asistencia."
* **Pase de palabra (07:50 – 08:00):**
  > *"Ahora, le cedo la palabra a mi compañero/a para que explique cómo calculamos los honorarios docentes y luego pasaremos a ver el sistema en vivo."*

---

### ORADOR 5 (08:00 – 10:00)
**Foco:** Lógica de cálculo e informe de honorarios y suplencias + Demostración funcional en vivo.

#### Slide 9: Cálculo de Honorarios (08:00 – 08:45) · *~125 palabras*
* **Visual:** Cálculo de honorarios: Alumnos a cargo y plan · Regla por inscripto activo (asista o no) · Suplencias por separado · Monto de referencia informativo confidencial.
* **Speech:**
  > "Gracias. El módulo de **Cálculo de Honorarios** viene a reemplazar el cuaderno principal de Florencia facilitando una regla de negocio muy particular:  
  > En este centro, las profesoras no cobran por hora reloj ni por presente en clase, sino **un monto de referencia por cada alumno inscripto activo en su actividad**, asista o falte a la clase.  
  > A esto se suma el control de **suplencias**: cuando una profesora no puede asistir y otra colega cubre su horario, esa clase se descuenta del cálculo habitual de la titular y se computa de manera diferenciada para la docente suplente.  
  > Es importante remarcar que **el sistema nunca realiza liquidaciones ni pagos**: su función es puramente **calcular e informar un monto mensual de referencia**, visible de manera confidencial y exclusiva para la propietaria, ahorrándole cálculos manuales a fin de mes."

#### Slide 10: DEMO en Vivo (08:45 – 09:50) · *~140 palabras*
* **Visual:** Código QR proyectado / Acceso a la demo (`localhost:5173` o entorno desplegado).
* **Speech:**
  > "Para ver cómo interactúan estas piezas en la práctica, preparamos un entorno de demostración en vivo. Quien desee puede escanear el código QR en pantalla y recorrer el sistema desde su teléfono.  
  > **Es fundamental recordar que nuestro desarrollo avanza de forma incremental por Sprints, y lo que vamos a ver en esta demo refleja el alcance funcional consolidado hasta el Sprint 2**, mientras que el Sprint 3 —correspondiente al núcleo transaccional de pagos y asistencia— se encuentra actualmente en desarrollo e integración activa.  
  > *(Muestra la pantalla en vivo y ejecuta las interacciones clave)*:  
  > En pantalla pueden ver lo construido hasta este punto:  
  > 1. Primero, la **página pública** de difusión, donde cualquier persona puede consultar la propuesta del centro: las distintas actividades y qué días se dictan.  
  > 2. Segundo, el **acceso seguro y control de roles**: ingresamos con la sesión de Florencia para ver cómo el sistema adapta el menú según sus permisos.  
  > 3. Y tercero, la **gestión de planes y el registro de alumnos**: el catálogo de planes con sus tarifas vigentes y el flujo de pre-inscripción de un alumno, asignándole su horario y vinculando a su tutor si es menor.  
  > Todo con respuesta inmediata, diseño responsivo y persistencia validada."
* **Pase de palabra (09:50 – 10:00):**
  > *"A continuación, le paso la palabra a mi compañero/a para que presente las decisiones de arquitectura técnica y la metodología con la que construimos el sistema."*

---

### ORADOR 6 (10:00 – 12:00)
**Foco:** Arquitectura técnica desacoplada, modelo de datos y metodología de ingeniería.

#### Slide 11: Arquitectura y Stack Tecnológico (10:00 – 10:55) · *~145 palabras*
* **Visual:** Diagrama Cliente-Servidor-DB: React 19 + TypeScript + Tailwind + shadcn/ui -> API REST Node.js 22 + Express + Zod + Prisma -> PostgreSQL 16.
* **Speech:**
  > "Gracias. Para soportar esta solución implementamos una arquitectura web desacoplada organizada en un monorepo profesional:  
  > * En el **Frontend**, construimos una aplicación web de una sola página con **React 19, TypeScript y Vite**, utilizando **Tailwind CSS** y componentes accesibles de **shadcn/ui**. Esto nos garantizó una interfaz rápida, con diseño mobile-first optimizado para celulares y adaptable a pantallas de escritorio.  
  > * En el **Backend**, desarrollamos una API REST sobre **Node.js 22 con Express y TypeScript**, estructurada en capas limpias de controladores, servicios y acceso a datos. Cada dato recibido se valida estrictamente en tiempo de ejecución mediante esquemas tipados con **Zod**, asegurando integridad en cada petición.  
  > * Para la persistencia utilizamos **PostgreSQL 16** con el ORM **Prisma**, aplicando un modelo relacional robusto con bajas lógicas y tarifas versionadas en el tiempo, asegurando que nunca se pierda el historial contable."

#### Slide 12: Metodología de Trabajo y Calidad (10:55 – 11:50) · *~145 palabras*
* **Visual:** Metodología ágil · Equipo de 7 integrantes · 3 meses de plazo · Desarrollo guiado por especificaciones y pruebas de integración.
* **Speech:**
  > "Coordinar un equipo de **7 integrantes** con un plazo estricto de **3 meses** requirió una metodología ágil y rigurosa. Adoptamos un marco de trabajo iterativo con entregas incrementales y desarrollo guiado por especificaciones:  
  > Cada módulo del sistema cuenta con una especificación funcional detallada, un plan de diseño técnico y un plan de verificación.  
  > Esta forma de trabajo nos aportó tres ventajas fundamentales:  
  > 1. Validar avances continuos directamente con Florencia en Jujuy a través de entrevistas y pruebas de aceptación temprana.  
  > 2. Asegurar la calidad del software con pruebas automatizadas unitarias y de integración, cubriendo completamente los flujos críticos de autenticación, permisos y gestión de datos.  
  > 3. Trabajar de manera ordenada y paralela entre los siete integrantes mediante control de versiones y revisiones de código obligatorias."
* **Pase de palabra (11:50 – 12:00):**
  > *"Para concluir nuestra presentación, le cedo la palabra a mi compañero/a para que exponga el estado de avance actual y las conclusiones del proyecto."*

---

### ORADOR 7 (12:00 – 14:00)
**Foco:** Estado de entrega funcional, roadmap futuro, impacto del proyecto y cierre.

#### Slide 13: Estado Actual del Desarrollo (12:00 – 12:55) · *~135 palabras*
* **Visual:** Semáforo de avance de módulos: Terminados (Alumnos, Planes, Cuotas) · En Desarrollo (Asistencia y Suplencias) · Pendientes (Honorarios, Rachas y medallas, Alertas).
* **Speech:**
  > "Gracias. Siguiendo la planificación de nuestro proyecto, el estado actual de entrega de los módulos es el siguiente:  
  > * **Completos y probados:** La autenticación y gestión de permisos; la administración de actividades, horarios y cupos; el registro de alumnos e inscripciones; y el catálogo de planes con actualización de precios.  
  > * **En integración activa:** El circuito completo de pagos de cuotas con conciliación de transferencias y efectivo, y el registro de asistencia en el salón junto con las suplencias docentes.  
  > * **Próximos pasos a entregar:** El cálculo consolidado de honorarios docentes; el sistema de notificaciones automáticas previas a vencimientos; el sistema de rachas y medallas para incentivar la constancia de los alumnos; y los informes de asistencia y ocupación de horarios para el centro."

#### Slide 14: Cierre, Impacto y Preguntas (12:55 – 13:45) · *~125 palabras*
* **Visual:** Foto del equipo (los 7 integrantes), MiFR · Centro de Entrenamiento FR, Espacio de Preguntas.
* **Speech:**
  > "A modo de cierre: **MiFR** no es solo un desarrollo de software académico; es una solución concreta que transforma el día a día de un centro de entrenamiento familiar en Perico.  
  > Reemplazamos tres registros de papel desconectados por una plataforma unificada, rápida y segura que protege los ingresos del centro, previene la deserción de los alumnos y le devuelve a Florencia la tranquilidad de gestionar su negocio con claridad.  
  > Agradecemos a los profesores de la cátedra por el acompañamiento y a Florencia Romero por abrirnos las puertas de su centro.  
  > Quedamos a plena disposición del jurado para responder sus preguntas y profundizar en los aspectos que deseen. Muchas gracias."
* **Margen de seguridad:** *(13:45 – 14:00) 15 segundos disponibles antes de cumplirse los 14 minutos exactos.*

---

## 🎯 Recomendaciones Finales para la Presentación

1. **Definición de oradores:** El equipo puede asignar libremente quién toma el **Orador 1 a 7** según la comodidad de cada uno con los temas (Negocio, Módulos, Demo, Arquitectura, etc.).
2. **Ensayo con cronómetro individual:** Cada integrante debe cronometrarse en casa para hablar en un rango de entre **1:40 min y 1:50 min**, dejando 10 segundos para el pase al siguiente.
3. **Pases de palabra:** Al pasar la palabra, cada uno puede decir el nombre real del compañero asignado (*"A continuación, [Nombre] les va a explicar..."*).
4. **Preparación de la Demo (Orador 5):** Tener las sesiones de Alumno, Profesora y Propietaria ya abiertas y cargadas en pestañas del navegador para mostrar los flujos sin depender de tiempos de red.
