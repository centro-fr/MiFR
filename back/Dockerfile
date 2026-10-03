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

# pnpm deploy arma en /prod un node_modules aislado solo con dependencias de producción, y el
# cliente de Prisma se vuelve a generar ahí.
FROM build AS dependencias-produccion
RUN pnpm --filter back deploy --prod --legacy /prod \
  && cd /prod \
  && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma

FROM node:22-alpine AS produccion
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencias-produccion --chown=node:node /prod/node_modules ./node_modules
COPY --from=dependencias-produccion --chown=node:node /prod/package.json ./package.json
COPY --from=dependencias-produccion --chown=node:node /prod/prisma ./prisma
COPY --from=build --chown=node:node /app/back/dist ./dist
USER node
EXPOSE 3000
# start-period da margen a las migraciones antes de contar los chequeos fallidos.
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" > /dev/null || exit 1
# Las migraciones corren al arrancar porque el plan gratuito de Render no permite un comando
# previo al deploy. Con una sola instancia no hay carrera; si falla una migración, la API no arranca.
# exec deja a node como PID 1 para que reciba el SIGTERM del orquestador.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/index.js"]
