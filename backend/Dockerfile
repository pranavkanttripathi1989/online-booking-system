FROM node:20-alpine AS base
# Prisma's query engine needs OpenSSL — without it, Alpine's musl libc can't
# be detected correctly and Prisma silently guesses a version, which has been
# known to cause runtime PrismaClientInitializationError on some Alpine builds.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "dist/main.js"]
