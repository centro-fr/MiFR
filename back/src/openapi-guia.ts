// Texto que Swagger UI muestra arriba de la documentación (info.description, en Markdown).
// Solo se publica fuera de producción, así que puede explicar cómo conseguir un token local.
export const GUIA_DE_PRUEBA = `
API del sistema de gestión del centro de entrenamiento MiFR.

## Cómo probar la API desde esta página

Casi todas las operaciones piden un token. El login real (\`POST /auth/google\`) necesita un \`id_token\`
emitido por Google desde el front, así que para probar localmente se usa un token propio firmado con el
\`JWT_SECRET\` de \`back/.env\`.

**1. Datos en la base local** (una sola vez):

\`\`\`
pnpm --filter back db:seed -- tu-email@gmail.com Nombre Apellido 1990-01-01
pnpm --filter back db:seed:demo
\`\`\`

**2. Un token por persona:**

\`\`\`
pnpm --filter back token                              # la primera propietaria de la base
pnpm --filter back token -- marina.sosa@example.com   # PROPIETARIA + PROFESORA
pnpm --filter back token -- lucia.gomez@example.com   # solo PROFESORA
\`\`\`

**3.** Tocar **Authorize** y pegar el token *sin* la palabra \`Bearer\`. Para probar como otra persona:
**Authorize → Logout** y pegar el otro token.

**4.** En cada operación: **Try it out**, ajustar el ejemplo y **Execute**. Abajo de cada operación están
el permiso o el rol que exige y los códigos de respuesta posibles.

## Casos para verificar los criterios de aceptación

- **CA-05, horario superpuesto:** como propietaria, \`POST /horarios\` el lunes de 18:00 a 19:00 y después
  de 18:30 a 19:30 con la misma profesora → **409**. De 19:00 a 20:00 sí se permite → **201**.
- **CA-02, personalizada sin cupo:** \`POST /actividades\` con modalidad \`PERSONALIZADA\` y sin
  \`cupo_maximo\` → **400**.
- **CA-03, baja de actividad:** \`DELETE /actividades/{id}\` de una actividad con horarios activos → **409**;
  después de dar de baja sus horarios → **200**.
- **CA-05 de permisos:** con el token de una profesora, \`GET /seguridad/matriz\` o \`POST /actividades\` → **403**.
- **CA-08, la matriz rige al instante:** como propietaria, \`PUT /seguridad/matriz\` otorgando \`USUARIOS_VER\`
  a \`PROFESORA\`; con el token de la profesora, \`GET /usuarios\` pasa de 403 a **200**.
- **CA-06, multi-rol:** con el token de Marina, \`GET /auth/me\` devuelve los dos roles y la unión de permisos.
- **Usuario dado de baja:** como propietaria, \`PATCH /usuarios/{id}\` con \`{"estado": "INACTIVO"}\`; con el
  token de esa persona, cualquier pedido → **403** aunque el token no haya vencido.
- **Entradas inválidas:** un JSON mal formado → **400** \`JSON_INVALIDO\`; \`GET /actividades/99999999999\` → **400**.

No se pueden probar desde acá los pedidos simultáneos ni CORS: para eso están los tests (\`pnpm test\`).
`.trim();
