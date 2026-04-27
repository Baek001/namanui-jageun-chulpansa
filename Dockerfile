FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY bin ./bin
COPY config ./config

RUN npm run build:web

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV BOOKFORGE_BOOKS_ROOT=/data/books
ENV BOOKFORGE_CONFIG_ROOT=/app/config
ENV BOOKFORGE_MODEL_PROVIDER=mock
ENV BOOKFORGE_MOCK_MODEL=deterministic-mock

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/bin ./bin
COPY --from=build /app/config ./config

RUN mkdir -p /data/books

VOLUME ["/data/books"]
EXPOSE 3000

CMD ["node", "apps/web/server.mjs"]
