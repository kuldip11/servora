# ─── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install all deps
RUN bun install --frozen-lockfile

# Build the API
WORKDIR /app/apps/api
RUN bun run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and the already-resolved node_modules from the builder
# stage. We deliberately do NOT re-run `bun install` here: apps/api's
# package.json depends on workspace packages (@pos/types, @pos/contracts)
# that only resolve inside the full monorepo layout (root package.json +
# packages/*) present in the builder stage. Re-installing from a flattened
# single package.json in this stage would fail to resolve those.
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "dist/index.js"]
