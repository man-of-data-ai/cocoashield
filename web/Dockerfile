# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
# Les rewrites /v1/* sont figés au build ; `back` est le nom du service API
# dans le compose de production.
ARG BACKEND_URL=http://back:3000
ENV BACKEND_URL=$BACKEND_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Développement : même principe que le back, port 3002.
FROM deps AS development
ENV NODE_ENV=development PORT=3002 NEXT_TELEMETRY_DISABLED=1
COPY docker-entrypoint.dev.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --link --from=build /app/.next/standalone ./
COPY --link --from=build /app/.next/static ./.next/static
COPY --link --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
