# syntax=docker/dockerfile:1
# Production image for EquityLens (Next.js standalone server).
# Build:  docker build -t equitylens .
# Run:    docker compose up   (see docker-compose.yml; runs migrations first)

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Install scripts are needed for prisma generate and sharp's native binary.
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders only: no page is statically rendered with database data.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build \
    NEXTAUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    npm run build

# One-shot migration runner (used by docker-compose's `migrate` service).
FROM builder AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
