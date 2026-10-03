# MiFR

Sistema de gestión para un gimnasio / centro de entrenamiento, desarrollado como proyecto de la materia Seminario Integrador.

El proyecto es un monorepo con dos paquetes: una API en Node + TypeScript (`back`) y una SPA en React + Vite (`front`).

## Estado

En etapa inicial. La estructura y las herramientas están armadas; el modelo de datos se está definiendo en `docs/`.

## Requisitos

- Node.js 20 o superior
- pnpm 10.33.2 (`corepack enable` lo instala según el campo `packageManager`)

## Instalación

```bash
pnpm install
```

## Cómo ejecutarlo

Desde la raíz del proyecto:

```bash
pnpm dev:back    # API en modo watch (tsx)
pnpm dev:front   # front en modo desarrollo (Vite)
```

Cada comando corre en su propia terminal. También se puede entrar a la carpeta del paquete y usar sus scripts directamente:

```bash
cd back && pnpm dev
cd front && pnpm dev
```

Con la API levantada fuera de producción, la documentación Swagger queda en `http://localhost:3000/api/v1/docs` y el documento OpenAPI en `http://localhost:3000/api/v1/docs/openapi.json`.

## Estructura

```text
MiFR/
├── back/          API en Node + TypeScript
│   └── src/       código fuente
├── front/         SPA en React 19 + Vite
│   └── src/       componentes y estilos
├── docs/          documentación del proyecto
│   └── diagrams/  diagramas PlantUML (.puml) y sus explicaciones
└── package.json   scripts del monorepo
```

## Scripts disponibles

### Raíz

| Script | Descripción |
| :--- | :--- |
| `pnpm dev:back` | Levanta la API con recarga automática |
| `pnpm dev:front` | Levanta el front con Vite |

### back

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Ejecuta `src/index.ts` con recarga automática |
| `pnpm build` | Compila TypeScript a `dist/` |
| `pnpm start` | Ejecuta la versión compilada |

### front

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compila y genera el bundle de producción |
| `pnpm preview` | Sirve el bundle ya compilado |
| `pnpm lint` | Corre ESLint |

## Variables de entorno

Los archivos `.env` están ignorados por Git. Cuando el proyecto los necesite, se versionará un `.env.example` con las claves esperadas (sin valores reales).

## Documentación

- `docs/diagrams/usuario/usuario-der.puml` — diagrama entidad-relación de Usuario, Perfil y Alumno
- `docs/diagrams/usuario/usuario-der-explicacion.md` — casos de uso que explican ese modelo

Los diagramas `.puml` se pueden ver con la extensión PlantUML de VS Code o en <https://plantuml.com/>
