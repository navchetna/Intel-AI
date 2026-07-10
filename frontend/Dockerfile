# syntax=docker/dockerfile:1

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Single configurable URL prefix baked into the build. Set to "" for the root
# path (local dev), or e.g. "/intel-ai" when served under a reverse proxy that
# forwards the prefix WITHOUT stripping it.
ARG NEXT_PUBLIC_BASE_PATH="/intel-ai"
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:8040"
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
