# Front servido como en producción, para probar front, API y base juntos con docker compose (perfil
# "completo"). Cumple el papel de Netlify: sirve el build, manda las mismas cabeceras de seguridad y
# reenvía /api a la API. En producción el front lo publica Netlify, no esta imagen.
# El contexto de build es la raíz del monorepo, por el pnpm-lock.yaml y el pnpm-workspace.yaml:
#   docker build -f front/Dockerfile .

FROM node:22-alpine AS build
RUN corepack enable
# Sin TTY pnpm pide confirmación para rehacer node_modules; CI=true la da por aceptada.
ENV CI=true
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY front/package.json front/
RUN pnpm install --frozen-lockfile --filter front
COPY front/ front/
# Vite incrusta las VITE_* al compilar: cambiarlas requiere volver a construir la imagen.
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_LOGIN_DESARROLLO="false"
ARG VITE_SITIO_URL=""
ARG VITE_INSTAGRAM_USUARIO=""
ARG VITE_WHATSAPP_NUMERO=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_LOGIN_DESARROLLO=$VITE_LOGIN_DESARROLLO \
    VITE_SITIO_URL=$VITE_SITIO_URL \
    VITE_INSTAGRAM_USUARIO=$VITE_INSTAGRAM_USUARIO \
    VITE_WHATSAPP_NUMERO=$VITE_WHATSAPP_NUMERO \
    VITE_USE_MOCKS=false
# El mismo comando que corre Netlify: chequea los tipos y compila.
RUN pnpm --filter front build

# nginx sin privilegios de root: escucha en el 8080 con el usuario nginx.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS servidor
COPY front/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/front/dist /usr/share/nginx/html
EXPOSE 8080
