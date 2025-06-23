# syntax=docker/dockerfile:1.4

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build without hardcoded endpoints - will be set at runtime
RUN --mount=type=cache,target=/root/.npm npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install additional tools
RUN apk add --no-cache curl jq

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy built app
# Create public directory and copy contents if they exist
RUN mkdir -p ./public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create a startup script that handles ECS secrets and environment variables
COPY <<EOF /app/start.sh
#!/bin/sh
set -e

echo "Starting React/Next.js application..."
echo "NODE_ENV: \$NODE_ENV"
echo "PORT: \$PORT"

# Export secret names for server-side usage
if [ -n "\$API_KEY_SECRET_NAME" ]; then
  export API_KEY_SECRET_NAME="\$API_KEY_SECRET_NAME"
  echo "API_KEY_SECRET_NAME set to: \$API_KEY_SECRET_NAME"
fi

if [ -n "\$CONFIG_SECRET_NAME" ]; then
  export CONFIG_SECRET_NAME="\$CONFIG_SECRET_NAME"
  echo "CONFIG_SECRET_NAME set to: \$CONFIG_SECRET_NAME"
fi

# Parse CONFIG secret if available (JSON format from ECS secrets)
if [ -n "\$CONFIG" ]; then
  echo "Processing CONFIG secret..."

  # Extract values from JSON using jq
  API_ENDPOINT=\$(echo "\$CONFIG" | jq -r '.API_ENDPOINT // empty')
  S3_BUCKET_NAME=\$(echo "\$CONFIG" | jq -r '.S3_BUCKET_NAME // empty')
  DYNAMODB_TABLE=\$(echo "\$CONFIG" | jq -r '.DYNAMODB_TABLE // empty')
  REGION=\$(echo "\$CONFIG" | jq -r '.REGION // empty')

  # Export as Next.js public environment variables
  if [ -n "\$API_ENDPOINT" ]; then
    export NEXT_PUBLIC_API_BASE_URL="\$API_ENDPOINT"
    export NEXT_PUBLIC_API_ENDPOINT="\$API_ENDPOINT"
    echo "API_ENDPOINT set to: \$API_ENDPOINT"
  fi

  if [ -n "\$S3_BUCKET_NAME" ]; then
    export NEXT_PUBLIC_S3_BUCKET_NAME="\$S3_BUCKET_NAME"
    echo "S3_BUCKET_NAME set to: \$S3_BUCKET_NAME"
  fi

  if [ -n "\$DYNAMODB_TABLE" ]; then
    export NEXT_PUBLIC_DYNAMODB_TABLE="\$DYNAMODB_TABLE"
    echo "DYNAMODB_TABLE set to: \$DYNAMODB_TABLE"
  fi

  if [ -n "\$REGION" ]; then
    export NEXT_PUBLIC_AWS_REGION="\$REGION"
    export NEXT_PUBLIC_REGION="\$REGION"
    echo "AWS_REGION set to: \$REGION"
  fi
fi

# Handle API_KEY secret (JSON format from ECS secrets)
if [ -n "\$API_KEY" ]; then
  echo "Processing API_KEY secret..."
  # Extract api_key value from JSON using jq
  API_KEY_VALUE=\$(echo "\$API_KEY" | jq -r '.api_key // empty')
  if [ -n "\$API_KEY_VALUE" ]; then
    export NEXT_PUBLIC_API_KEY="\$API_KEY_VALUE"
    echo "API_KEY configured"
  fi
fi

# Log final configuration
echo "Final environment configuration:"
echo "NEXT_PUBLIC_API_BASE_URL: \$NEXT_PUBLIC_API_BASE_URL"
echo "NEXT_PUBLIC_AWS_REGION: \$NEXT_PUBLIC_AWS_REGION"
echo "Environment ready for React app"

# Start the server
exec node server.js
EOF

# Make script executable and set ownership
RUN chmod +x /app/start.sh && chown nextjs:nodejs /app/start.sh

# Switch to non-root user
USER nextjs

# Configure network - Use port 3000 for non-root user
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f ${NEXT_PUBLIC_API_ENDPOINT}/health || exit 1

# Start the application with our wrapper script
CMD ["/app/start.sh"]
