FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BACKEND_URL=http://back:3000
ENV BACKEND_URL=${BACKEND_URL}
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start"]
