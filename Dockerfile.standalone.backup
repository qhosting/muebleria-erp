
# Multi-stage build para optimizar el tamaño de la imagen
FROM node:18-alpine AS base

# Instalar dependencias necesarias para Prisma y Alpine
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Configurar yarn para usar cache
ENV YARN_CACHE_FOLDER=/app/.yarn-cache

# Instalar dependencias
FROM base AS deps
COPY app/package.json app/yarn.lock* ./
RUN --mount=type=cache,target=/app/.yarn-cache \
    yarn install --production=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

# Generate Prisma client with complete runtime
RUN npx prisma generate --generator client

# Build the application with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV BUILD_TIMESTAMP=20251009_030000_STANDALONE_HARDCODED

# Build Next.js with standalone output (configured in next.config.js)
RUN echo "🏗️ Building Next.js with standalone output..." && \
    echo "📋 Verifying next.config.js has standalone output:" && \
    grep "output:" next.config.js && \
    echo "" && \
    echo "🔨 Running build..." && \
    yarn build && \
    echo "" && \
    echo "✅ Build completed!" && \
    echo "" && \
    echo "📁 Checking .next structure:" && \
    ls -la .next/ && \
    echo "" && \
    echo "📁 Checking .next/standalone directory:" && \
    if [ -d ".next/standalone" ]; then \
        echo "✅ Standalone directory found!"; \
        ls -la .next/standalone/ | head -20; \
        echo ""; \
        echo "📄 Checking for server.js:"; \
        find .next/standalone -name "server.js" -type f; \
    else \
        echo "❌ ERROR: Standalone directory NOT found!"; \
        echo "This means Next.js did not generate standalone output."; \
        exit 1; \
    fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# Copy standalone output - flexible approach for different structures
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Move nested app directory to root if it exists (due to outputFileTracingRoot)
RUN if [ -f "app/server.js" ]; then \
      echo "📦 Found nested app structure, moving to root..."; \
      cp -r app/* . && rm -rf app; \
    elif [ -f "server.js" ]; then \
      echo "✅ server.js already in root"; \
    else \
      echo "❌ ERROR: server.js not found!"; \
      echo "📋 Current directory contents:"; \
      ls -laR; \
      exit 1; \
    fi

# Copy Prisma files with CORRECT PERMISSIONS - COMPLETE RUNTIME + CLI
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Copy start scripts with CORRECT PERMISSIONS
COPY --chown=nextjs:nodejs start.sh ./
COPY --chown=nextjs:nodejs emergency-start.sh ./
RUN chmod +x start.sh emergency-start.sh

# Create writable directory for Prisma with correct permissions
RUN mkdir -p node_modules/.prisma && chown -R nextjs:nodejs node_modules/.prisma
RUN mkdir -p node_modules/@prisma && chown -R nextjs:nodejs node_modules/@prisma
RUN mkdir -p node_modules/.bin && chown -R nextjs:nodejs node_modules/.bin

# Verify Prisma client installation - CRITICAL CHECKS
RUN ls -la node_modules/@prisma/ || echo "⚠️  @prisma directory missing"
RUN ls -la node_modules/.prisma/ || echo "⚠️  .prisma directory missing"
RUN ls -la node_modules/prisma/ || echo "⚠️  prisma directory missing"

# Verify Prisma CLI is available in node_modules/.bin - MUST EXIST
RUN ls -la node_modules/.bin/ || echo "⚠️  .bin directory missing"
RUN ls -la node_modules/.bin/prisma && echo "✅ Prisma CLI found in .bin" || echo "❌ CRITICAL: prisma CLI not found in .bin"

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start with our custom script
CMD ["./start.sh"]
