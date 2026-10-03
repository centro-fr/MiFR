# El contexto de build es la raíz del monorepo: el pnpm-lock.yaml y el pnpm-workspace.yaml viven ahí.
# docker build -f back/Dockerfile .

FROM node:22-alpine AS base
# Prisma necesita OpenSSL para su motor de consultas en Alpine.
RUN apk add --no-cache openssl && corepack enable
# Sin TTY pnpm pide confirmación para rehacer node_modules; CI=true la da por aceptada.
ENV CI=true
WORKDIR /app

FROM base AS dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY back/package.json back/
RUN pnpm install --frozen-lockfile --filter back

FROM dependencias AS build
COPY back/ back/
RUN pnpm --filter back prisma:generate && pnpm --filter back build

# Corre las migraciones pendientes y termina. Usa la imagen de build porque necesita el CLI de
# Prisma, que es dependencia de desarrollo y no está en la imagen final.
FROM build AS migraciones
WORKDIR /app/back
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# pnpm deploy arma en /prod un node_modules aislado solo con dependencias de producción. El cliente
# de Prisma se vuelve a generar ahí con el CLI de la etapa de build, que no viaja a la imagen final.
FROM build AS dependencias-produccion
RUN pnpm --filter back deploy --prod --legacy /prod   && cd /prod && /app/back/node_modules/.bin/prisma generate --schema prisma/schema.prisma

FROM node:22-alpine AS produccion
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencias-produccion --chown=node:node /prod/node_modules ./node_modules
COPY --from=dependencias-produccion --chown=node:node /prod/package.json ./package.json
COPY --from=build --chown=node:node /app/back/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5   CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" > /dev/null || exit 1
CMD ["node", "dist/index.js"]
