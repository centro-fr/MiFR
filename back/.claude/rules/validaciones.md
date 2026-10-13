# Validación de entrada

Toda entrada se valida con **Zod**, en la capa de rutas, con `validate({ body, params, query })`. El service confía en lo que le llega. Nunca se confía en lo que valida el front: el back vuelve a validar todo.

Cada `<x>.schemas.ts` arma sus campos con los esquemas compartidos de `src/shared/utils/`. Si un tipo de campo se repite en dos componentes, el esquema va a `shared/utils/` y no se copia.

| Esquema compartido | Archivo | Qué garantiza |
| --- | --- | --- |
| `idSchema` | `esquemas-id.ts` | Entero positivo hasta el máximo de `INTEGER` (2.147.483.647). Rechaza `0`, `-0`, negativos y decimales |
| `idDesdeTextoSchema` | `esquemas-id.ts` | Para params y query: solo dígitos decimales sin ceros adelante (`"1"` sí; `"01"`, `"-0"`, `"1e1"`, `"0x10"`, `" 7 "` no) |
| `enteroNoNegativoSchema(max)` | `esquemas-numero.ts` | Entero entre 0 y `max`. Rechaza `-0`, que en JSON es un número válido y `min(0)` deja pasar |
| `medidaCorporalSchema(nombre, unidad, min, max)` | `esquemas-numero.ts` | Medida corporal de una columna `NUMERIC(6,2)`: entre un mínimo y un máximo razonables para la medida y con dos decimales como máximo. Peso (2 a 400 kg) y talla (40 a 250 cm) |
| `montoSchema(nombre)` | `esquemas-numero.ts` | Monto de dinero de una columna `NUMERIC(10,2)`: mayor a 0, hasta 99.999.999,99 y con dos decimales como máximo. Precios, cuotas y pagos |
| `textoSchema(max)` | `esquemas-texto.ts` | Recorta espacios, exige al menos una letra (`"-0"`, `"123"` o `"!!!"` no son un nombre) y rechaza caracteres de control e invisibles |
| `textoOpcionalSchema(max)` | `esquemas-texto.ts` | Igual, para columnas que admiten NULL: `""` se guarda como NULL. Con `{ multilinea: true }` acepta saltos de línea (textarea) |
| `textoBusquedaSchema(max)` | `esquemas-texto.ts` | Para filtros: puede venir vacío y no exige letras, pero tiene largo máximo y no admite caracteres de control |
| `nombreSchema` | `esquemas-persona.ts` | Letras de cualquier idioma, espacios, apóstrofo, guion y punto; empieza con letra. Máximo 60 |
| `dniSchema` | `esquemas-persona.ts` | Entre 6 y 10 dígitos, sin puntos ni ceros adelante |
| `telefonoSchema` | `esquemas-persona.ts` | Dígitos, espacios, guiones, paréntesis y un `+` inicial; empieza con `+`, dígito o paréntesis (`"-1234567"` no); entre 7 y 15 dígitos y 20 caracteres |
| `emailSchema` | `esquemas-persona.ts` | Email válido, recortado y en minúsculas, hasta 120 caracteres |
| `fechaSchema` | `esquemas-fecha.ts` | Fecha `AAAA-MM-DD` que existe en el calendario, convertida a las 00:00 UTC para una columna `DATE` |
| `fechaNacimientoSchema` | `esquemas-persona.ts` | Fecha que existe en el calendario (`2026-02-30` no), entre 1900-01-01 y hoy en Argentina |

## Reglas

1. **Números.** Enteros con `.int()`. Los ids con `idSchema`. Los que no pueden ser negativos, con `positive()` si el 0 no tiene sentido (precio, cupo) o con `enteroNoNegativoSchema` si sí (días de gracia): nunca con `min(0)` a secas, que acepta `-0`. Cada número tiene un máximo, que sale del tipo del DER (`SMALLINT` 32.767, `INTEGER` 2.147.483.647, `NUMERIC(10,2)` hasta 99.999.999,99) o de la regla de negocio (días 1 a 6, clases por semana 1 a 7). Los montos con decimales limitan los decimales a los que guarda la columna.
2. **Números que llegan como texto.** En params y query todo llega como texto: los ids con `idDesdeTextoSchema` y los demás con una regex de dígitos antes de convertir. Nunca `Number()` ni `z.coerce.number()` a secas, que aceptan `"1e1"`, `" 7 "` o `""`.
3. **Largos.** Todo texto tiene `max()`, igual al `VARCHAR` de su columna en el DER. Un texto más largo que la columna termina en un error de Postgres (500) en lugar de un 400.
4. **Textos.** Con `textoSchema` o `textoOpcionalSchema`, nunca `z.string()` a secas para un dato que se guarda: los dos recortan espacios, exigen letras y rechazan caracteres de control. El carácter nulo (`\0`) que Postgres rechaza en un texto también terminaba en 500.
5. **Emails.** Con `emailSchema`: se guardan recortados y en minúsculas, así `Ana@Gmail.com` y `ana@gmail.com` son el mismo usuario para el único de la base. El email tiene que ser el de la cuenta de Google de la persona, porque el login compara contra el email que devuelve Google.
6. **Fechas.** Llegan como texto `AAAA-MM-DD` y se validan con `z.string().date()`, que rechaza fechas que no existen; recién después se convierten a `Date` a las 00:00 UTC. Nunca `z.coerce.date()`, que convierte `null`, `0` o `true` en 1970-01-01. El "hoy" es siempre `fechaActualArgentina()`.
7. **Enumerados.** Con `z.enum([...])` y los valores exactos del DER. Si un valor del enum no corresponde a esa operación, se deja afuera del schema (la baja de un alumno no acepta `CAMBIO_PLAN`).
8. **Listas.** Con `min()` si no puede venir vacía, `max()` siempre (una lista sin tope llega entera a las consultas) y sin repetidos cuando corresponde (`refine` con un `Set`).
9. **Booleanos.** En el body, `z.boolean()`: `"true"` o `1` no son booleanos. En la query, `z.enum(["true", "false"])` y después se convierte.
10. **Campos que no están en el schema** se descartan (comportamiento por defecto de Zod): un `estado` o un `id_usuario` que manda el cliente nunca llega al service.
11. **Reglas entre campos** (menor de edad con tutor, clase suelta sin días de gracia) van en un `refine` del schema si solo dependen de la entrada, y en el service si necesitan la base o el día de hoy.

## Tests

Cada schema tiene su `<x>.schemas.test.ts` con lo que acepta y, sobre todo, lo que rechaza: `-0`, negativos y decimales donde no corresponden, números en texto, textos sin letras o con caracteres de control, textos más largos que la columna, emails y fechas mal formados, enumerados desconocidos y listas vacías, repetidas o más largas que el tope. Ver `testing.md`.
