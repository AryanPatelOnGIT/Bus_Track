FROM node:24-alpine AS builder

WORKDIR /app

# Copy only the backend's package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the backend files
COPY . .

# Build the TypeScript code (assumes tsc is in package.json build script)
RUN npm run build

# Remove development dependencies for production
RUN npm prune --production


FROM node:24-alpine

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set the environment and port
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the app
CMD ["node", "dist/server.js"]
