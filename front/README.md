# MiFR — Front

SPA del sistema MiFR en React 19 + TypeScript, con Vite, Tailwind, React Router, TanStack Query, Axios, Zod y MSW. Es un paquete del monorepo: la instalación, la base y el back se levantan como explica el [README de la raíz](../README.md).

## Cómo ejecutarlo

Desde la raíz del monorepo:

```bash
pnpm dev:front    # http://localhost:5173
```

O desde `front/`:

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Servidor de desarrollo en el puerto 5173 |
| `pnpm build` | Verifica los tipos y genera el bundle de producción |
| `pnpm preview` | Sirve el bundle ya compilado |
| `pnpm lint` | Corre ESLint |

## Cómo habla con el back

El navegador solo le pide a `/api/v1/...` en el mismo origen. En desarrollo, Vite reenvía `/api` a la API (`API_URL`, por defecto `http://localhost:3000`); en producción lo hace Netlify (`netlify.toml`). Por eso el front no necesita la URL del back ni configurar CORS.

Los tipos de cada respuesta salen del contrato del back (Swagger en `http://localhost:3000/api/v1/docs`) y se validan con Zod en `features/<dominio>/schemas/`. El front muestra solo datos que el back guarda.

## Modos de trabajo

| Modo | `front/.env` | Qué hace |
| :--- | :--- | :--- |
| API real con Google | `VITE_GOOGLE_CLIENT_ID=<client id>` | Login con Google contra el back |
| API real sin Google | `VITE_LOGIN_DESARROLLO=true` | El login pide el email de un usuario dado de alta. Necesita `LOGIN_DESARROLLO=true` en `back/.env` |
| Mocks | `VITE_USE_MOCKS=true` | MSW responde en lugar del back, con la forma, las reglas y los datos de `back/prisma/seed-demo.ts`. No hace falta levantar el back |

Si no hay client ID de Google ni login de desarrollo (y los mocks están apagados), la pantalla de login avisa que falta configuración. Después de cambiar el `.env`, Vite se reinicia solo.

## Variables de entorno

Se copian de `.env.example` a `.env`, que está ignorado por Git.

| Variable | Para qué |
| :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | Botón de inicio de sesión con Google |
| `VITE_LOGIN_DESARROLLO` | Con `true`, el login pide un email en lugar de Google. Necesita `LOGIN_DESARROLLO=true` en el back |
| `VITE_USE_MOCKS` | Con `true`, el front usa los mocks de MSW en lugar de la API real. Sin valor o en `false`, usa la API |
| `API_URL` | Adónde reenvía `/api` el servidor de Vite, por defecto `http://localhost:3000`. No lleva prefijo `VITE_`: no llega al navegador |

## Estructura

```text
src/
├── api/          cliente Axios (/api/v1) y manejo de errores de la API
├── app/          rutas y providers (React Query, sesión)
├── components/   layout, guards, modales y componentes de UI compartidos
├── features/     un dominio por carpeta: auth, seguridad, actividades, horarios
│   └── <dominio>/   api/, hooks/, schemas/, components/, pages/, utils/
├── hooks/        hooks compartidos
├── mocks/        MSW: db.ts (estado en memoria), data/ (semilla) y handlers/ (uno por recurso)
├── pages/        dashboard y pantallas genéricas ("En construcción", 404)
├── stores/       estado global liviano (tema)
├── types/        tipos de vista compartidos
└── utils/        utilidades
```

Las convenciones, el stack y las reglas de diseño del front están en [`AGENTS.md`](AGENTS.md).
