# syntax = docker/dockerfile:1

# Use specific Node.js version for consistency
ARG NODE_VERSION=20.11.0
FROM node:${NODE_VERSION}-alpine AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apk add --no-cache build-base python3

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci --include=dev

# Copy application code
COPY . .

# Prune dev dependencies after build
RUN npm prune --production

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD [ "npm", "run", "start" ]