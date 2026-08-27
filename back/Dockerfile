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

# Runtime — node:22-slim (glibc) requis par onnxruntime-node
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Modèle de classification : asset de la release GitHub `model-<version>`
# (publiée par .github/workflows/model-release.yml sur push d'un tag model-*),
# empreinte sha256 vérifiée au build. Rollback = rebuild avec les ARG précédents.
ARG MODEL_VERSION=v3
ARG MODEL_SHA256=f0e1533fac81ef762dbfc981d5a7bb26b6584a68e00e40570e104f169e860496
ADD https://github.com/man-of-data-ai/cocoashield/releases/download/model-${MODEL_VERSION}/cocoashield_${MODEL_VERSION}.onnx /app/models/
RUN echo "${MODEL_SHA256}  /app/models/cocoashield_${MODEL_VERSION}.onnx" | sha256sum -c - \
  && chmod 644 /app/models/cocoashield_${MODEL_VERSION}.onnx
ENV MODEL_PATH=/app/models/cocoashield_${MODEL_VERSION}.onnx \
    MODEL_VERSION=${MODEL_VERSION}

COPY --link --from=deps-prod /app/node_modules ./node_modules
COPY --link --from=build /app/dist ./dist
COPY --link migrations ./migrations
COPY --link scripts/apply-migrations.js ./scripts/apply-migrations.js
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/apply-migrations.js && node dist/main.js"]
