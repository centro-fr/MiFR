# Herramientas MCP

Por ahora el proyecto usa dos.

## codebase-memory

Es la herramienta por defecto para explorar código, antes de ponerse a leer archivos a mano. Mantiene un grafo del repositorio, así que responde preguntas de estructura sin recorrer carpetas.

| Para | Usar |
| --- | --- |
| Encontrar una función, clase o ruta | `search_graph` con patrón de nombre |
| Seguir una cadena de llamadas | `trace_path` |
| Ver el código exacto de un símbolo | `get_code_snippet` |
| Entender la estructura general | `get_architecture` |
| Búsqueda de texto con contexto de grafo | `search_code` |
| Consultas complejas | `query_graph` |

Si el proyecto todavía no está indexado, correr `index_repository` primero.

`Grep`, `Glob` y `Read` siguen siendo la opción correcta para texto plano, archivos de configuración, diagramas `.puml`, Markdown y todo lo que no sea código. Y siempre hay que leer un archivo antes de editarlo.

## caveman

Comprime el estilo de las respuestas en el chat.

Límite importante: **todo lo que se persiste fuera del chat se escribe en prosa normal.** Código, comentarios, mensajes de commit, documentación, descripciones de issues y pull requests. La compresión es para la conversación, no para los archivos del repositorio ni para lo que van a leer otras personas.
