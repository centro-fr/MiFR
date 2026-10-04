// Texto que Swagger UI muestra arriba de la documentación (info.description, en Markdown).
// Solo se publica fuera de producción, así que puede explicar cómo conseguir un token local.
export const GUIA_DE_PRUEBA = `
API del centro de entrenamiento MiFR.

## Cómo probar

1. Cargar datos de prueba: \`pnpm --filter back db:seed:demo\`
2. Sacar un token: \`pnpm --filter back token -- lucia.gomez@example.com\` (sin email, usa la propietaria)
3. Tocar **Authorize** y pegar el token.
4. En cada operación: **Try it out** → **Execute**.

Para probar como otra persona: **Authorize → Logout** y pegar otro token.
`.trim();
