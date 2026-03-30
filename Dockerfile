FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Render uses PORT env var (default 10000), Cloud Run uses 8080
# Backend reads PORT from env — no hardcoding needed
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
EXPOSE 10000
CMD ["node", "src/server.js"]
