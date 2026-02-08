# Build (Debian-based for native modules like better-sqlite3)
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Run
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
# Optional: if you have other runtime files, copy them too:
# COPY --from=builder /app/app ./app

EXPOSE 3000
CMD ["npm","start"]