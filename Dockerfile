# Multi-stage build para optimizar el tamaño de la imagen
FROM node:18-alpine3.19 AS base

# Instalar dependencias necesarias para Prisma y Alpine
RUN apk update && apk add --no-cache libc6-compat openssl bash

WORKDIR /app

# Instalar dependencias
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY app/package.json app/package-lock.json ./

# Instalar dependencias con npm (más compatible que yarn berry)
RUN set -ex && \
    echo "📦 Installing dependencies with npm..." && \
    npm ci --legacy-peer-deps 2>&1 | tee /tmp/npm-install.log && \
    echo "📦 Verifying installation..." && \
    if [ ! -d "node_modules" ]; then \
        echo "❌ ERROR: node_modules not created!" && \
        cat /tmp/npm-install.log && \
        exit 1; \
    fi && \
    if [ ! -d "node_modules/@prisma" ]; then \
        echo "⚠️ WARNING: @prisma not found in node_modules" && \
        ls -la node_modules/ | head -20; \
    fi && \
    echo "✅ Dependencies installed successfully"

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Accept build-time environment variables
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy app source - package.json needed for npm run build
COPY app/package.json app/package-lock.json ./
COPY app/next.config.js ./
COPY app/next-env.d.ts* ./
COPY app/tsconfig.json ./
COPY app/postcss.config.js ./
COPY app/tailwind.config.ts ./
COPY app/components.json ./
COPY app/.env* ./
COPY app/app ./app
COPY app/components ./components
COPY app/hooks ./hooks
COPY app/lib ./lib
COPY app/prisma ./prisma
COPY app/public ./public
COPY app/scripts ./scripts

# Set environment variables for build - FORCE NORMAL BUILD (no standalone)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
# CRITICAL: Use standard .next directory (not .build)
ENV NEXT_DIST_DIR=".next"
# NOTE: NEXT_OUTPUT_MODE is NOT set, which means normal build mode (no standalone, no export)

# Generate Prisma client first
RUN echo "📦 Generating Prisma client..." && \
    echo "📍 PWD: $(pwd)" && \
    echo "📂 Checking prisma/schema.prisma..." && \
    ls -la prisma/ && \
    echo "" && \
    echo "🔍 Schema preview (first 30 lines):" && \
    cat prisma/schema.prisma | head -30 && \
    echo "" && \
    echo "🧹 Cleaning old Prisma generated client (if exists)..." && \
    rm -rf node_modules/.prisma && \
    echo "✅ Old generated client removed" && \
    echo "" && \
    echo "🔨 Running prisma generate (fresh)..." && \
    ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma && \
    echo "" && \
    echo "📂 Verifying generated client..." && \
    if [ -d "node_modules/.prisma/client/" ]; then \
        ls -la node_modules/.prisma/client/ | head -10; \
        echo "✅ Prisma client directory exists"; \
    else \
        echo "❌ ERROR: Prisma client directory not found!"; \
        exit 1; \
    fi && \
    echo "" && \
    echo "🔍 Verifying enums in generated client..." && \
    if [ -f "node_modules/.prisma/client/index.d.ts" ]; then \
        echo "📄 Checking for UserRole enum..." && \
        grep "export.*UserRole" node_modules/.prisma/client/index.d.ts | head -1 || echo "⚠️  UserRole not found"; \
        echo "📄 Checking for StatusCuenta enum..." && \
        grep "export.*StatusCuenta" node_modules/.prisma/client/index.d.ts | head -1 || echo "⚠️  StatusCuenta not found"; \
    fi && \
    echo "✅ Prisma client generated successfully!"

# Build Next.js (with verbose error logging)
RUN echo "🔨 Building Next.js application (NORMAL mode, no standalone)..." && \
    echo "📍 PWD: $(pwd)" && \
    echo "📍 NEXT_DIST_DIR: $NEXT_DIST_DIR" && \
    echo "📦 Verifying package.json exists..." && \
    ls -la package.json && \
    echo "✅ Prisma client already generated (from previous step)" && \
    npm run build 2>&1 || (echo "❌ Build failed! Checking for TypeScript errors..." && npx tsc --noEmit && exit 1) && \
    echo "✅ Build completed successfully!"

# Verify build output
RUN echo "🔍 Verifying build output..." && \
    if [ -f ".next/BUILD_ID" ]; then \
        echo "✅ Build ID found: $(cat .next/BUILD_ID)"; \
    else \
        echo "❌ BUILD_ID not found!"; \
        echo "Contents of .next directory:"; \
        ls -la .next/ || echo "No .next directory!"; \
        exit 1; \
    fi

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Prisma configuration - avoid permission errors
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
ENV PRISMA_ENGINES_MIRROR=https://binaries.prismacdn.com

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create home directory for nextjs user to avoid permission errors
RUN mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs

# Copy package files and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application - CRITICAL: Complete .next directory
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy public files and Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy scripts directory for seed-admin
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy shell scripts
COPY --chown=nextjs:nodejs seed-admin.sh backup-manual.sh restore-backup.sh start.sh ./
RUN chmod +x seed-admin.sh backup-manual.sh restore-backup.sh start.sh

# Create backup directory
RUN mkdir -p /backup && chown nextjs:nodejs /backup

# Verify all necessary files are present
RUN echo "🔍 Verifying production files..." && \
    ls -la /app/.next/ && \
    if [ -f "/app/.next/BUILD_ID" ]; then \
        echo "✅ Production build verified: $(cat /app/.next/BUILD_ID)"; \
    else \
        echo "❌ BUILD_ID missing in production image!"; \
        exit 1; \
    fi

USER nextjs

EXPOSE 3000

# Use custom start script
CMD ["sh", "start.sh"]
