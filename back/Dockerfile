# syntax=docker/dockerfile:1

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build

# Développement : le code est monté en volume, seules les dépendances viennent
# de l'image. L'entrypoint rejoue npm ci si le package-lock.json monté diffère.
FROM deps AS development
ENV NODE_ENV=development
COPY docker-entrypoint.dev.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

FROM node:22-slim AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# Runtime — node:22-slim (glibc) : requis par sharp/onnxruntime-node dès que
# l'inférence ONNX est rétablie sur cette branche.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --link --from=deps-prod /app/node_modules ./node_modules
COPY --link --from=build /app/dist ./dist
COPY --link migrations ./migrations
COPY --link scripts/apply-migrations.js ./scripts/apply-migrations.js
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/apply-migrations.js && node dist/main.js"]
