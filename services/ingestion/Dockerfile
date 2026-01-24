FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY turbo.json ./

# Copy packages
COPY packages/shared-types ./packages/shared-types

# Copy service
COPY services/ingestion ./services/ingestion

# Install dependencies
RUN npm install

# Build shared types first, then ingestion
RUN npm run build --workspace=@neuraltrade/shared-types
RUN npm run build --workspace=@neuraltrade/ingestion

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/services/ingestion/dist ./services/ingestion/dist
COPY --from=builder /app/services/ingestion/package.json ./services/ingestion/
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/ingestion

EXPOSE 3001

CMD ["node", "dist/index.js"]
