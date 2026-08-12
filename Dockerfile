# syntax=docker/dockerfile:1

# Debian-based rather than Alpine: better-sqlite3 ships prebuilt binaries for
# glibc, so no compiler toolchain is needed at install time.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Written at runtime, so it must live on the mounted volume, not in the image.
ENV DATABASE_FILE=/data/app.db

RUN useradd --system --uid 1001 --create-home nextjs \
  && mkdir -p /data && chown nextjs:nextjs /data

# `output: "standalone"` traces the runtime dependency graph; static assets and
# the public folder are not part of that trace and are copied separately.
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server.js"]
