FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT env — backend already reads from env.port
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
EXPOSE 8080
CMD ["node", "src/server.js"]
