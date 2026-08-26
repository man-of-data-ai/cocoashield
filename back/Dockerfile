# Build
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

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

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY scripts/apply-migrations.js ./scripts/apply-migrations.js
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/apply-migrations.js && node dist/main.js"]
