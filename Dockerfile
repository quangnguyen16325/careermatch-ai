# Shared development/demo image. Keep Prisma CLI for the one-shot migration job.
FROM node:24-bookworm-slim AS node-build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@11.25.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY apps/web apps/web
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
# Generation reads configuration but never connects to this placeholder database.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm db:generate \
    && pnpm build

FROM node-build AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
RUN mkdir -p /app/.data/cvs && chown -R node:node /app/.data
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:stable-alpine AS web
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=node-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
