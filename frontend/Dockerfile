FROM node:20-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ─── Development Stage ─────────────────────────────────────────────────────────
FROM base AS development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3000

# Start Vite dev server (accessible from outside container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ─── Build Stage ───────────────────────────────────────────────────────────────
FROM base AS builder

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build for production
RUN npm run build

# ─── Production Stage ──────────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
